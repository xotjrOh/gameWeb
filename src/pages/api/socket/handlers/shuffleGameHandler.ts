import { Server } from 'socket.io';
import {
  ServerSocketType,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/types/socket';
import _ from 'lodash';
import { rooms, timers } from '../state/gameState';
import {
  MESSAGES,
  GAME_STATUS,
  DEFAULT_GAME_DATA,
  DEFAULT_PLAYER_DATA,
} from '../utils/constants';
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
import { Room, Player, ShuffleRoom } from '@/types/room';
import { ShuffleGameData, ShufflePlayerData } from '@/types/shuffle';

const shuffleGameHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: ServerSocketType
) => {
  // 게임 시작 이벤트 (방장만)
  socket.on('shuffle-start-game', ({ roomId, settings }, callback) => {
    try {
      const room = validateRoom(roomId) as ShuffleRoom;

      // 게임 설정 업데이트
      room.gameData = _.cloneDeep(DEFAULT_GAME_DATA['shuffle']);
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
        const room = validateRoom(roomId) as Room;
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
      const room = validateRoom(roomId) as Room;
      if (room.host.id !== sessionId) {
        throw new Error('방장만 라운드를 종료할 수 있습니다.');
      }

      if (timers[roomId]) {
        clearTimeout(timers[roomId]);
        delete timers[roomId];
      }

      room.gameData.currentPhase = 'result';
      const results = evaluateAnswers(room);
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
      const room = validateRoom(roomId) as Room;
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

  socket.on('shuffle-get-game-data', ({ roomId, sessionId }, callback) => {
    try {
      console.log('server : shuffle-get-game-data', sessionId);
      const room = validateRoom(roomId) as Room;
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
