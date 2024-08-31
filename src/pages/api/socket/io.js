import { Server } from 'socket.io';
import AsyncLock from 'async-lock';

const rooms = {};
// roomId별 setInteval 저장할 객체
const timers = {};
let currentRoomId = 100;

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

      socket.on('check-room', ({ roomId, sessionId }, callback) => {
        const room = rooms[roomId];
        const isInRoom = room && room.players.some(player => player.id === sessionId);
        callback({ isInRoom });
      });

      socket.on('create-room', ({ roomName, userName, gameType, sessionId, maxPlayers }, callback) => {
        console.log("create room 방문 server")
        if (!AUTHORIZED_SESSION_IDS.includes(sessionId)) {
          return callback({ success: false, message: '방을 만들기 위해서는 오태석에게 문의하세요' });
        }

        lock.acquire('rooms', (done) => {
          const roomId = ++currentRoomId;
          rooms[roomId] = {
            roomId,
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
          socket.join(roomId);
          callback({ success: true, roomId });
          io.emit('room-updated', rooms);
          done();
        }, (err) => {
          if (err) {
            console.error('Lock acquisition failed', err);
          }
        });
      });

      socket.on('join-room', ({ roomId, userName, sessionId }, callback) => {
        const room = rooms[roomId];
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
          socket.join(roomId);
          return callback({ success: true });
        }

        room.players.push({ id: sessionId, name: userName });
        socket.join(roomId);
        io.emit('room-updated', rooms);
        return callback({ success: true });
      });

      socket.on('leave-room', ({ roomId, sessionId }) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }

        const playerIndex = room.players.findIndex(player => player.id === sessionId);
        if (playerIndex == -1) {
          return callback({ success: false, message: '이미 벗어난 게임방입니다.' });
        }
        if (room.status === '게임중') {
          return callback({ success: false, message: '게임이 진행 중입니다. 게임이 끝나기 전까지 방을 나갈 수 없습니다.' });
        }

        room.players.splice(playerIndex, 1);
        socket.leave(roomId);
        io.emit('room-updated', rooms);

        if (room.host.id === sessionId) {
          delete rooms[roomId];
          io.emit('room-updated', rooms);
        }
        return callback({ success: true });
      });

      socket.on('disconnect', () => {
        console.log('server : A user disconnected');
      });

      // -------------------- HORSE GAME --------------------------
      // todo : 다른게임에서 로직이 다를 경우 게임타입 나누는 로직 필요
      // host만 호출할 이벤트
      socket.on('start-round', ({ roomId, duration }) => {
        console.log("asdf");
        const room = rooms[roomId];

        room.gameData.timeLeft = duration;
        clearInterval(timers[roomId]);
  
        timers[roomId] = setInterval(() => {
          console.log(roomId, room.gameData.timeLeft);
          if (room.gameData.timeLeft > 0) {
            room.gameData.timeLeft -= 1;
            io.to(roomId).emit('update-timer', room.gameData.timeLeft); // 타이머 업데이트 전송
          } else {
            clearInterval(timers[roomId]);
            delete timers[roomId]; // 타이머 종료 시 삭제
            io.to(roomId).emit('round-ended'); // 라운드 종료 알림
          }
        }, 1000);
      });

      // todo : 필요없을지도. 추후에 지워보고 테스트.
      // socket.on('get-current-timer', (roomId, callback) => {
      //   const room = rooms[roomId];
      //   if (!room) {
      //     return callback({ success: false, message: '존재하지 않는 게임방에서 요청되었습니다.' });
      //   }
      //   callback({ success: true, timeLeft: room.gameData.timeLeft }); // 현재 남은 시간 전송
      // });

    });
  }
  res.end();
};

export default ioHandler;