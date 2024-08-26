import { Server } from 'socket.io';
import AsyncLock from 'async-lock';

const rooms = {};

const AUTHORIZED_SESSION_IDS = ['3624891095', '116463162791834863252'];
const lock = new AsyncLock();

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path : "/api/socket/io",
      addTrailingSlash: false,
    });
    
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('server : A user connected');

      socket.on('get-room-list', () => {
        console.log("get rooms", rooms);
        socket.emit('room-updated', rooms);
      });

      socket.on('create-room', ({ roomName, userName, gameType, sessionId, maxPlayers }, callback) => {
        if (!AUTHORIZED_SESSION_IDS.includes(sessionId)) {
          return callback({ success: false, message: '방을 만들기 위해서는 오태석에게 문의하세요' });
        }

        lock.acquire('rooms', (done) => {
          if (rooms[roomName]) {
            return callback({ success: false, message: '방 제목은 중복될 수 없습니다.' });
          }
          
          rooms[roomName] = {
            roomName,
            gameType,
            host: {
              id : sessionId,
              name : userName,
            },
            players: [],
            gameData: {},
            status: '대기중',
            maxPlayers,
          };
          socket.join(roomName);
          callback({ success: true });
          io.emit('room-updated', rooms);
          done();
        }, (err) => {
          if (err) {
            console.error('Lock acquisition failed', err);
          }
        });
      });

      socket.on('join-room', ({ roomName, userName, sessionId }, callback) => {
        const room = rooms[roomName];
        if (!room) {
          return callback({ success: false, message: '방이 존재하지 않습니다' });
        }
        if (room.players.length >= room.maxPlayers) {
          return callback({ success: false, message: '방이 가득찼습니다' });
        }
        if (room.status === '게임중') {
          return callback({ success: false, message: '이미 게임이 시작되었습니다' });
        }

        const playerExists = room.players.some(player => player.id === sessionId);
        // 튕겼다가 온 사람은 재연결 해줌
        if (playerExists) {
          socket.join(roomName);
          return callback({ success: true });
        }

        room.players.push({ id: sessionId, name: userName });
        socket.join(roomName);
        io.emit('room-updated', rooms);
        return callback({ success: true });
      });

      socket.on('leave-room', ({ roomName, userName }) => {
        const room = rooms[roomName];
        if (!room) return;

        const playerIndex = room.players.findIndex(player => player.id === sessionId);
        if (playerIndex == -1) {
          return callback({ success: false, message: '이미 벗어난 게임방입니다.' });
        }
        if (room.status === '게임중') {
          return callback({ success: false, message: '게임이 진행 중입니다. 게임이 끝나기 전까지 방을 나갈 수 없습니다.' });
        }

        room.players.splice(playerIndex, 1);
        socket.leave(roomName);
        io.emit('room-updated', rooms);

        if (room.host.id === sessionId) {
          delete rooms[roomName];
          io.emit('room-updated', rooms);
        }
        return callback({ success: true });
      });

      socket.on('disconnect', () => {
        console.log('server : A user disconnected');
        // TODO: 방에서 유저 제거 로직 추가 필요
      });
    });
  }
  res.end();
};

export default ioHandler;

