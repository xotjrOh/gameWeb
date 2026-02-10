import { Server } from 'socket.io';
import { rooms } from '../state/gameState';
import { validatePlayer, validateRoom } from '../utils/validation';
import {
  appendMurderMysteryAnnouncement,
  buildMurderMysterySnapshot,
  finalizeMurderMysteryVote,
  moveMurderMysteryToNextPhase,
  resetMurderMysteryGame,
  resolveMurderMysteryInvestigation,
  startMurderMysteryGame,
  submitMurderMysteryInvestigation,
  submitMurderMysteryVote,
} from '../services/murderMysteryStateMachine';
import {
  emitMurderMysteryAnnouncement,
  emitMurderMysteryPartRevealed,
  emitMurderMysterySnapshots,
} from '../services/murderMysteryBroadcast';
import { getMurderMysteryScenario } from '../services/murderMysteryScenarioService';
import {
  ensureAllowedPhase,
  ensureMurderMysteryHost,
  ensureScenarioPlayerCount,
  toMurderMysteryRoom,
} from '../services/murderMysteryValidation';
import {
  ClientToServerEvents,
  ServerSocketType,
  ServerToClientEvents,
} from '@/types/socket';

const murderMysteryGameHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: ServerSocketType
) => {
  socket.on('mm_get_state', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      if (room.host.id === sessionId) {
        room.host.socketId = socket.id;
      } else {
        validatePlayer(room, sessionId);
      }

      socket.join(roomId);
      const snapshot = buildMurderMysterySnapshot(
        room,
        sessionId,
        room.host.id === sessionId
      );
      socket.emit('mm_state_snapshot', snapshot);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('mm_host_start_game', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      ensureMurderMysteryHost(room, sessionId);
      ensureAllowedPhase(room, ['LOBBY']);

      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
      ensureScenarioPlayerCount(room, scenario);
      room.host.socketId = socket.id;

      startMurderMysteryGame(room, scenario);
      emitMurderMysterySnapshots(room, io);
      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('mm_host_next_phase', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      ensureMurderMysteryHost(room, sessionId);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
      room.host.socketId = socket.id;

      const { resolvedPending } = moveMurderMysteryToNextPhase(room, scenario);
      resolvedPending.forEach((resolved) => {
        resolved.revealResult.revealedParts.forEach((part) => {
          emitMurderMysteryPartRevealed(room, io, {
            part,
            byPlayerId: resolved.request.playerId,
            cardId: resolved.cardId,
          });
        });
      });

      emitMurderMysterySnapshots(room, io);
      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'mm_submit_investigation',
    ({ roomId, sessionId, targetId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        validatePlayer(room, sessionId);
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

        const result = submitMurderMysteryInvestigation(
          room,
          scenario,
          sessionId,
          targetId
        );

        if (result.mode === 'auto') {
          result.revealResult.revealedParts.forEach((part) => {
            emitMurderMysteryPartRevealed(room, io, {
              part,
              byPlayerId: sessionId,
              cardId: result.cardId,
            });
          });
        }

        emitMurderMysterySnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on(
    'mm_host_resolve_investigation',
    ({ roomId, sessionId, requestId, cardId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        ensureMurderMysteryHost(room, sessionId);
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
        room.host.socketId = socket.id;

        const resolved = resolveMurderMysteryInvestigation(
          room,
          scenario,
          requestId,
          cardId
        );
        resolved.revealResult.revealedParts.forEach((part) => {
          emitMurderMysteryPartRevealed(room, io, {
            part,
            byPlayerId: resolved.request.playerId,
            cardId: resolved.cardId,
          });
        });

        emitMurderMysterySnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on(
    'mm_submit_vote',
    ({ roomId, sessionId, suspectPlayerId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        validatePlayer(room, sessionId);
        submitMurderMysteryVote(room, sessionId, suspectPlayerId);
        emitMurderMysterySnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('mm_host_finalize_vote', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      ensureMurderMysteryHost(room, sessionId);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
      room.host.socketId = socket.id;

      const result = finalizeMurderMysteryVote(room, scenario);
      appendMurderMysteryAnnouncement(
        room,
        'SYSTEM',
        result.matched
          ? '최종 투표가 집계되었습니다. 사건 지목은 정답입니다.'
          : '최종 투표가 집계되었습니다. 사건 지목은 오답입니다.'
      );

      emitMurderMysterySnapshots(room, io);
      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('mm_host_broadcast_intro', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      ensureMurderMysteryHost(room, sessionId);
      ensureAllowedPhase(room, ['INTRO']);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

      const announcement = appendMurderMysteryAnnouncement(
        room,
        'INTRO',
        scenario.intro.readAloud
      );
      emitMurderMysteryAnnouncement(room, io, announcement);
      emitMurderMysterySnapshots(room, io);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('mm_host_broadcast_endbook', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      ensureMurderMysteryHost(room, sessionId);
      ensureAllowedPhase(room, ['ENDBOOK']);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

      const variant =
        room.gameData.endbookVariant === 'matched'
          ? scenario.endbook.variantMatched
          : scenario.endbook.variantNotMatched;
      const announcement = appendMurderMysteryAnnouncement(
        room,
        'ENDBOOK',
        `${scenario.endbook.common}\n${variant}\n${scenario.endbook.closingLine}`
      );
      emitMurderMysteryAnnouncement(room, io, announcement);
      emitMurderMysterySnapshots(room, io);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('mm_host_reset_game', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      ensureMurderMysteryHost(room, sessionId);
      room.host.socketId = socket.id;
      resetMurderMysteryGame(room, room.gameData.scenarioId);

      emitMurderMysterySnapshots(room, io);
      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });
};

export default murderMysteryGameHandler;
