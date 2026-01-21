import { Server } from 'socket.io';
import {
  ServerSocketType,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/types/socket';
import _ from 'lodash';
import { rooms, timers } from '../state/gameState';
import { GAME_STATUS, DEFAULT_GAME_DATA } from '../utils/constants';
import { recordGameWinners } from '../state/leaderboardState';
import {
  validateRoom,
  validatePlayer,
  // validateAssignedByShuffleGame,
} from '../utils/validation';
import {
  submitAnswer,
  evaluateAnswers,
  resetPlayerStatus,
} from '../services/shuffleGameService';
import { Player, ShuffleRoom } from '@/types/room';
import { ShuffleGameData, ShufflePlayerData } from '@/types/shuffle';

const shuffleGameHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: ServerSocketType
) => {
  // 게임 시작 이벤트 (방장만)
  socket.on('shuffle-start-game', ({ roomId, settings }, callback) => {
    try {
      const room = validateRoom(roomId) as ShuffleRoom;
      if (room.gameType !== 'shuffle') {
        throw new Error('뒤죽박죽 게임방이 아닙니다.');
      }

      const baseGameData = _.cloneDeep(DEFAULT_GAME_DATA['shuffle']);
      const prevGameData = room.gameData ?? baseGameData;
      const nextRoundIndex = (prevGameData.roundIndex ?? 0) + 1;
      const rankingRoundsTotal =
        typeof prevGameData.rankingRoundsTotal === 'number' &&
        prevGameData.rankingRoundsTotal > 0
          ? prevGameData.rankingRoundsTotal
          : typeof settings.rankingRoundsTotal === 'number'
            ? settings.rankingRoundsTotal
            : 0;
      const rankingLocked = prevGameData.rankingLocked ?? false;
      const rankingWinners = prevGameData.rankingWinners ?? [];

      // 게임 설정 업데이트
      room.gameData = {
        ...baseGameData,
        rankingRoundsTotal,
        rankingLocked,
        rankingWinners,
        roundIndex: nextRoundIndex,
      };
      Object.assign(room.gameData, settings);

      // 클립 생성 및 섞기
      room.gameData.currentPhase = 'answering';
      room.status = GAME_STATUS.IN_PROGRESS;

      // 플레이어 상태 초기화
      resetPlayerStatus(room.players);

      // 클립 정보 전송
      io.to(roomId).emit('shuffle-game-started', {
        clips: room.gameData.clips,
        gameData: room.gameData,
        players: room.players,
      });

      // 게임 타이머는 수동 종료 방식에서는 사용하지 않음

      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  // 정답 제출 이벤트
  socket.on(
    'shuffle-submit-answer',
    ({ roomId, sessionId, answer }, callback) => {
      try {
        const room = validateRoom(roomId) as ShuffleRoom;
        if (room.gameType !== 'shuffle') {
          throw new Error('뒤죽박죽 게임방이 아닙니다.');
        }
        const player = validatePlayer(room, sessionId) as Player &
          ShufflePlayerData;

        submitAnswer(player, answer);
        io.to(roomId).emit('shuffle-players-update', {
          players: room.players,
        });

        return callback({ success: true });
      } catch (error) {
        callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('shuffle-end-round', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as ShuffleRoom;
      if (room.gameType !== 'shuffle') {
        throw new Error('뒤죽박죽 게임방이 아닙니다.');
      }
      if (room.host.id !== sessionId) {
        throw new Error('방장만 라운드를 종료할 수 있습니다.');
      }

      if (timers[roomId]) {
        clearTimeout(timers[roomId]);
        delete timers[roomId];
      }

      room.gameData.currentPhase = 'result';
      const results = evaluateAnswers(room);

      const shuffleGameData = room.gameData as ShuffleGameData;
      const roundLimit = shuffleGameData.rankingRoundsTotal ?? 0;
      const roundIndex = shuffleGameData.roundIndex ?? 0;
      if (!shuffleGameData.rankingLocked && roundLimit > 0) {
        if (roundIndex >= roundLimit) {
          const players = room.players as (Player & ShufflePlayerData)[];
          const maxScore = players.reduce(
            (max, player) => Math.max(max, player.score ?? 0),
            0
          );
          const winners =
            maxScore > 0
              ? players
                  .filter((player) => (player.score ?? 0) === maxScore)
                  .map((player) => player.name)
                  .filter((name) => name)
              : [];
          if (winners.length > 0) {
            try {
              recordGameWinners('shuffle', winners);
            } catch (error) {
              console.error('[leaderboard] failed to record winners', error);
            }
          }
          shuffleGameData.rankingLocked = true;
          shuffleGameData.rankingWinners = winners;
        }
      }

      io.to(roomId).emit('shuffle-round-results', {
        results,
        correctOrder: room.gameData.correctOrder,
        players: room.players,
        gameData: room.gameData,
      });

      room.status = GAME_STATUS.PENDING;
      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('shuffle-reset-round', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as ShuffleRoom;
      if (room.gameType !== 'shuffle') {
        throw new Error('뒤죽박죽 게임방이 아닙니다.');
      }
      if (room.host.id !== sessionId) {
        throw new Error('방장만 초기화할 수 있습니다.');
      }

      if (timers[roomId]) {
        clearTimeout(timers[roomId]);
        delete timers[roomId];
      }

      room.gameData.currentPhase = 'waiting';
      room.gameData.clips = [];
      room.gameData.correctOrder = [];
      room.gameData.difficulty = undefined;
      room.gameData.isTimeover = true;
      room.gameData.timeLeft = 0;
      room.status = GAME_STATUS.PENDING;
      room.players.forEach((player) => {
        const shufflePlayer = player as Player & ShufflePlayerData;
        shufflePlayer.answer = null;
        shufflePlayer.isAnswerSubmitted = false;
      });

      io.to(roomId).emit('shuffle-round-reset', {
        gameData: room.gameData,
        players: room.players,
      });
      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('shuffle-new-game', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as ShuffleRoom;
      if (room.gameType !== 'shuffle') {
        throw new Error('뒤죽박죽 게임방이 아닙니다.');
      }
      if (room.host.id !== sessionId) {
        throw new Error('방장만 새 게임을 시작할 수 있습니다.');
      }

      if (timers[roomId]) {
        clearTimeout(timers[roomId]);
        delete timers[roomId];
      }

      room.gameData = _.cloneDeep(DEFAULT_GAME_DATA['shuffle']);
      room.status = GAME_STATUS.PENDING;

      room.players.forEach((player) => {
        const shufflePlayer = player as Player & ShufflePlayerData;
        shufflePlayer.score = 0;
        shufflePlayer.answer = null;
        shufflePlayer.isAnswerSubmitted = false;
        shufflePlayer.isAlive = true;
      });

      io.to(roomId).emit('shuffle-round-reset', {
        gameData: room.gameData,
        players: room.players,
      });
      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'shuffle-set-round-limit',
    ({ roomId, sessionId, totalRounds }, callback) => {
      try {
        const room = validateRoom(roomId) as ShuffleRoom;
        if (room.gameType !== 'shuffle') {
          throw new Error('뒤죽박죽 게임방이 아닙니다.');
        }
        if (room.host.id !== sessionId) {
          throw new Error('방장만 라운드 수를 설정할 수 있습니다.');
        }
        if (!Number.isInteger(totalRounds) || totalRounds < 1) {
          throw new Error('라운드 수는 1 이상의 정수여야 합니다.');
        }
        const shuffleGameData = room.gameData as ShuffleGameData;
        if (
          (shuffleGameData.roundIndex ?? 0) > 0 ||
          shuffleGameData.currentPhase !== 'waiting'
        ) {
          throw new Error('게임 시작 전에만 라운드 수를 설정할 수 있습니다.');
        }

        shuffleGameData.rankingRoundsTotal = totalRounds;
        shuffleGameData.roundIndex = 0;
        shuffleGameData.rankingLocked = false;
        shuffleGameData.rankingWinners = [];
        shuffleGameData.currentPhase = 'waiting';
        shuffleGameData.clips = [];
        shuffleGameData.correctOrder = [];
        shuffleGameData.difficulty = undefined;
        room.status = GAME_STATUS.PENDING;

        room.players.forEach((player) => {
          const shufflePlayer = player as Player & ShufflePlayerData;
          shufflePlayer.score = 0;
          shufflePlayer.answer = null;
          shufflePlayer.isAnswerSubmitted = false;
        });

        io.to(roomId).emit('shuffle-round-reset', {
          gameData: room.gameData,
          players: room.players,
        });
        return callback({ success: true });
      } catch (error) {
        callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('shuffle-get-game-data', ({ roomId, sessionId }, callback) => {
    try {
      console.log('server : shuffle-get-game-data', sessionId);
      const room = validateRoom(roomId) as ShuffleRoom;
      if (room.gameType !== 'shuffle') {
        throw new Error('뒤죽박죽 게임방이 아닙니다.');
      }
      socket.join(roomId);

      const player = rooms[roomId].players.find(
        (p) => p.id === sessionId
      ) as Player & ShufflePlayerData;

      // 현재 게임 데이터를 클라이언트로 전송
      socket.emit('shuffle-game-data-update', {
        gameData: {
          correctOrder: room.gameData.correctOrder,
          clips: room.gameData.clips,
          currentPhase: room.gameData.currentPhase,
          difficulty: room.gameData.difficulty,
          roundIndex: room.gameData.roundIndex ?? 0,
          rankingRoundsTotal: room.gameData.rankingRoundsTotal ?? 0,
          rankingLocked: room.gameData.rankingLocked ?? false,
          rankingWinners: room.gameData.rankingWinners ?? [],
          isTimeover: room.gameData.isTimeover || true,
          timeLeft: 0,
        },
        players: room.players || [],
        statusInfo: player || {},
      });
      return callback({ success: true });
    } catch (error) {
      callback({ success: false, message: (error as Error).message });
    }
  });
};

export default shuffleGameHandler;
