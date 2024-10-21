import { rooms, timers } from '../state/gameState';
import { NOT_ASSIGNED, MESSAGES, GAME_STATUS, HORSE_GAME } from '../utils/constants';
import { validateRoom, validatePlayer, validateAssignedByHorseGame } from '../utils/validation';
import { calculateRoundResult, getProgressTwoHorses, updatePlayersAfterRound, updateHorsePositions, checkGameEnd } from '../services/horseGameService';

const horseGameHandler = (io, socket) => {
    socket.on('horse-start-round', ({ roomId, duration }, callback) => {
        try {
            const room = validateRoom(roomId);
            validateAssignedByHorseGame(room);

            room.status = GAME_STATUS.IN_PROGRESS;

            // 게임 내 라운드 1회성 데이터들
            room.gameData.timeLeft = duration;
            room.gameData.rounds = room.gameData.rounds || [];
            room.gameData.bets = {}; // 라운드마다 베팅 초기화
            room.gameData.positions = room.gameData.positions || {}; // 말들의 위치 초기화 (또는 유지)
            
            clearInterval(timers[roomId]);

            room.players.forEach(player => {
                player.isBetLocked = false;  // 모든 플레이어의 isBetLocked를 false로 설정
                player.isVoteLocked = false;
                player.chipDiff = 0; // caution : 이 타이밍에 emit하면 안됨
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

                    // 베팅 결과 계산
                    const roundResult = calculateRoundResult(room, room.gameData.bets);

                    // progress가 2인 말 목록 생성
                    const progressTwoHorses = getProgressTwoHorses(roundResult);

                    // 플레이어 업데이트
                    updatePlayersAfterRound(room, progressTwoHorses, io);

                    // 말의 위치 업데이트
                    updateHorsePositions(room, roundResult, io, roomId);

                    // 라운드 종료 알림
                    io.to(roomId).emit('round-ended', { players: room.players, roundResult }); // 라운드 종료 알림, players 업데이트됨

                    // 게임 종료 여부 확인
                    checkGameEnd(room, io, roomId);
                }
            }, 1000);

            io.emit('room-updated', rooms); // '게임중' 으로 변한게 체크 되어야함
            return callback({ success: true });
        } catch (error) {
            callback({ success: false, message: error.message });
        }
    });

    // **추가된 역할 할당 이벤트**
    socket.on('horse-assign-roles', ({ roomId }, callback) => {
        try {
            const room = validateRoom(roomId);

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
                player.chipDiff = 0;
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
                    chipDiff: player.chipDiff,
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
        } catch (error) {
            callback({ success: false, message: error.message });
        }
    });

    // 베팅 로직 추가
    // bets 는 { A : 3, B : 4 } 같은 객체
    socket.on('horse-bet', ({ roomId, session, bets }, callback) => {
        try {
            const room = validateRoom(roomId);
            const player = validatePlayer(room, session.user.id);

            // 플레이어가 가진 칩이 충분한지 체크
            const totalBets = Object.values(bets).reduce((sum, chips) => sum + chips, 0);
            if (player.chips < totalBets) {
                return callback({ success: false, message: MESSAGES.INSUFFICIENT_CHIPS });
            }

            // 베팅한 칩 기록
            room.gameData.bets = room.gameData.bets || {};
            Object.entries(bets).forEach(([horse, chips]) => {
                room.gameData.bets[horse] = (room.gameData.bets[horse] || 0) + chips;
            });

            player.chips -= totalBets;
            player.chipDiff -= totalBets;
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

            callback({ success: true, remainChips: player.chips, personalRounds: player.rounds, isBetLocked: player.isBetLocked });
        } catch (error) {
            callback({ success: false, message: error.message });
        }
    });

    // **말 투표 로직 (클라이언트에서 'horse-vote' 이벤트 발생)**
    socket.on('horse-vote', ({ roomId, session, selectedHorse }, callback) => {
        try {
            const room = validateRoom(roomId);
            const player = validatePlayer(room, session.user.id);

            // 투표 저장
            player.voteHistory = player.voteHistory || [];
            player.voteHistory.push(selectedHorse);
            player.isVoteLocked = true;

            callback({ success: true, voteHistory: player.voteHistory, isVoteLocked: player.isVoteLocked });
        } catch (error) {
            callback({ success: false, message: error.message });
        }
    });

    // **설정 업데이트 이벤트**
    socket.on('horse-update-settings', ({ roomId, finishLine }, callback) => {
        try {
            const room = validateRoom(roomId);

            // finishLine 설정 업데이트
            room.gameData.finishLine = finishLine;
            io.to(roomId).emit('update-finishLine', finishLine);

            callback({ success: true });
        } catch (error) {
            callback({ success: false, message: error.message });
        }
    });

    socket.on('horse-get-game-data', ({ roomId, sessionId }, callback) => {
        try {
            console.log("server : horse-get-game-data", sessionId);
            const room = validateRoom(roomId);

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
        } catch (error) {
            callback({ success: false, message: error.message });
        }
    });

    // 새로운 게임 시작을 위한 이벤트 추가
    socket.on('horse-new-game', ({ roomId }, callback) => {
        try {
            const room = validateRoom(roomId);

            room.status = GAME_STATUS.PENDING;

            clearInterval(timers[roomId]);
            delete timers[roomId];
            io.to(roomId).emit('update-timer', 0);

            // gameData 초기화
            room.gameData = {
                finishLine: HORSE_GAME.DEFAULT_FINISH_LINE,  // 기본 설정
                horses: [],
                positions: [],  // 경주마 위치 초기화
                rounds: [],  // 라운드 초기화
                isTimeover: true,
            };

            // statusInfo 초기화
            room.players.forEach(player => {
                player.dummyName = NOT_ASSIGNED;
                player.horse = NOT_ASSIGNED;
                player.isSolo = false;
                player.chips = 0;  // 각 플레이어에게 20개의 칩 지급
                player.chipDiff = 0;  // 각 플레이어에게 20개의 칩 지급
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
                    finishLine: HORSE_GAME.DEFAULT_FINISH_LINE,
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
                finishLine: HORSE_GAME.DEFAULT_FINISH_LINE,
                statusInfo: {},
                isRoundStarted: false,
                rounds: [],
                isTimeover: true,
            });

            io.emit('room-updated', rooms);
            callback({ success: true });
        } catch (error) {
            callback({ success: false, message: error.message });
        }
    });

    // 서버 코드 (예: socket.io 서버)
    socket.on('horse-update-memo', ({ roomId, index, memo, sessionId }, callback) => {
        try {
            const room = validateRoom(roomId);
            const player = validatePlayer(room, sessionId);

            player.memo = player.memo || [];
            player.memo[index] = memo;
            callback({ success: true });
        } catch (error) {
            callback({ success: false, message: error.message });
        }
    });
};

export default horseGameHandler;