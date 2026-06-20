import { Server } from 'socket.io';
import { rooms, timers } from '../state/gameState';
import { validatePlayer, validateRoom } from '../utils/validation';
import {
  advanceExpiredMurderMysteryDiscussionIfNeeded,
  appendMurderMysteryAnnouncement,
  buildMurderMysteryEndbookText,
  buildMurderMysteryRoleShareText,
  buildMurderMysterySnapshot,
  clearMurderMysteryRolePreferences,
  finalizeMurderMysteryVote,
  markMurderMysteryPhaseRead,
  moveMurderMysteryToNextPhase,
  reportMurderMysterySpecialEvent,
  resetMurderMysteryGame,
  resetMurderMysterySeatLayout,
  revealMurderMysteryOwnedClue,
  resolveMurderMysteryInvestigation,
  clearMurderMysteryInvestigationReservation,
  setMurderMysteryInvestigationReservation,
  startMurderMysteryGame,
  submitMurderMysteryEndingChoice,
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

const getFinalVoteAnnouncementText = (
  result: ReturnType<typeof finalizeMurderMysteryVote>,
  automatic = false
) => {
  if (result.voteOptionId === null) {
    return '최종 투표가 동률입니다. 재투표를 진행합니다.';
  }

  const prefix = automatic
    ? '최종 투표가 자동 집계되었습니다.'
    : '최종 투표가 집계되었습니다.';
  return result.matched
    ? `${prefix} 사건 지목은 정답입니다.`
    : `${prefix} 사건 지목은 오답입니다.`;
};

const clearMurderMysteryPhaseTimer = (roomId: string) => {
  if (!timers[roomId]) {
    return;
  }
  clearTimeout(timers[roomId]);
  delete timers[roomId];
};

const murderMysteryGameHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: ServerSocketType
) => {
  const emitMurderMysteryAnnouncementsSince = (
    room: ReturnType<typeof toMurderMysteryRoom>,
    startIndex: number
  ) => {
    room.gameData.announcements
      .slice(startIndex)
      .forEach((announcement) =>
        emitMurderMysteryAnnouncement(room, io, announcement)
      );
  };

  const scheduleMurderMysteryPhaseTimer = (roomId: string) => {
    clearMurderMysteryPhaseTimer(roomId);

    let room: ReturnType<typeof toMurderMysteryRoom>;
    try {
      room = toMurderMysteryRoom(validateRoom(roomId));
    } catch {
      return;
    }

    const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
    const announcementStartIndex = room.gameData.announcements.length;
    const advanced = advanceExpiredMurderMysteryDiscussionIfNeeded(
      room,
      scenario
    );
    if (advanced) {
      emitMurderMysteryAnnouncementsSince(room, announcementStartIndex);
      emitMurderMysterySnapshots(room, io);
      io.emit('room-updated', rooms);
    }

    const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
    if (currentStep?.kind !== 'discuss') {
      return;
    }

    const durationSec = room.gameData.phaseDurationSec;
    const startedAt = room.gameData.phaseStartedAt;
    if (!durationSec || !startedAt) {
      return;
    }

    const remainingMs = Math.max(
      durationSec * 1000 - (Date.now() - startedAt),
      0
    );
    timers[roomId] = setTimeout(() => {
      scheduleMurderMysteryPhaseTimer(roomId);
    }, remainingMs + 50);
  };

  const emitMurderMysterySnapshotsWithTimerSync = (
    room: ReturnType<typeof toMurderMysteryRoom>,
    scenario = getMurderMysteryScenario(room.gameData.scenarioId),
    options: { announcementStartIndex?: number } = {}
  ) => {
    const announcementStartIndex =
      options.announcementStartIndex ?? room.gameData.announcements.length;
    const advanced = advanceExpiredMurderMysteryDiscussionIfNeeded(
      room,
      scenario
    );
    emitMurderMysteryAnnouncementsSince(room, announcementStartIndex);
    emitMurderMysterySnapshots(room, io);
    scheduleMurderMysteryPhaseTimer(room.roomId);
    if (advanced) {
      io.emit('room-updated', rooms);
    }
    return advanced;
  };

  socket.on('mm_get_state', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      if (room.host.id === sessionId) {
        room.host.socketId = socket.id;
      } else {
        validatePlayer(room, sessionId);
      }

      socket.join(roomId);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
      const announcementStartIndex = room.gameData.announcements.length;
      const advanced = advanceExpiredMurderMysteryDiscussionIfNeeded(
        room,
        scenario
      );
      if (advanced) {
        emitMurderMysterySnapshotsWithTimerSync(room, scenario, {
          announcementStartIndex,
        });
      }
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

      const announcementStartIndex = room.gameData.announcements.length;
      startMurderMysteryGame(room, scenario);
      emitMurderMysterySnapshotsWithTimerSync(room, scenario, {
        announcementStartIndex,
      });
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
        emitMurderMysterySnapshotsWithTimerSync(room);
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
      emitMurderMysterySnapshotsWithTimerSync(room);
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

        submitMurderMysteryRolePreferences(room, scenario, sessionId, roleIds);

        emitMurderMysterySnapshotsWithTimerSync(room, scenario);
        io.emit('room-updated', rooms);
        return callback({ success: true });
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
      emitMurderMysterySnapshotsWithTimerSync(room);
      io.emit('room-updated', rooms);
      return callback({
        success: true,
        message: '캐릭터 선택 제출을 취소했습니다.',
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

      const announcementStartIndex = room.gameData.announcements.length;
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

      emitMurderMysterySnapshotsWithTimerSync(room, scenario, {
        announcementStartIndex,
      });
      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('mm_mark_role_sheet_read', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      validatePlayer(room, sessionId);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

      const announcementStartIndex = room.gameData.announcements.length;
      const result = markMurderMysteryPhaseRead(room, scenario, sessionId);

      emitMurderMysterySnapshotsWithTimerSync(room, scenario, {
        announcementStartIndex,
      });
      if (result.advanced) {
        io.emit('room-updated', rooms);
      }
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on('mm_mark_phase_read', ({ roomId, sessionId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      validatePlayer(room, sessionId);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

      const announcementStartIndex = room.gameData.announcements.length;
      const result = markMurderMysteryPhaseRead(room, scenario, sessionId);

      emitMurderMysterySnapshotsWithTimerSync(room, scenario, {
        announcementStartIndex,
      });
      if (result.advanced) {
        io.emit('room-updated', rooms);
      }
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
          [result, ...result.automaticResults].forEach((entry) => {
            entry.revealResult.revealedParts.forEach((part) => {
              emitMurderMysteryPartRevealed(room, io, {
                partId: part.id,
                partName: part.name,
                byPlayerId: entry.playerId,
                cardId: entry.cardId,
                revealedCount: room.gameData.revealedPartIds.length,
                totalCount: scenario.parts.length,
              });
            });
          });
        }

        emitMurderMysterySnapshotsWithTimerSync(room, scenario);
        if (result.phaseAdvanced) {
          io.emit('room-updated', rooms);
        }
        return callback({
          success: true,
          extraInvestigation:
            result.mode === 'auto' ? result.extraInvestigation : false,
          message:
            result.mode === 'auto' && result.extraInvestigation
              ? '전체공개 후 추가조사 카드입니다. 카드가 전체 공개되었고 추가 조사가 가능합니다.'
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
        emitMurderMysterySnapshotsWithTimerSync(room, scenario);
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
        emitMurderMysterySnapshotsWithTimerSync(room, scenario);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on('mm_reveal_my_clue', ({ roomId, sessionId, cardId }, callback) => {
    try {
      const room = toMurderMysteryRoom(validateRoom(roomId));
      validatePlayer(room, sessionId);
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

      const result = revealMurderMysteryOwnedClue(
        room,
        scenario,
        sessionId,
        cardId
      );

      result.revealedParts.forEach((part) => {
        emitMurderMysteryPartRevealed(room, io, {
          partId: part.id,
          partName: part.name,
          byPlayerId: sessionId,
          cardId: result.card.id,
          revealedCount: room.gameData.revealedPartIds.length,
          totalCount: scenario.parts.length,
        });
      });

      emitMurderMysterySnapshotsWithTimerSync(room, scenario);
      return callback({
        success: true,
        message: result.alreadyPublic
          ? '이미 전체 공개된 단서입니다.'
          : '단서를 전체 공개했습니다.',
      });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });

  socket.on(
    'mm_report_special_event',
    ({ roomId, sessionId, eventId, outcome }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        validatePlayer(room, sessionId);
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);

        const announcementStartIndex = room.gameData.announcements.length;
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

        emitMurderMysterySnapshotsWithTimerSync(room, scenario, {
          announcementStartIndex,
        });
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

        emitMurderMysterySnapshotsWithTimerSync(room, scenario);
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
            getFinalVoteAnnouncementText(result, true)
          );
          io.emit('room-updated', rooms);
        }

        emitMurderMysterySnapshotsWithTimerSync(room, scenario);
        return callback({ success: true });
      } catch (error) {
        return callback({ success: false, message: (error as Error).message });
      }
    }
  );

  socket.on(
    'mm_submit_ending_choice',
    ({ roomId, sessionId, choiceId, optionId }, callback) => {
      try {
        const room = toMurderMysteryRoom(validateRoom(roomId));
        const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
        validatePlayer(room, sessionId);

        submitMurderMysteryEndingChoice(
          room,
          scenario,
          sessionId,
          choiceId,
          optionId
        );

        emitMurderMysterySnapshotsWithTimerSync(room, scenario);
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

      const announcementStartIndex = room.gameData.announcements.length;
      const result = finalizeMurderMysteryVote(room, scenario);
      appendMurderMysteryAnnouncement(
        room,
        'SYSTEM',
        getFinalVoteAnnouncementText(result)
      );

      emitMurderMysterySnapshotsWithTimerSync(room, scenario, {
        announcementStartIndex,
      });
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
        currentStep.readAloud ?? scenario.intro.readAloud
      );
      emitMurderMysteryAnnouncement(room, io, announcement);
      emitMurderMysterySnapshotsWithTimerSync(room, scenario);
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

      const announcement = appendMurderMysteryAnnouncement(
        room,
        'ENDBOOK',
        buildMurderMysteryEndbookText(room, scenario)
      );
      emitMurderMysteryAnnouncement(room, io, announcement);
      emitMurderMysterySnapshotsWithTimerSync(room, scenario);
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
      const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
      resetMurderMysteryGame(room, room.gameData.scenarioId);

      clearMurderMysteryPhaseTimer(roomId);
      emitMurderMysterySnapshotsWithTimerSync(room, scenario);
      io.emit('room-updated', rooms);
      return callback({ success: true });
    } catch (error) {
      return callback({ success: false, message: (error as Error).message });
    }
  });
};

export default murderMysteryGameHandler;
