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
          callback({ success: false, message: '방을 만들기 위해서는 오태석에게 문의하세요' });
          return;
        }

        lock.acquire('rooms', (done) => {
          if (rooms[roomName]) {
            callback({ success: false, message: '방 제목은 중복될 수 없습니다.' });
          } else {
            rooms[roomName] = {
              roomName,
              gameType,
              host: userName,
              players: [userName],
              gameData: {},
              status: 'pending',
              maxPlayers,
            };
            socket.join(roomName);
            callback({ success: true });
            io.emit('room-updated', rooms);
          }
          done();
        }, (err) => {
          if (err) {
            console.error('Lock acquisition failed', err);
          }
        });
      });

      socket.on('join-room', ({ roomName, userName }, callback) => {
        const room = rooms[roomName];
        if (room && room.players.length < room.maxPlayers && room.status == 'pending') {
          room.players.push(userName);
          socket.join(roomName);
          io.emit('room-updated', rooms);
          callback({ success: true });
        } else if (room.players.length == room.maxPlayers) {
          callback({ success: false, message: '방이 가득찼습니다' });
        } else if (room.status == 'in progress') {
          callback({ success: false, message: '이미 게임이 시작되었습니다' });
        }
      });

      socket.on('leave-room', ({ roomName, userName }) => {
        const room = rooms[roomName];
        if (room) {
          const index = room.players.indexOf(userName);
          if (index !== -1) {
            room.players.splice(index, 1);
          }
          socket.leave(roomName);
          io.to(roomName).emit('room-updated', room);

          if (index == 0 || room.players.length === 0) { // 방장일경우 방폭
            delete rooms[roomName];
            io.emit('room-updated', rooms);
          }
        }
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

