import { Server } from 'socket.io';
import { rooms, timers } from '../state/gameState';
import { GAME_STATUS } from '../utils/constants';
import { validateRoom, validatePlayer } from '../utils/validation';
import { JamoRoom, Player } from '@/types/room';
import { JamoPlayerData } from '@/types/jamo';
import {
  appendChatMessage,
  buildJamoSnapshot,
  emitJamoPhaseUpdate,
  emitJamoSnapshots,
  endJamoRound,
  processSubmission,
  startJamoRound,
} from '../services/jamoGameService';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ServerSocketType,
} from '@/types/socket';

const jamoGameHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: ServerSocketType
) => {
  const clearRoomTimer = (roomId: string) => {
    if (timers[roomId]) {
      clearInterval(timers[roomId]);
      delete timers[roomId];
    }
  };

  const handleEndRound = (room: JamoRoom) => {
    if (room.gameData.phase !== 'discuss') {
      return;
    }
    room.gameData.phase = 'result';
    room.gameData.timeLeft = 0;
    room.gameData.endsAt = null;
    room.status = GAME_STATUS.PENDING;

    const result = endJamoRound(room);
    room.gameData.lastRoundResult = result;
    io.to(room.roomId).emit('jamo_round_result', result);
    emitJamoPhaseUpdate(room, io);
    emitJamoSnapshots(room, io);
    io.emit('room-updated', rooms);
  };

  socket.on(
    'jamo_set_round_time',
    ({ roomId, sessionId, duration }, callback) => {
      try {
        const room = validateRoom(roomId) as JamoRoom;
        if (room.gameType !== 'jamo') {
          throw new Error('자모 게임방이 아닙니다.');
        }
        if (room.host.id !== sessionId) {
          throw new Error('방장만 시간 설정이 가능합니다.');
        }
        if (!Number.isFinite(duration) || duration < 10) {
          throw new Error('라운드 시간을 확인해주세요.');
        }

        room.gameData.roundDuration = duration;
        emitJamoSnapshots(room, io);
        emitJamoPhaseUpdate(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('jamo_start_round', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as JamoRoom;
      if (room.gameType !== 'jamo') {
        throw new Error('자모 게임방이 아닙니다.');
      }
      if (room.host.id !== sessionId) {
        throw new Error('방장만 라운드를 시작할 수 있습니다.');
      }
      if (room.gameData.phase === 'discuss') {
        throw new Error('이미 라운드가 진행 중입니다.');
      }
      if (room.players.length === 0) {
        throw new Error('참가자가 없습니다.');
      }

      room.host.socketId = socket.id;
      clearRoomTimer(roomId);

      startJamoRound(room, room.gameData.roundDuration);
      emitJamoSnapshots(room, io);
      emitJamoPhaseUpdate(room, io);

      timers[roomId] = setInterval(() => {
        if (room.gameData.timeLeft > 0) {
          room.gameData.timeLeft -= 1;
          emitJamoPhaseUpdate(room, io);
        } else {
          clearRoomTimer(roomId);
          handleEndRound(room);
        }
      }, 1000);

      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('jamo_force_end_round', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as JamoRoom;
      if (room.gameType !== 'jamo') {
        throw new Error('자모 게임방이 아닙니다.');
      }
      if (room.host.id !== sessionId) {
        throw new Error('방장만 라운드를 종료할 수 있습니다.');
      }
      clearRoomTimer(roomId);
      handleEndRound(room);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'jamo_submit_numbers',
    async ({ roomId, sessionId, numbers }, callback) => {
      try {
        const room = validateRoom(roomId) as JamoRoom;
        if (room.gameType !== 'jamo') {
          throw new Error('자모 게임방이 아닙니다.');
        }
        const player = validatePlayer(room, sessionId) as Player &
          JamoPlayerData;

        const result = await processSubmission(room, player, numbers);
        emitJamoSnapshots(room, io);
        return callback({ success: result.accepted });
      } catch (error) {
        return callback({ success: false });
      }
    }
  );

  socket.on('jamo_send_chat', ({ roomId, sessionId, message }, callback) => {
    try {
      const room = validateRoom(roomId) as JamoRoom;
      if (room.gameType !== 'jamo') {
        throw new Error('자모 게임방이 아닙니다.');
      }
      const isHost = room.host.id === sessionId;
      const player = isHost ? room.host : validatePlayer(room, sessionId);
      const trimmed = (message ?? '').trim();
      if (!trimmed) {
        throw new Error('메시지가 비어 있습니다.');
      }

      const entry = appendChatMessage(room, player, trimmed.slice(0, 200));
      io.to(room.roomId).emit('jamo_chat_message', entry);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('jamo_get_state', ({ roomId, sessionId }, callback) => {
    try {
      const room = validateRoom(roomId) as JamoRoom;
      if (room.gameType !== 'jamo') {
        throw new Error('자모 게임방이 아닙니다.');
      }
      if (room.host.id === sessionId) {
        room.host.socketId = socket.id;
      } else {
        validatePlayer(room, sessionId);
      }

      const isHostView = room.host.id === sessionId;
      const snapshot = buildJamoSnapshot(room, sessionId, isHostView);
      socket.emit('jamo_state_snapshot', snapshot);
      if (room.gameData.phase === 'result' && room.gameData.lastRoundResult) {
        socket.emit('jamo_round_result', room.gameData.lastRoundResult);
      }
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });
};

export default jamoGameHandler;
