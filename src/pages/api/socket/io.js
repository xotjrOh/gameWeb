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

      socket.on('update-socket-id', ({ roomId, sessionId, newSocketId }) => {
        // roomId와 sessionId를 기반으로 해당 플레이어를 찾아서 socketId를 업데이트
        console.log(roomId, sessionId, newSocketId);
        if (rooms[roomId]) {
          const player = rooms[roomId].players.find(p => p.id === sessionId);
          if (player) {
            player.socketId = newSocketId;
            socket.join(roomId.toString());
            console.log(`Updated player socketId for player ${sessionId} in room ${roomId}`);
          }

          if (rooms[roomId].host.id == sessionId) {
            socket.join(roomId.toString());
            console.log(`Updated host socketId for player ${sessionId} in room ${roomId}`);
          }
          console.log(socket.rooms);
        }
      });

      socket.on('get-room-list', () => {
        console.log("get rooms", rooms);
        socket.emit('room-updated', rooms);
      });

      socket.on('check-room', ({ roomId, sessionId }, callback) => {
        const room = rooms[roomId];
        const isInRoom = room && room.players.some(player => player.id === sessionId);
        callback({ isInRoom });
      });
      socket.on('check-room-host', ({ roomId, sessionId }, callback) => {
        const room = rooms[roomId];
        const isInRoom = room && room.host.id === sessionId;
        callback({ isInRoom });
      });

      socket.on('create-room', ({ roomName, userName, gameType, sessionId, maxPlayers }, callback) => {
        console.log("create room 방문 server")
        if (!AUTHORIZED_SESSION_IDS.includes(sessionId)) {
          return callback({ success: false, message: '방을 만들기 위해서는 오태석에게 문의하세요.' });
        }
        if (!roomName) {
          return callback({ success: false, message: '방이름을 정해주세요.', field:"roomName" });
        }
        if (!gameType) {
          return callback({ success: false, message: '게임종류를 정해주세요.', field:"gameType" });
        }
        if (!Number.isInteger(maxPlayers) || maxPlayers < 1) {
          return callback({ success: false, message: '최대 플레이어 수는 1 이상의 정수여야 합니다.', field:"maxPlayers" });
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
            gameData: {
              // horse 용 설정
              // finishLine: 9,
              // positions: {},
            },
            status: '대기중',
            maxPlayers,
          };
          if (gameType == "horse") {
            rooms[roomId].gameData.finishLine = 9;
          }
          socket.join(roomId.toString());
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
          return callback({ success: false, host: false, message: '방이 존재하지 않습니다' });
        }
        if (room.players.length >= room.maxPlayers) {
          return callback({ success: false, host: false, message: '방이 가득찼습니다' });
        }
        if (room.status === '게임중') {
          return callback({ success: false, host: false, message: '이미 게임이 시작되었습니다' });
        }
        if (room.host.id === sessionId) {
          return callback({ success: false, host: true });
        }

        const playerExists = room.players.some(player => player.id === sessionId);
        // 튕겼다가 온 사람은 재연결 해줌
        if (playerExists) {
          socket.join(roomId.toString());
          return callback({ success: true });
        }

        room.players.push({ id: sessionId, name: userName, socketId: socket.id, rounds: [] });
        socket.join(roomId.toString());
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
      socket.on('horse-start-round', ({ roomId, duration }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }

        room.gameData.timeLeft = duration;
        room.gameData.rounds = room.gameData.rounds || [];
        room.gameData.bets = {}; // 라운드마다 베팅 초기화
        room.gameData.positions = room.gameData.positions || {}; // 말들의 위치 초기화 (또는 유지)
        clearInterval(timers[roomId]);
  
        timers[roomId] = setInterval(() => {
          if (room.gameData.timeLeft > 0) {
            room.gameData.timeLeft -= 1;
            io.to(roomId).emit('update-timer', room.gameData.timeLeft); // 타이머 업데이트 전송
          } else {
            clearInterval(timers[roomId]);
            delete timers[roomId]; // 타이머 종료 시 삭제

            // 베팅 결과 집계 및 전진 로직 (최다 득표 말이 여러 개일 때 처리)
            const sortedHorses = Object.entries(room.gameData.bets)
              .sort(([, chipsA], [, chipsB]) => chipsB - chipsA);

            const maxChips = sortedHorses[0][1];
            const secondMaxChips = sortedHorses.find(([, chips]) => chips < maxChips)?.[1] || 0;

            const roundResult = sortedHorses.map(([horse, chips]) => ({
              horse,
              chips,
              progress: chips === maxChips ? 2 : chips === secondMaxChips ? 1 : 0,
            }));

            // 말들의 현재 위치 업데이트
            roundResult.forEach(({ horse, progress }) => {
              room.gameData.positions[horse] = (room.gameData.positions[horse] || 0) + progress;
            });

            room.gameData.rounds.push(roundResult || []);
            // positions 가공후 전달
            const positions = room.gameData.positions || [];
            const horsesData = Object.entries(positions).map(([name, position]) => ({
              name,
              position
            }));
            io.to(roomId).emit('update-positions', { horsesData, rounds : room.gameData.rounds });

            // **게임 종료 체크**
            const horsesPositions = Object.entries(room.gameData.positions);

            // 골인점을 넘은 말들을 찾음 (losers)
            const losers = horsesPositions.filter(([horse, position]) => position >= room.gameData.finishLine);

            // 만약 골인점을 넘은 말이 있다면 게임 종료
            if (losers.length > 0) {
              // 골인점에 도달하지 않은 말 중 가장 가까운 말들을 찾음 (winners)
              const remainingHorses = horsesPositions.filter(([horse, position]) => position < room.gameData.finishLine);
              const maxPosition = Math.max(...remainingHorses.map(([, position]) => position));
              
              const winners = remainingHorses.filter(([, position]) => position === maxPosition);

              io.to(roomId).emit('game-ended', {
                winners: winners.map(([horse]) => horse),  // 우승자 말 목록
                losers: losers.map(([horse]) => horse)    // 골인점에 도달한 말 목록
              });

              // 추가 로직이 필요하다면 여기서 처리
            } else {
              io.to(roomId).emit('round-ended', room.players); // 라운드 종료 알림
            }
          }
        }, 1000);

        return callback({ success: true });
      });

      // **추가된 역할 할당 이벤트**
      socket.on('horse-assign-roles', ({ roomId }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }

        // 플레이어와 경주마 할당 로직
        const players = room.players;
        const numPlayers = players.length;
        const horses = [];

        const numHorses = Math.ceil(numPlayers / 2);
        for (let i = 0; i < numHorses; i++) {
          horses.push(String.fromCharCode(65 + i)); // 'A', 'B', 'C', ...
        }
        const randomHorses = [...horses];

        // 플레이어를 랜덤하게 섞음
        players.sort(() => Math.random() - 0.5);
        randomHorses.sort(() => Math.random() - 0.5);

        // 역할 할당
        players.forEach((player, index) => {
          player.dummyName = `player${index + 1}`;
          player.horse = randomHorses[index % numHorses];
          player.chips = 20;
          player.isSolo = numPlayers % 2 !== 0 && index === Math.floor(numPlayers / 2);
        });

        // 말 목록을 gameData에 저장
        room.gameData.horses = horses;
        
        // 플레이어 상태 업데이트 전송
        players.forEach((player) => {
          const data = {
            id: player.id,
            name: player.name,
            socketId: player.socketId, //여기까지는 호스트용
            dummyName: player.dummyName,
            horse: player.horse,
            chips: player.chips,
            isSolo: player.isSolo,
            rounds: player.rounds,
          };
          io.to(player.socketId).emit('status-update', data);
        });

        io.to(roomId).emit('roles-assigned', { success: true, horses, players });
        return callback({ success: true });
      });
      
      // 베팅 로직 추가
      // bets 는 { A : 3, B : 4 } 같은 객체
      socket.on('horse-bet', ({ roomId, bets }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }

        // todo : session 비교로 바꾸고 인자로 받을것. socket은 변수가 많음
        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) {
          return callback({ success: false, message: '본인이 참여하고 있지 않은 게임방입니다.' });
        }

        // 플레이어가 가진 칩이 충분한지 체크
        const totalBets = Object.values(bets).reduce((sum, chips) => sum + chips, 0);
        if (player.chips < totalBets) {
          return callback({ success: false, message: '칩이 부족합니다.' });
        }

        // 베팅한 칩 기록
        room.gameData.bets = room.gameData.bets || {};
        Object.entries(bets).forEach(([horse, chips]) => {
          room.gameData.bets[horse] = (room.gameData.bets[horse] || 0) + chips;
        });

        player.chips -= totalBets;

        // 개인용 칩사용 히스토리
        const sortedHorses = Object.entries(bets)
          .sort(([, chipsA], [, chipsB]) => chipsB - chipsA);
        const roundResult = sortedHorses.map(([horse, chips]) => ({
          horse,
          chips,
          // progress: chips === maxChips ? 2 : chips === secondMaxChips ? 1 : 0,
        }));
        player.rounds.push(roundResult || []);

        callback({ success: true, remainChips: player.chips, personalRounds: player.rounds });
      });

      // **설정 업데이트 이벤트**
      socket.on('horse-update-settings', ({ roomId, finishLine }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }
    
        // finishLine 설정 업데이트
        room.gameData.finishLine = finishLine;
        io.to(roomId).emit('update-finishLine', finishLine);

        callback({ success: true });
      });

      socket.on('horse-get-game-data', ({ roomId, sessionId }, callback) => {
        console.log("server : horse-get-game-data");
        const room = rooms[roomId];
        if (!room) callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        const player = rooms[roomId].players.find(p => p.id === sessionId);
        const hasRounds = Array.isArray(room.gameData.rounds) && room.gameData.rounds.length > 0;
        const positions = room.gameData.positions || [];
        const horsesData = Object.entries(positions).map(([name, position]) => ({
          name,
          position
        }));

        // 현재 게임 데이터를 클라이언트로 전송
        socket.emit('game-data-update', {
          horses: room.gameData.horses || [],
          players: room.players || [],
          positions: horsesData,
          finishLine: room.gameData.finishLine,
          statusInfo: player,
          isRoundStarted: hasRounds || (room.gameData.timeLeft > 0),
          rounds: room.gameData.rounds,
        });
        callback({ success: true });
      });

    });
  }

  
  res.end();
};

export default ioHandler;