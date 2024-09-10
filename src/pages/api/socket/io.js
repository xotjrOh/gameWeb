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
      console.log('server : A user connected', socket.id);

      socket.on('update-socket-id', ({ roomId, sessionId, newSocketId }) => {
        // roomId와 sessionId를 기반으로 해당 플레이어를 찾아서 socketId를 업데이트
        if (rooms[roomId]) {
          const player = rooms[roomId].players.find(p => p.id === sessionId);
          if (player) {
            player.socketId = newSocketId;
            socket.join(roomId.toString());
            console.log(`Updated player socketId for player ${sessionId} in room ${roomId} : ${newSocketId}`);
          }

          if (rooms[roomId].host.id == sessionId) {
            socket.join(roomId.toString());
            console.log(`Updated host socketId for player ${sessionId} in room ${roomId} : ${newSocketId}`);
          }
        }
      });

      socket.on('get-room-list', () => {
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
        // if (!AUTHORIZED_SESSION_IDS.includes(sessionId)) {
        //   return callback({ success: false, message: '방을 만들기 위해서는 오태석에게 문의하세요.' });
        // }
        if (!roomName) {
          return callback({ success: false, message: '방이름을 정해주세요.', field:"roomName" });
        }
        if (!gameType) {
          return callback({ success: false, message: '게임종류를 정해주세요.', field:"gameType" });
        }
        if (!Number.isInteger(maxPlayers) || maxPlayers < 1) {
          return callback({ success: false, message: '최대 플레이어 수는 1 이상의 정수여야 합니다.', field:"maxPlayers" });
        }
        // **다른 방에서 이미 sessionId가 있는지 체크**
        for (const [otherRoomId, otherRoom] of Object.entries(rooms)) {
          const isPlayerInOtherRoom = otherRoom.players.some(player => player.id === sessionId);
          const isHostInOtherRoom = otherRoom.host.id === sessionId;

          if (isPlayerInOtherRoom || isHostInOtherRoom) {
            return callback({
              success: false,
              message: `이미 참여중인 게임방(${otherRoom.roomName})이 있습니다`
            });
          }
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
              socketId : socket.id,
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

        // **다른 방에서 이미 sessionId가 있는지 체크**
        for (const [otherRoomId, otherRoom] of Object.entries(rooms)) {
          if (otherRoomId.toString() !== roomId.toString()) {
            const isPlayerInOtherRoom = otherRoom.players.some(player => player.id === sessionId);
            const isHostInOtherRoom = otherRoom.host.id === sessionId;

            if (isPlayerInOtherRoom || isHostInOtherRoom) {
              return callback({
                success: false,
                host: false,
                message: `이미 참여중인 게임방(${otherRoom.roomName})이 있습니다`
              });
            }
          }
        }
        
        const playerExists = room.players.some(player => player.id === sessionId);
        // 튕겼다가 온 사람은 재연결 해줌
        if (playerExists) {
          const player = room.players.find(player => player.id === sessionId);
          player.socketId = socket.id;
          socket.join(roomId.toString());
          return callback({ success: true });
        }

        if (room.players.length >= room.maxPlayers) {
          return callback({ success: false, host: false, message: '방이 가득찼습니다' });
        }
        if (room.host.id === sessionId) {
          return callback({ success: true, host: true });
        }
        if (room.status === '게임중') {
          return callback({ success: false, host: false, message: '이미 게임이 시작되었습니다' });
        }
        
        room.players.push({ id: sessionId, dummyName: '할당되지않음', horse: '할당되지않음', name: userName, socketId: socket.id, 
          chips: 0, rounds: [], voteHistory: [], isBetLocked: false, isVoteLocked: false, memo: [] });
        socket.join(roomId.toString());
        io.emit('room-updated', rooms);
        return callback({ success: true });
      });

      socket.on('leave-room', ({ roomId, sessionId }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }
        if (room.status === '게임중') {
          return callback({ success: false, message: '게임이 진행 중입니다. 게임이 끝나기 전까지 방을 나갈 수 없습니다.' });
        }
      
        // 방장인지 확인
        const isHost = room.host.id === sessionId;
      
        // 방장이 아닌 경우는 나갈 수 없음
        if (!isHost) {
          return callback({ success: false, message: '방장만이 방을 종료할 수 있습니다.' });
        }
      
        // 방 삭제 처리
        delete rooms[roomId];
        io.to(roomId).emit('room-closed', { message: '방장이 방을 종료했습니다.' });
      
        // 방 내 다른 플레이어들의 소켓 이벤트 해제
        io.in(roomId).socketsLeave(roomId);  // 모든 플레이어를 방에서 제거
        // io.in(roomId).clients((error, clients) => {
        //   if (error) throw error;
        //   clients.forEach(clientId => {
        //     const clientSocket = io.sockets.sockets.get(clientId);
        //     clientSocket.removeAllListeners();  // 각 클라이언트 소켓의 이벤트 리스너 제거
        //   });
        // });
        
        io.emit('room-updated', rooms);      // 방이 삭제되었음을 알림
      
        return callback({ success: true, host: false });
      });
      

      socket.on('disconnect', () => {
        console.log('server : A user disconnected');
      });

      // 예약된 error 이벤트 처리
      socket.on('error', (err) => {
        console.error(`Error occurred on socket ${socket.id}:`, err);
      });

      // -------------------- HORSE GAME --------------------------
      // todo : 다른게임에서 로직이 다를 경우 게임타입 나누는 로직 필요
      // host만 호출할 이벤트
      socket.on('horse-start-round', ({ roomId, duration }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }
        // room.players 중 horse 속성이 없거나 빈 값이 있으면 false 리턴
        const hasMissingHorse = room.players.some(player => !player.horse || player.horse === '할당되지않음');
        if (hasMissingHorse) {
          return callback({ success: false, message: '모든 플레이어에게 말이 할당되지 않았습니다.' });
        }

        room.status = "게임중";

        room.gameData.timeLeft = duration;
        room.gameData.rounds = room.gameData.rounds || [];
        room.gameData.bets = {}; // 라운드마다 베팅 초기화
        room.gameData.positions = room.gameData.positions || {}; // 말들의 위치 초기화 (또는 유지)
        clearInterval(timers[roomId]);

        room.players.forEach(player => {
          player.isBetLocked = false;  // 모든 플레이어의 isBetLocked를 false로 설정
          player.isVoteLocked = false;
        });
        io.to(roomId).emit('update-isBetLocked', false);
        io.to(roomId).emit('update-isVoteLocked', false);

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

            const maxChips = sortedHorses?.[0]?.[1] || -1;
            const secondMaxChips = sortedHorses.find(([, chips]) => chips < maxChips)?.[1] || 0;

            const roundResult = sortedHorses.map(([horse, chips]) => ({
              horse,
              chips,
              progress: chips === maxChips ? 2 : chips === secondMaxChips ? 1 : 0,
            }));

            // 1. progress가 2인 말만 객체로 변환
            const progressTwoHorses = roundResult.reduce((acc, { horse, progress }) => {
              if (progress === 2) {
                acc[horse] = true;  // progress가 2인 말만 저장
              }
              return acc;
            }, {});

            // 베팅 안 한 라운드 히스토리 추가 + 2.vote에 따라 칩 추가
            room.players.forEach(player => {
              if (!player.isBetLocked) {
                player.rounds.push([]);  // 빈 배열 추가
              }
              io.to(player.socketId).emit('personal-round-update', player.rounds);
              
              if (!player.isVoteLocked) {
                player.voteHistory.push('X');
              }
              io.to(player.socketId).emit('vote-history-update', player.voteHistory);

              const lastVote = player.voteHistory[player.voteHistory.length - 1];  // voteHistory의 마지막 값
              if (progressTwoHorses[lastVote]) {  // progress가 2인 말에 투표했는지 확인
                player.chips += player.isSolo ? 5 : 2; 
                io.to(player.socketId).emit('update-chip', player.chips);
              }
            });

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

            io.to(roomId).emit('round-ended', { players : room.players, roundResult : roundResult }); // 라운드 종료 알림, players 업데이트됨

            // **게임 종료 체크**
            const horsesPositions = Object.entries(room.gameData.positions);

            // 결승선을 넘은 말들을 찾음 (losers)
            const losers = horsesPositions.filter(([horse, position]) => position >= room.gameData.finishLine);

            // 만약 결승선을 넘은 말이 있다면 게임 종료
            if (losers.length > 0) {
              // 결승선에 도달하지 않은 말 중 가장 가까운 말들을 찾음 (winners)
              const remainingHorses = horsesPositions.filter(([horse, position]) => position < room.gameData.finishLine);
              const maxPosition = Math.max(...remainingHorses.map(([, position]) => position));
              
              const winners = remainingHorses.filter(([, position]) => position === maxPosition);

              const getPlayersByHorse = (horseName) =>
                room.players
                  .filter((player) => player.horse === horseName)
                  .map((player) => player.name);  // 말에 할당된 플레이어 이름
        
              io.to(roomId).emit('game-ended', {
                winners: winners.map(([horse]) => ({
                  horse,
                  playerNames: getPlayersByHorse(horse),
                })),
                losers: losers.map(([horse]) => ({
                  horse,
                  playerNames: getPlayersByHorse(horse),
                })),
              });
              room.status = "대기중";
            } else {
              // io.to(roomId).emit('round-ended', { players : room.players, roundResult : roundResult }); // 라운드 종료 알림
            }
          }
        }, 1000);

        io.emit('room-updated', rooms); // '게임중' 으로 변한게 체크 되어야함
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
            rounds: [], //player.rounds,
            voteHistory: [], //player.voteHistory,
            isBetLocked: false, //player.isBetLocked,
            isVoteLocked: false, //player.isVoteLocked,
            memo: [], //player.memo,
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
        player.isBetLocked = true;

        // 개인용 칩사용 히스토리
        const sortedHorses = Object.entries(bets)
          .sort(([, chipsA], [, chipsB]) => chipsB - chipsA);
        const roundResult = sortedHorses.map(([horse, chips]) => ({
          horse,
          chips,
          // progress: chips === maxChips ? 2 : chips === secondMaxChips ? 1 : 0,
        }));
        player.rounds.push(roundResult || []);

        callback({ success: true, remainChips: player.chips, personalRounds: player.rounds, isBetLocked : player.isBetLocked });
      });

      // **말 투표 로직 (클라이언트에서 'horse-vote' 이벤트 발생)**
      socket.on('horse-vote', ({ roomId, session, selectedHorse }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }

        const player = room.players.find(p => p.id === session.user.id);
        if (!player) {
          return callback({ success: false, message: '본인이 참여하고 있지 않은 게임방입니다.' });
        }

        // 투표 저장
        player.voteHistory = player.voteHistory || [];
        player.voteHistory.push(selectedHorse);
        player.isVoteLocked = true;

        callback({ success: true, voteHistory: player.voteHistory, isVoteLocked: player.isVoteLocked });
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
        console.log("server : horse-get-game-data", sessionId);
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
          statusInfo: player || { memo: [] },
          isRoundStarted: hasRounds || (room.gameData.timeLeft > 0),
          rounds: room.gameData.rounds || [],
          isTimeover: room.gameData.isTimeover || true,
        });
        callback({ success: true });
      });

      // 새로운 게임 시작을 위한 이벤트 추가
      socket.on('horse-new-game', ({ roomId }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }
        room.status = "대기중";

        clearInterval(timers[roomId]);
        delete timers[roomId];
        io.to(roomId).emit('update-timer', 0);

        // gameData 초기화
        room.gameData = {
          finishLine: 9,  // 기본 설정
          horses: [],
          positions: [],  // 경주마 위치 초기화
          rounds: [],  // 라운드 초기화
          isTimeover: true,
        };

        // statusInfo 초기화
        room.players.forEach(player => {
          player.dummyName = '할당되지않음';
          player.horse = '할당되지않음';
          player.isSolo = false;
          player.chips = 0;  // 각 플레이어에게 20개의 칩 지급
          player.rounds = [];  // 각 플레이어의 라운드 정보 초기화
          player.voteHistory = [];  // 투표 내역 초기화
          player.isBetLocked = false;  // 베팅 잠금 초기화
          player.isVoteLocked = false;  // 투표 잠금 초기화
          player.memo = [];
        });

        // gameData 초기화
        room.players.forEach(player => {
          io.to(player.socketId).emit('game-data-update', {
            horses: [],
            players: room.players,
            positions: [],
            finishLine: 9,
            statusInfo: player,
            isRoundStarted: false,
            rounds: [],
            isTimeover: true,
          });
        });

        // host 초기화
        io.to(room.host.socketId).emit('game-data-update', {
          horses: [],
          players: room.players,
          positions: [],
          finishLine: 9,
          statusInfo: {},
          isRoundStarted: false,
          rounds: [],
          isTimeover: true,
        });

        io.emit('room-updated', rooms);
        callback({ success: true });
      });

      // 서버 코드 (예: socket.io 서버)
      socket.on('horse-update-memo', ({ roomId, index, memo, sessionId }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          return callback({ success: false, message: '존재하지 않는 게임방입니다.' });
        }

        const player = rooms[roomId].players.find(p => p.id === sessionId); // 요청 본인
        if (!player) {
          return callback({ success: false, message: '본인이 참여하고 있지 않은 게임방입니다.' });
        }

        player.memo = player.memo || [];
        player.memo[index] = memo;
        callback({ success: true });
      });


    });
  }  
  res.end();
};

export default ioHandler;