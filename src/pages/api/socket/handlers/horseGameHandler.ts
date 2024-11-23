import _ from 'lodash';
import { rooms, timers } from '../state/gameState';
import {
  GAME_STATUS,
  DEFAULT_GAME_DATA,
  DEFAULT_PLAYER_DATA,
} from '../utils/constants';
import {
  validateRoom,
  validatePlayer,
  validateAssignedByHorseGame,
  validateChipsByHorseGame,
} from '../utils/validation';
import {
  calculateRoundResult,
  getProgressTwoHorses,
  updatePlayersAfterRound,
  updateHorsePositions,
  checkGameEnd,
  generateHorseNames,
  assignRolesToPlayers,
  recordPlayerBets,
  updatePlayerChipHistory,
} from '../services/horseGameService';
import { HorseRoom, Player } from '@/types/room';
import { HorsePlayerData, HorsePosition } from '@/types/horse';
import { Server } from 'socket.io';
import {
  ServerSocketType,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/types/socket';

const horseGameHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: ServerSocketType
) => {
  socket.on('horse-start-round', ({ roomId, duration }, callback) => {
    try {
      const room = validateRoom(roomId) as HorseRoom;
      validateAssignedByHorseGame(room);

      room.status = GAME_STATUS.IN_PROGRESS;

      // 게임 내 라운드 1회성 데이터들
      room.gameData.timeLeft = duration;
      room.gameData.rounds = room.gameData.rounds || [];
      room.gameData.bets = {}; // 라운드마다 베팅 초기화
      room.gameData.positions = room.gameData.positions || {}; // 말들의 위치 초기화 (또는 유지)

      clearInterval(timers[roomId]);

      room.players.forEach((player) => {
        const horsePlayer = player as Player & HorsePlayerData;
        horsePlayer.isBetLocked = false; // 모든 플레이어의 isBetLocked를 false로 설정
        horsePlayer.isVoteLocked = false;
        horsePlayer.chipDiff = 0; // caution : 이 타이밍에 emit하면 안됨
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
          io.to(roomId).emit('round-ended', {
            players: room.players,
            roundResult,
          }); // 라운드 종료 알림, players 업데이트됨

          // 게임 종료 여부 확인
          checkGameEnd(room, io, roomId);
        }
      }, 1000);

      io.emit('room-updated', rooms); // '게임중' 으로 변한게 체크 되어야함
      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  // **추가된 역할 할당 이벤트**
  socket.on('horse-assign-roles', ({ roomId }, callback) => {
    try {
      const room = validateRoom(roomId);
      const players = room.players;
      const numPlayers = players.length;

      // 말 이름 목록 생성
      const numHorses = Math.ceil(numPlayers / 2);
      const horses = generateHorseNames(numHorses);

      room.gameData.horses = horses;

      // 플레이어에게 역할 할당
      assignRolesToPlayers(players, horses, io);

      // 역할 할당 완료 알림
      io.to(roomId).emit('roles-assigned', { success: true, horses, players });

      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  // 베팅 로직 추가
  // bets 는 { A : 3, B : 4 } 같은 객체
  socket.on('horse-bet', ({ roomId, sessionId, bets }, callback) => {
    try {
      const room = validateRoom(roomId) as HorseRoom;
      const player = validatePlayer(room, sessionId) as Player &
        HorsePlayerData;

      // 플레이어가 가진 칩이 충분한지 체크
      const totalBets = validateChipsByHorseGame(player, bets);

      // 베팅한 칩 기록
      recordPlayerBets(room, bets);

      player.chips -= totalBets;
      player.chipDiff -= totalBets;
      player.isBetLocked = true;

      // 개인용 칩사용 히스토리
      updatePlayerChipHistory(player, bets);

      return callback({
        success: true,
        remainChips: player.chips,
        personalRounds: player.rounds,
        isBetLocked: player.isBetLocked,
      });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  // **말 투표 로직
  socket.on('horse-vote', ({ roomId, sessionId, selectedHorse }, callback) => {
    try {
      const room = validateRoom(roomId) as HorseRoom;
      const player = validatePlayer(room, sessionId) as Player &
        HorsePlayerData;

      // 투표 저장
      player.voteHistory = player.voteHistory || [];
      player.voteHistory.push(selectedHorse);
      player.isVoteLocked = true;

      return callback({
        success: true,
        voteHistory: player.voteHistory,
        isVoteLocked: player.isVoteLocked,
      });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  // **설정 업데이트 이벤트**
  socket.on('horse-update-settings', ({ roomId, finishLine }, callback) => {
    try {
      const room = validateRoom(roomId);

      // finishLine 설정 업데이트
      room.gameData.finishLine = finishLine;
      io.to(roomId).emit('update-finishLine', finishLine);

      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('horse-get-game-data', ({ roomId, sessionId }, callback) => {
    try {
      console.log('server : horse-get-game-data', sessionId);
      const room = validateRoom(roomId);

      const player = rooms[roomId].players.find((p) => p.id === sessionId);
      const hasRounds =
        Array.isArray(room.gameData.rounds) && room.gameData.rounds.length > 0;
      const positions = room.gameData.positions || [];
      const horsesData = Object.entries(positions).map(([name, position]) => ({
        name,
        position,
      })) as HorsePosition[];
      const defaultStatusInfo = _.cloneDeep(DEFAULT_PLAYER_DATA['horse']);

      // 현재 게임 데이터를 클라이언트로 전송
      socket.emit('horse-all-data-update', {
        players: room.players || [],
        gameData: {
          horses: room.gameData.horses || [],
          positions: horsesData,
          finishLine: room.gameData.finishLine,
          isRoundStarted: hasRounds || room.gameData.timeLeft > 0,
          rounds: room.gameData.rounds || [],
          isTimeover: room.gameData.isTimeover || true,
          timeLeft: room.gameData.timeLeft || 0,
        },
        statusInfo: player || defaultStatusInfo, // TODO : 바뀐로직 에러확인
      });
      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  // 새로운 게임 시작을 위한 이벤트 추가
  socket.on('horse-new-game', ({ roomId }, callback) => {
    try {
      const room = validateRoom(roomId);
      const defaultStatusInfo = _.cloneDeep(DEFAULT_PLAYER_DATA['horse']);
      room.status = GAME_STATUS.PENDING;

      clearInterval(timers[roomId]);
      delete timers[roomId];
      io.to(roomId).emit('update-timer', 0);

      room.gameData = _.cloneDeep(DEFAULT_GAME_DATA['horse']);

      // statusInfo 초기화
      // 'gameData 초기화'와 병합 금지. room.players 전달때문
      room.players.forEach((player) => {
        Object.assign(player, defaultStatusInfo);
      });

      // gameData 초기화
      room.players.forEach((player) => {
        io.to(player.socketId).emit('horse-all-data-update', {
          players: room.players,
          gameData: {
            finishLine: room.gameData.finishLine,
            horses: room.gameData.horses,
            positions: room.gameData.positions,
            rounds: room.gameData.rounds,
            isTimeover: room.gameData.isTimeover,
            isRoundStarted: room.gameData.isRoundStarted,
            timeLeft: 0,
          },
          statusInfo: player,
        });
      });

      // host 초기화
      io.to(room.host.socketId).emit('horse-all-data-update', {
        players: room.players,
        gameData: {
          finishLine: room.gameData.finishLine,
          horses: room.gameData.horses,
          positions: room.gameData.positions,
          rounds: room.gameData.rounds,
          isTimeover: room.gameData.isTimeover,
          isRoundStarted: room.gameData.isRoundStarted,
          timeLeft: 0,
        },
        statusInfo: Object.assign(room.host, defaultStatusInfo),
      });

      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'horse-update-memo',
    ({ roomId, index, memo, sessionId }, callback) => {
      try {
        const room = validateRoom(roomId) as HorseRoom;
        const player = validatePlayer(room, sessionId) as Player &
          HorsePlayerData;

        player.memo = player.memo || [];
        player.memo[index] = memo;
        return callback({ success: true });
      } catch (error) {
        callback({ success: false, message: (error as Error).message });
      }
    }
  );
};

export default horseGameHandler;
