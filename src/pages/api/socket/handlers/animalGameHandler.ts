import { Server } from 'socket.io';
import { rooms, timers } from '../state/gameState';
import { GAME_STATUS } from '../utils/constants';
import { validateRoom, validatePlayer } from '../utils/validation';
import { AnimalRoom, Player } from '@/types/room';
import { AnimalPlayerData } from '@/types/animal';
import {
  assignRolesAndSetup,
  resetAnimalGame,
  prepareNextRound,
  startRound,
  resolveRound,
  recordEatIntent,
  applyAbility,
  emitAnimalSnapshots,
  emitEventLog,
  appendEventLog,
  buildWinnerLists,
  buildAnimalSnapshot,
  emitPhaseUpdate,
} from '../services/animalGameService';
import {
  ServerSocketType,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/types/socket';

const animalGameHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: ServerSocketType
) => {
  const endRound = (room: AnimalRoom) => {
    if (room.gameData.phase !== 'running') {
      return;
    }

    room.gameData.phase = 'resolve';
    room.gameData.timeLeft = 0;
    room.gameData.endsAt = null;
    emitPhaseUpdate(room, io);

    const result = resolveRound(room);
    const gameEnded =
      room.gameData.roundNo >= room.gameData.totalRounds ||
      result.survivors.length === 0;

    if (gameEnded) {
      const { winners, losers } = buildWinnerLists(room);
      room.gameData.phase = 'ended';
      room.status = GAME_STATUS.PENDING;
      io.to(room.roomId).emit('server_round_result', {
        ...result,
        gameEnded: true,
        winners,
        losers,
      });
      const logEntry = appendEventLog(room, {
        type: 'result',
        message: '게임이 종료되었습니다.',
        visibility: 'public',
      });
      emitEventLog(room, io, logEntry);
    } else {
      room.gameData.phase = 'result';
      io.to(room.roomId).emit('server_round_result', result);
      emitPhaseUpdate(room, io);
      prepareNextRound(room);
      room.status = GAME_STATUS.PENDING;
    }

    emitPhaseUpdate(room, io);
    emitAnimalSnapshots(room, io);
    io.emit('room-updated', rooms);
  };

  socket.on('host_assign_roles', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as AnimalRoom;
      if (room.gameType !== 'animal') {
        throw new Error('동물 게임방이 아닙니다.');
      }
      if (room.host.id !== sessionId) {
        throw new Error('방장만 역할 배정을 할 수 있습니다.');
      }

      room.host.socketId = socket.id;
      clearInterval(timers[roomId]);
      delete timers[roomId];
      assignRolesAndSetup(room);
      emitAnimalSnapshots(room, io);
      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'host_set_round_time',
    ({ roomId, sessionId, duration }, callback) => {
      try {
        const room = validateRoom(roomId) as AnimalRoom;
        if (room.gameType !== 'animal') {
          throw new Error('동물 게임방이 아닙니다.');
        }
        if (room.host.id !== sessionId) {
          throw new Error('방장만 라운드 시간을 설정할 수 있습니다.');
        }
        if (!Number.isFinite(duration) || duration < 10) {
          throw new Error('라운드 시간을 확인해주세요.');
        }

        room.gameData.roundDuration = duration;
        emitAnimalSnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('host_start_round', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as AnimalRoom;
      if (room.gameType !== 'animal') {
        throw new Error('동물 게임방이 아닙니다.');
      }
      if (room.host.id !== sessionId) {
        throw new Error('방장만 라운드를 시작할 수 있습니다.');
      }
      if (room.gameData.phase === 'running') {
        throw new Error('이미 라운드가 진행 중입니다.');
      }
      if (room.gameData.roundNo >= room.gameData.totalRounds) {
        throw new Error('모든 라운드가 종료되었습니다.');
      }
      if (
        room.players.some(
          (player) => !(player as Player & AnimalPlayerData).roleId
        )
      ) {
        throw new Error('역할 배정이 필요합니다.');
      }

      room.host.socketId = socket.id;
      clearInterval(timers[roomId]);
      startRound(room, room.gameData.roundDuration);
      emitPhaseUpdate(room, io);
      emitAnimalSnapshots(room, io);

      timers[roomId] = setInterval(() => {
        if (room.gameData.timeLeft > 0) {
          room.gameData.timeLeft -= 1;
          emitPhaseUpdate(room, io);
        } else {
          clearInterval(timers[roomId]);
          delete timers[roomId];
          endRound(room);
        }
      }, 1000);

      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('host_force_end_round', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as AnimalRoom;
      if (room.gameType !== 'animal') {
        throw new Error('동물 게임방이 아닙니다.');
      }
      if (room.host.id !== sessionId) {
        throw new Error('방장만 라운드를 종료할 수 있습니다.');
      }
      clearInterval(timers[roomId]);
      delete timers[roomId];
      endRound(room);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('host_reset_game', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as AnimalRoom;
      if (room.gameType !== 'animal') {
        throw new Error('동물 게임방이 아닙니다.');
      }
      if (room.host.id !== sessionId) {
        throw new Error('방장만 새 게임을 시작할 수 있습니다.');
      }

      clearInterval(timers[roomId]);
      delete timers[roomId];
      resetAnimalGame(room);
      emitAnimalSnapshots(room, io);
      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'player_select_place',
    ({ roomId, sessionId, placeId }, callback) => {
      try {
        const room = validateRoom(roomId) as AnimalRoom;
        if (room.gameType !== 'animal') {
          throw new Error('동물 게임방이 아닙니다.');
        }
        const player = validatePlayer(room, sessionId) as Player &
          AnimalPlayerData;
        if (!player.isAlive) {
          throw new Error('사망한 플레이어는 이동할 수 없습니다.');
        }
        if (room.gameData.phase !== 'ready') {
          throw new Error('준비 단계에서만 이동할 수 있습니다.');
        }
        if (player.locked) {
          throw new Error('이미 장소가 잠겨 있습니다.');
        }
        if (!['A', 'B', 'C', 'D'].includes(placeId)) {
          throw new Error('장소가 유효하지 않습니다.');
        }

        player.placeId = placeId;
        emitAnimalSnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('player_lock_place', ({ roomId, sessionId, locked }, callback) => {
    try {
      const room = validateRoom(roomId) as AnimalRoom;
      if (room.gameType !== 'animal') {
        throw new Error('동물 게임방이 아닙니다.');
      }
      const player = validatePlayer(room, sessionId) as Player &
        AnimalPlayerData;
      if (!player.isAlive) {
        throw new Error('사망한 플레이어는 잠글 수 없습니다.');
      }
      if (room.gameData.phase !== 'ready') {
        throw new Error('준비 단계에서만 잠금 변경이 가능합니다.');
      }
      if (!player.placeId) {
        throw new Error('먼저 장소를 선택해주세요.');
      }

      player.locked = locked;
      emitAnimalSnapshots(room, io);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'player_use_ability',
    ({ roomId, sessionId, abilityId, target, reqId }, callback) => {
      try {
        const room = validateRoom(roomId) as AnimalRoom;
        if (room.gameType !== 'animal') {
          throw new Error('동물 게임방이 아닙니다.');
        }
        const player = validatePlayer(room, sessionId) as Player &
          AnimalPlayerData;

        const result = applyAbility(room, player, abilityId, target, reqId);
        if (result.logEntry) {
          emitEventLog(room, io, result.logEntry);
        }
        emitAnimalSnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on(
    'carnivore_eat',
    ({ roomId, sessionId, targetPlayerId, reqId }, callback) => {
      try {
        const room = validateRoom(roomId) as AnimalRoom;
        if (room.gameType !== 'animal') {
          throw new Error('동물 게임방이 아닙니다.');
        }
        const predator = validatePlayer(room, sessionId) as Player &
          AnimalPlayerData;

        const result = recordEatIntent(room, predator, targetPlayerId, reqId);
        if (result?.duplicate) {
          return callback({ success: true });
        }
        const logEntry = appendEventLog(room, {
          type: 'eat',
          message: `${predator.name}님이 사냥 대상을 지정했습니다.`,
          visibility: 'host',
        });
        emitEventLog(room, io, logEntry);
        emitAnimalSnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('player_get_state', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as AnimalRoom;
      if (room.gameType !== 'animal') {
        throw new Error('동물 게임방이 아닙니다.');
      }
      if (room.host.id === sessionId) {
        room.host.socketId = socket.id;
      } else {
        validatePlayer(room, sessionId);
      }

      const isHostView = room.host.id === sessionId;
      const snapshot = buildAnimalSnapshot(room, sessionId, isHostView);
      socket.emit('server_state_snapshot', snapshot);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });
};

export default animalGameHandler;
