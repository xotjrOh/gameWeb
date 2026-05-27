import { Server } from 'socket.io';
import { rooms } from '../state/gameState';
import { validatePlayer, validateRoom } from '../utils/validation';
import {
  appendMurderMysteryAnnouncement,
  buildMurderMysteryRoleShareText,
  buildMurderMysterySnapshot,
  clearMurderMysteryRolePreferences,
  finalizeMurderMysteryVote,
  moveMurderMysteryToNextPhase,
  reportMurderMysterySpecialEvent,
  resetMurderMysteryGame,
  resetMurderMysterySeatLayout,
  resolveMurderMysteryInvestigation,
  clearMurderMysteryInvestigationReservation,
  setMurderMysteryInvestigationReservation,
  startMurderMysteryGame,
  submitMurderMysteryInvestigation,
  submitMurderMysteryRolePreferences,
  submitMurderMysteryVote,
  updateMurderMysterySeatPosition,
} from '../services/murderMysteryStateMachine';
import {
  emitMurderMysteryAnnouncement,
  emitMurderMysteryPartRevealed,
  emitMurderMysterySnapshots,
} from '../services/murderMysteryBroadcast';
import { getMurderMysteryScenario } from '../services/murderMysteryScenarioService';
import {
  ensureAllowedPhase,
  getFlowStepByPhase,
  ensureMurderMysteryGameMaster,
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

  socket.on(
    'mm_host_get_role_share_text',
    ({ roomId, sessionId, roleId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        ensureMurderMysteryHost(room, sessionId);
        ensureAllowedPhase(room, ['LOBBY']);

        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
        const payload = buildMurderMysteryRoleShareText(room, scenario, roleId);

        return callback({
          success: true,
          title: payload.title,
          text: payload.text,
          linkPath: payload.linkPath,
        });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on(
    'mm_update_seat_position',
    ({ roomId, sessionId, playerId, position }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        validatePlayer(room, sessionId);

        updateMurderMysterySeatPosition(room, sessionId, playerId, position);
        emitMurderMysterySnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('mm_reset_seat_layout', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      ensureMurderMysteryHost(room, sessionId);

      resetMurderMysterySeatLayout(room);
      emitMurderMysterySnapshots(room, io);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'mm_submit_role_preferences',
    ({ roomId, sessionId, roleIds }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        validatePlayer(room, sessionId);
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

        const result = submitMurderMysteryRolePreferences(
          room,
          scenario,
          sessionId,
          roleIds
        );

        emitMurderMysterySnapshots(room, io);
        io.emit('room-updated', rooms);
        return callback({
          success: true,
          message: result.locked
            ? '모든 선호가 모여 캐릭터 배정이 완료되었습니다.'
            : '캐릭터 선호를 제출했습니다.',
        });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('mm_clear_role_preferences', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      validatePlayer(room, sessionId);

      clearMurderMysteryRolePreferences(room, sessionId);
      emitMurderMysterySnapshots(room, io);
      io.emit('room-updated', rooms);
      return callback({
        success: true,
        message: '캐릭터 선호 제출을 취소했습니다.',
      });
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
            partId: part.id,
            partName: part.name,
            byPlayerId: resolved.request.playerId,
            cardId: resolved.cardId,
            revealedCount: room.gameData.revealedPartIds.length,
            totalCount: scenario.parts.length,
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
    ({ roomId, sessionId, targetId, backId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        validatePlayer(room, sessionId);
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

        const result = submitMurderMysteryInvestigation(
          room,
          scenario,
          sessionId,
          {
            targetId,
            backId,
          }
        );

        if (result.mode === 'auto') {
          result.revealResult.revealedParts.forEach((part) => {
            emitMurderMysteryPartRevealed(room, io, {
              partId: part.id,
              partName: part.name,
              byPlayerId: sessionId,
              cardId: result.cardId,
              revealedCount: room.gameData.revealedPartIds.length,
              totalCount: scenario.parts.length,
            });
          });
        }

        emitMurderMysterySnapshots(room, io);
        return callback({
          success: true,
          extraInvestigation:
            result.mode === 'auto' ? result.extraInvestigation : false,
          message:
            result.mode === 'auto' && result.extraInvestigation
              ? '전체 공개 단서입니다. 추가 조사가 가능합니다.'
              : undefined,
        });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on(
    'mm_set_investigation_reservation',
    ({ roomId, sessionId, backId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        validatePlayer(room, sessionId);
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

        setMurderMysteryInvestigationReservation(
          room,
          scenario,
          sessionId,
          backId
        );
        emitMurderMysterySnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on(
    'mm_clear_investigation_reservation',
    ({ roomId, sessionId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        validatePlayer(room, sessionId);
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

        clearMurderMysteryInvestigationReservation(room, scenario, sessionId);
        emitMurderMysterySnapshots(room, io);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on(
    'mm_report_special_event',
    ({ roomId, sessionId, eventId, outcome }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        validatePlayer(room, sessionId);
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

        const result = reportMurderMysterySpecialEvent(
          room,
          scenario,
          sessionId,
          eventId,
          outcome
        );

        result.revealedParts.forEach((part) => {
          emitMurderMysteryPartRevealed(room, io, {
            partId: part.id,
            partName: part.name,
            byPlayerId: sessionId,
            cardId: result.card?.id ?? eventId,
            revealedCount: room.gameData.revealedPartIds.length,
            totalCount: scenario.parts.length,
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
    'mm_host_resolve_investigation',
    ({ roomId, sessionId, requestId, cardId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        ensureMurderMysteryGameMaster(room, sessionId);
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
            partId: part.id,
            partName: part.name,
            byPlayerId: resolved.request.playerId,
            cardId: resolved.cardId,
            revealedCount: room.gameData.revealedPartIds.length,
            totalCount: scenario.parts.length,
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
    ({ roomId, sessionId, voteOptionId, suspectPlayerId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
        validatePlayer(room, sessionId);
        submitMurderMysteryVote(
          room,
          scenario,
          sessionId,
          voteOptionId ?? suspectPlayerId
        );

        if (
          room.gameData.hostParticipatesAsPlayer &&
          Object.keys(room.gameData.voteByPlayerId).length ===
            room.players.length
        ) {
          const result = finalizeMurderMysteryVote(room, scenario);
          appendMurderMysteryAnnouncement(
            room,
            'SYSTEM',
            result.matched
              ? '최종 투표가 자동 집계되었습니다. 사건 지목은 정답입니다.'
              : '최종 투표가 자동 집계되었습니다. 사건 지목은 오답입니다.'
          );
          io.emit('room-updated', rooms);
        }

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
      ensureMurderMysteryGameMaster(room, sessionId);
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
      ensureMurderMysteryGameMaster(room, sessionId);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
      const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
      if (currentStep?.kind !== 'intro') {
        throw new Error('오프닝 단계에서만 실행할 수 있습니다.');
      }

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
      ensureMurderMysteryGameMaster(room, sessionId);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
      const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
      if (currentStep?.kind !== 'endbook') {
        throw new Error('엔딩 단계에서만 실행할 수 있습니다.');
      }

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
