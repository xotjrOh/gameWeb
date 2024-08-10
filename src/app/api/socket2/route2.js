import { Server } from 'socket.io';
import AsyncLock from 'async-lock';
// import handleMafiaGame from './games/mafia';
// import handleRockPaperScissorsGame from './games/rockPaperScissors';
// import handleHorseRacingGame from './games/horseRacing';

const rooms = {};
export { rooms };

const AUTHORIZED_SESSION_IDS = ['3624891095', '116463162791834863252'];
const lock = new AsyncLock();

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('A user connected');

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
              status: '대기 중',
              maxPlayers,
            };
            socket.join(roomName);
            callback({ success: true });
            io.emit('room-updated', Object.values(rooms));
          }
          done();
        }, (err) => {
          if (err) {
            console.error('Lock acquisition failed', err);
          }
        });
      });

      socket.on('join-room', ({ roomName, userName }) => {
        const room = rooms[roomName];
        if (room && room.players.length < room.maxPlayers) {
          room.players.push(userName);
          socket.join(roomName);
          io.to(roomName).emit('room-updated', room);
        }
      });

      socket.on('leave-room', ({ roomName, userName }) => {
        const room = rooms[roomName];
        if (room) {
          room.players = room.players.filter(player => player !== userName);
          socket.leave(roomName);
          io.to(roomName).emit('room-updated', room);

          if (room.host === userName || room.players.length === 0) {
            delete rooms[roomName];
            io.emit('room-updated', Object.values(rooms));
          }
        }
      });

      // 게임별 로직 처리
      socket.on('game-action', (data) => {
        const room = rooms[data.roomName];
        if (!room) return;

        switch (room.gameType) {
          case 'mafia':
            handleMafiaGame(io, socket, data, room);
            break;
          case 'rock-paper-scissors':
            handleRockPaperScissorsGame(io, socket, data, room);
            break;
          case 'horse-racing':
            handleHorseRacingGame(io, socket, data, room);
            break;
          default:
            console.error('Unknown game type:', room.gameType);
        }
      });

      socket.on('disconnect', () => {
        console.log('A user disconnected');
        // TODO: 방에서 유저 제거 로직 추가 필요
      });
    });
  }
  res.end();
};

export { ioHandler as GET, ioHandler as POST };
