import { GAME_STATUS } from '../utils/constants';
import { MurderMysteryRoom } from '@/types/room';
import {
  MurderMysteryAnnouncement,
  MurderMysteryCardScenario,
  MurderMysteryClueVaultCardView,
  MurderMysteryEndbookView,
  MurderMysteryFinalVoteResult,
  MurderMysteryGameData,
  MurderMysteryHostControlsView,
  MurderMysteryInvestigationBackCardView,
  MurderMysteryInvestigationMapView,
  MurderMysteryInvestigationRound,
  MurderMysteryInvestigationRoundView,
  MurderMysteryInvestigationTargetView,
  MurderMysteryInvestigationTurnPlayerView,
  MurderMysteryInvestigationTurnView,
  MurderMysteryPhase,
  MurderMysteryPartScenario,
  MurderMysteryPendingInvestigation,
  MurderMysteryRoleSheetView,
  MurderMysteryScenario,
  MurderMysterySeatPosition,
  MurderMysterySpecialEventOutcome,
  MurderMysteryStateSnapshot,
} from '@/types/murderMystery';
import {
  getFlowStepByPhase,
  getInvestigationRoundByPhase,
  getMurderMysteryPhaseOrder,
  getNextPhase,
} from './murderMysteryValidation';
import { getMurderMysteryScenario } from './murderMysteryScenarioService';

const pickRandom = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const shuffled = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const makeId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const clampSeatCoordinate = (value: number, min: number, max: number) =>
  Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

const normalizeSeatPosition = (
  position: MurderMysterySeatPosition
): MurderMysterySeatPosition => ({
  x: clampSeatCoordinate(position.x, 8, 92),
  y: clampSeatCoordinate(position.y, 10, 90),
});

const buildDefaultSeatPosition = (
  index: number,
  count: number
): MurderMysterySeatPosition => {
  const safeCount = Math.max(count, 1);
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / safeCount;
  return {
    x: 50 + Math.cos(angle) * 39,
    y: 50 + Math.sin(angle) * 32,
  };
};

const buildDefaultSeatLayout = (room: MurderMysteryRoom) =>
  room.players.reduce<Record<string, MurderMysterySeatPosition>>(
    (acc, player, index) => {
      acc[player.id] = normalizeSeatPosition(
        buildDefaultSeatPosition(index, room.players.length)
      );
      return acc;
    },
    {}
  );

const ensureMurderMysterySeatLayout = (room: MurderMysteryRoom) => {
  room.gameData.seatLayoutByPlayerId ??= {};
  const activePlayerIds = new Set(room.players.map((player) => player.id));

  Object.keys(room.gameData.seatLayoutByPlayerId).forEach((playerId) => {
    if (!activePlayerIds.has(playerId)) {
      delete room.gameData.seatLayoutByPlayerId[playerId];
    }
  });

  room.players.forEach((player, index) => {
    const current = room.gameData.seatLayoutByPlayerId[player.id];
    room.gameData.seatLayoutByPlayerId[player.id] = current
      ? normalizeSeatPosition(current)
      : normalizeSeatPosition(
          buildDefaultSeatPosition(index, room.players.length)
        );
  });

  return room.gameData.seatLayoutByPlayerId;
};

const getRoundConfig = (
  scenario: MurderMysteryScenario,
  round: MurderMysteryInvestigationRound
) => scenario.investigations.rounds.find((entry) => entry.round === round);

const getInvestigationRounds = (
  scenario: MurderMysteryScenario
): MurderMysteryInvestigationRound[] =>
  [...new Set(scenario.investigations.rounds.map((entry) => entry.round))].sort(
    (a, b) => a - b
  );

const getInvestigationsPerRound = (scenario: MurderMysteryScenario) =>
  Math.max(1, scenario.rules.investigationsPerRound || 1);

const buildInvestigationUsageTemplate = (
  scenario: MurderMysteryScenario
): Record<number, number> =>
  getInvestigationRounds(scenario).reduce<Record<number, number>>(
    (acc, round) => {
      acc[round] = 0;
      return acc;
    },
    {}
  );

const getInvestigationUseCount = (
  usage: Record<number, number | boolean | undefined>,
  round: MurderMysteryInvestigationRound,
  scenario: MurderMysteryScenario
) => {
  const used = usage[round];
  if (typeof used === 'number') {
    return Math.max(0, used);
  }
  if (used === true) {
    return getInvestigationsPerRound(scenario);
  }
  return 0;
};

const hasUsedAllInvestigations = (
  usage: Record<number, number | boolean | undefined>,
  round: MurderMysteryInvestigationRound,
  scenario: MurderMysteryScenario
) =>
  getInvestigationUseCount(usage, round, scenario) >=
  getInvestigationsPerRound(scenario);

const buildTargetCardKey = (targetId: string, cardId: string) =>
  `${targetId}::${cardId}`;

const splitTargetCardKey = (targetCardKey: string) => {
  const separatorIndex = targetCardKey.indexOf('::');
  if (separatorIndex < 0) {
    throw new Error('잘못된 조사 카드 키입니다.');
  }
  return {
    targetId: targetCardKey.slice(0, separatorIndex),
    cardId: targetCardKey.slice(separatorIndex + 2),
  };
};

const isMapInvestigationMode = (scenario: MurderMysteryScenario) =>
  Boolean(
    scenario.investigations.deliveryMode === 'auto' &&
      scenario.investigations.layout.map &&
      scenario.investigations.turnOrder?.roleIds.length
  );

const getRoleById = (scenario: MurderMysteryScenario, roleId: string) =>
  scenario.roles.find((role) => role.id === roleId);

const getCardById = (scenario: MurderMysteryScenario, cardId: string) =>
  scenario.cards.find((card) => card.id === cardId);

const getPartById = (scenario: MurderMysteryScenario, partId: string) =>
  scenario.parts.find((part) => part.id === partId);

const getSpecialEventById = (
  scenario: MurderMysteryScenario,
  eventId: string
) => scenario.specialEvents.find((event) => event.id === eventId);

const buildSpecialEventStatusTemplate = (
  scenario: MurderMysteryScenario
): MurderMysteryGameData['specialEventStatusById'] =>
  Object.fromEntries(
    scenario.specialEvents.map((event) => [event.id, 'pending' as const])
  );

const getPreferredBackId = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  targetId: string,
  cardId: string
) => {
  const card = getCardById(scenario, cardId);
  const preferred = card?.backId ?? makeId('mm_back');
  if (!room.gameData.investigationTargetCardKeyByBackId[preferred]) {
    return preferred;
  }
  return `${preferred}__${targetId}`;
};

const ensureInvestigationBackRegistry = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  scenario.investigations.rounds.forEach((roundConfig) => {
    roundConfig.targets.forEach((target) => {
      target.cardPool.forEach((cardId) => {
        const targetCardKey = buildTargetCardKey(target.id, cardId);
        if (room.gameData.investigationBackIdByTargetCardKey[targetCardKey]) {
          return;
        }
        const backId = getPreferredBackId(room, scenario, target.id, cardId);
        room.gameData.investigationBackIdByTargetCardKey[targetCardKey] =
          backId;
        room.gameData.investigationTargetCardKeyByBackId[backId] =
          targetCardKey;
      });
    });
  });
};

const resolveBackIdToTargetCard = (room: MurderMysteryRoom, backId: string) => {
  const targetCardKey =
    room.gameData.investigationTargetCardKeyByBackId[backId];
  if (!targetCardKey) {
    throw new Error('존재하지 않는 조사 카드 뒷면입니다.');
  }
  return splitTargetCardKey(targetCardKey);
};

const getBackIdForTargetCard = (
  room: MurderMysteryRoom,
  targetId: string,
  cardId: string
) =>
  room.gameData.investigationBackIdByTargetCardKey[
    buildTargetCardKey(targetId, cardId)
  ];

const getPhaseDurationSec = (
  scenario: MurderMysteryScenario,
  phase: MurderMysteryPhase
): number | null => getFlowStepByPhase(scenario, phase)?.durationSec ?? null;

const applyPhaseWithTimer = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  phase: MurderMysteryPhase
) => {
  room.gameData.phase = phase;
  room.gameData.phaseStartedAt = Date.now();
  room.gameData.phaseDurationSec = getPhaseDurationSec(scenario, phase);
};

const createInitialStateWithScenario = (
  scenario: MurderMysteryScenario,
  hostParticipatesAsPlayer: boolean
): MurderMysteryGameData => ({
  scenarioId: scenario.id,
  scenarioTitle: scenario.title,
  scenarioRoomDisplayName: scenario.roomDisplayName,
  hostParticipatesAsPlayer,
  phase: 'LOBBY',
  phaseStartedAt: null,
  phaseDurationSec: null,
  roleByPlayerId: {},
  roleDisplayNameByPlayerId: {},
  investigationUsedByPlayerId: {},
  investigationBackIdByTargetCardKey: {},
  investigationTargetCardKeyByBackId: {},
  investigationTurn: {
    round: null,
    orderedPlayerIds: [],
    currentPlayerIndex: -1,
    completedPlayerIds: [],
    turnStartedAt: null,
    reservationByPlayerId: {},
  },
  pendingInvestigations: [],
  privateCardIdsByPlayerId: {},
  revealedCardsByPlayerId: {},
  revealedCardIds: [],
  revealedCardIdsByTargetId: {},
  revealedPartIds: [],
  specialEventStatusById: buildSpecialEventStatusTemplate(scenario),
  voteByPlayerId: {},
  finalVoteResult: null,
  endbookVariant: null,
  announcements: [],
  appliedDynamicRuleIds: {},
  seatLayoutByPlayerId: {},
});

const ensureInvestigationUsageMap = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const usageTemplate = buildInvestigationUsageTemplate(scenario);
  room.players.forEach((player) => {
    const currentUsage = room.gameData.investigationUsedByPlayerId[
      player.id
    ] as Record<number, number | boolean | undefined> | undefined;
    room.gameData.investigationUsedByPlayerId[player.id] ??= {
      ...usageTemplate,
    };
    if (currentUsage) {
      room.gameData.investigationUsedByPlayerId[player.id] = Object.fromEntries(
        Object.keys(usageTemplate).map((roundKey) => {
          const round = Number(roundKey);
          return [
            roundKey,
            getInvestigationUseCount(currentUsage, round, scenario),
          ];
        })
      );
    }
    room.gameData.revealedCardsByPlayerId[player.id] ??= [];
  });
};

const clearInvestigationTurnState = (room: MurderMysteryRoom) => {
  room.gameData.investigationTurn = {
    round: null,
    orderedPlayerIds: [],
    currentPlayerIndex: -1,
    completedPlayerIds: [],
    turnStartedAt: null,
    reservationByPlayerId: {},
  };
};

const getCurrentTurnPlayerId = (room: MurderMysteryRoom) => {
  const { orderedPlayerIds, currentPlayerIndex } =
    room.gameData.investigationTurn;
  if (currentPlayerIndex < 0 || currentPlayerIndex >= orderedPlayerIds.length) {
    return null;
  }
  return orderedPlayerIds[currentPlayerIndex] ?? null;
};

const clearReservationForBackId = (
  room: MurderMysteryRoom,
  backId?: string
) => {
  if (!backId) {
    return;
  }
  room.gameData.investigationTurn.reservationByPlayerId = Object.fromEntries(
    Object.entries(
      room.gameData.investigationTurn.reservationByPlayerId
    ).filter(([, reservedBackId]) => reservedBackId !== backId)
  );
};

const getOrderedPlayerIdsForRound = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  round: MurderMysteryInvestigationRound
) => {
  const roleOrder = scenario.investigations.turnOrder?.roleIds ?? [];
  const roleOrderIndex = new Map(
    roleOrder.map((roleId, index) => [roleId, index] as const)
  );

  const orderedPlayers = room.players
    .map((player) => ({
      playerId: player.id,
      roleId: room.gameData.roleByPlayerId[player.id],
    }))
    .sort((a, b) => {
      const orderA =
        a.roleId && roleOrderIndex.has(a.roleId)
          ? (roleOrderIndex.get(a.roleId) as number)
          : Number.MAX_SAFE_INTEGER;
      const orderB =
        b.roleId && roleOrderIndex.has(b.roleId)
          ? (roleOrderIndex.get(b.roleId) as number)
          : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

  if (
    orderedPlayers.some(
      (entry) => !entry.roleId || !roleOrderIndex.has(entry.roleId)
    )
  ) {
    throw new Error('조사 턴 순서를 계산할 수 없는 역할 배정이 있습니다.');
  }

  const orderedPlayerIds = orderedPlayers.map((entry) => entry.playerId);
  if (orderedPlayerIds.length === 0) {
    return orderedPlayerIds;
  }

  if (!scenario.investigations.turnOrder?.rotateFirstPlayerEachRound) {
    return Array.from({ length: getInvestigationsPerRound(scenario) }).flatMap(
      () => orderedPlayerIds
    );
  }

  const rounds = getInvestigationRounds(scenario);
  const roundIndex = rounds.indexOf(round);
  if (roundIndex < 0) {
    return orderedPlayerIds;
  }
  const offset = roundIndex % orderedPlayerIds.length;
  const rotatedPlayerIds = [
    ...orderedPlayerIds.slice(offset),
    ...orderedPlayerIds.slice(0, offset),
  ];
  return Array.from({ length: getInvestigationsPerRound(scenario) }).flatMap(
    () => rotatedPlayerIds
  );
};

const initializeInvestigationTurnState = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  round: MurderMysteryInvestigationRound
) => {
  if (!isMapInvestigationMode(scenario)) {
    clearInvestigationTurnState(room);
    return;
  }

  const orderedPlayerIds = getOrderedPlayerIdsForRound(room, scenario, round);
  room.gameData.investigationTurn = {
    round,
    orderedPlayerIds,
    currentPlayerIndex: orderedPlayerIds.length > 0 ? 0 : -1,
    completedPlayerIds: [],
    turnStartedAt: orderedPlayerIds.length > 0 ? Date.now() : null,
    reservationByPlayerId: {},
  };
};

const advanceInvestigationTurnState = (
  room: MurderMysteryRoom,
  actingPlayerId: string,
  revealedBackId?: string
) => {
  const turn = room.gameData.investigationTurn;
  turn.completedPlayerIds.push(actingPlayerId);
  delete turn.reservationByPlayerId[actingPlayerId];
  clearReservationForBackId(room, revealedBackId);

  const nextIndex = turn.currentPlayerIndex + 1;
  turn.currentPlayerIndex = nextIndex;
  if (nextIndex >= turn.orderedPlayerIds.length) {
    turn.currentPlayerIndex = -1;
  }
  turn.turnStartedAt = turn.currentPlayerIndex >= 0 ? Date.now() : null;
};

const getNextRoundFirstPlayerId = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  round: MurderMysteryInvestigationRound | null
) => {
  if (!isMapInvestigationMode(scenario) || !round) {
    return null;
  }
  const rounds = getInvestigationRounds(scenario);
  const currentIndex = rounds.indexOf(round);
  const nextRound = rounds[currentIndex + 1];
  if (!nextRound) {
    return null;
  }
  const orderedPlayerIds = getOrderedPlayerIdsForRound(
    room,
    scenario,
    nextRound
  );
  return orderedPlayerIds[0] ?? null;
};

const applyRoleNameByRoleId = (
  room: MurderMysteryRoom,
  roleId: string,
  nextDisplayName: string
) => {
  let changed = false;
  room.players.forEach((player) => {
    if (room.gameData.roleByPlayerId[player.id] === roleId) {
      if (
        room.gameData.roleDisplayNameByPlayerId[player.id] !== nextDisplayName
      ) {
        room.gameData.roleDisplayNameByPlayerId[player.id] = nextDisplayName;
        changed = true;
      }
    }
  });
  return changed;
};

const applyDynamicDisplayNameRules = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  cardId: string,
  round: MurderMysteryInvestigationRound
) => {
  let changed = false;
  scenario.roles.forEach((role) => {
    role.dynamicDisplayNameRules?.forEach((rule, index) => {
      const ruleId =
        rule.id ??
        `${role.id}:${rule.trigger.cardId}:${rule.newDisplayName}:${index}`;
      if (room.gameData.appliedDynamicRuleIds[ruleId]) {
        return;
      }
      if (rule.trigger.type !== 'cardRevealed') {
        return;
      }
      if (rule.trigger.cardId !== cardId) {
        return;
      }
      if (rule.trigger.round && rule.trigger.round !== round) {
        return;
      }

      const updated = applyRoleNameByRoleId(room, role.id, rule.newDisplayName);
      room.gameData.appliedDynamicRuleIds[ruleId] = true;
      if (updated) {
        changed = true;
      }
    });
  });
  return changed;
};

const isCardRevealedForTarget = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  targetId: string,
  cardId: string
) => {
  if (scenario.investigations.depletionMode === 'global') {
    return room.gameData.revealedCardIds.includes(cardId);
  }
  return (room.gameData.revealedCardIdsByTargetId[targetId] ?? []).includes(
    cardId
  );
};

const getRemainingCardIdsByTarget = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  targetId: string,
  targetCardPool: string[]
) =>
  targetCardPool.filter(
    (cardId) => !isCardRevealedForTarget(room, scenario, targetId, cardId)
  );

const pickCardFromTarget = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  targetId: string,
  targetCardPool: string[],
  forcedCardId?: string
): string => {
  const remainingCardIds = getRemainingCardIdsByTarget(
    room,
    scenario,
    targetId,
    targetCardPool
  );

  if (forcedCardId) {
    if (!targetCardPool.includes(forcedCardId)) {
      throw new Error('이 조사 대상에서 선택할 수 없는 카드입니다.');
    }
    if (isCardRevealedForTarget(room, scenario, targetId, forcedCardId)) {
      throw new Error('이미 공개된 단서 카드는 다시 배포할 수 없습니다.');
    }
    return forcedCardId;
  }

  if (remainingCardIds.length === 0) {
    throw new Error('이 조사 대상의 단서는 이미 모두 공개되었습니다.');
  }

  return pickRandom(remainingCardIds);
};

const revealCardToPlayer = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  targetId: string,
  cardId: string,
  round: MurderMysteryInvestigationRound
): {
  card: MurderMysteryCardScenario;
  revealedParts: MurderMysteryPartScenario[];
  changedRoleName: boolean;
} => {
  const card = getCardById(scenario, cardId);
  if (!card) {
    throw new Error('존재하지 않는 단서 카드입니다.');
  }

  room.gameData.revealedCardsByPlayerId[playerId] ??= [];
  if (!room.gameData.revealedCardsByPlayerId[playerId].includes(cardId)) {
    room.gameData.revealedCardsByPlayerId[playerId].push(cardId);
  }

  if (!room.gameData.revealedCardIds.includes(cardId)) {
    room.gameData.revealedCardIds.push(cardId);
  }

  room.gameData.revealedCardIdsByTargetId[targetId] ??= [];
  if (!room.gameData.revealedCardIdsByTargetId[targetId].includes(cardId)) {
    room.gameData.revealedCardIdsByTargetId[targetId].push(cardId);
  }

  const revealedParts: MurderMysteryPartScenario[] = [];
  let changedRoleName = false;

  card.effects?.forEach((effect) => {
    if (effect.type === 'addPart') {
      if (!room.gameData.revealedPartIds.includes(effect.partId)) {
        room.gameData.revealedPartIds.push(effect.partId);
        const foundPart = getPartById(scenario, effect.partId);
        if (foundPart) {
          revealedParts.push(foundPart);
        }
      }
    }

    if (effect.type === 'revealRoleName') {
      const updated = applyRoleNameByRoleId(
        room,
        effect.roleId,
        effect.newDisplayName
      );
      if (updated) {
        changedRoleName = true;
      }
    }
  });

  const dynamicUpdated = applyDynamicDisplayNameRules(
    room,
    scenario,
    cardId,
    round
  );
  if (dynamicUpdated) {
    changedRoleName = true;
  }

  return {
    card,
    revealedParts,
    changedRoleName,
  };
};

const revealPublicCard = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  cardId: string
): {
  card: MurderMysteryCardScenario;
  revealedParts: MurderMysteryPartScenario[];
  changedRoleName: boolean;
} => {
  const card = getCardById(scenario, cardId);
  if (!card) {
    throw new Error('존재하지 않는 단서 카드입니다.');
  }

  if (!room.gameData.revealedCardIds.includes(cardId)) {
    room.gameData.revealedCardIds.push(cardId);
  }

  const revealedParts: MurderMysteryPartScenario[] = [];
  let changedRoleName = false;

  card.effects?.forEach((effect) => {
    if (effect.type === 'addPart') {
      if (!room.gameData.revealedPartIds.includes(effect.partId)) {
        room.gameData.revealedPartIds.push(effect.partId);
        const foundPart = getPartById(scenario, effect.partId);
        if (foundPart) {
          revealedParts.push(foundPart);
        }
      }
    }

    if (effect.type === 'revealRoleName') {
      const updated = applyRoleNameByRoleId(
        room,
        effect.roleId,
        effect.newDisplayName
      );
      if (updated) {
        changedRoleName = true;
      }
    }
  });

  return {
    card,
    revealedParts,
    changedRoleName,
  };
};

const resolvePendingRequestInternal = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  request: MurderMysteryPendingInvestigation,
  forcedCardId?: string
) => {
  const roundConfig = getRoundConfig(scenario, request.round);
  if (!roundConfig) {
    throw new Error('조사 라운드 설정을 찾을 수 없습니다.');
  }
  const target = roundConfig.targets.find(
    (entry) => entry.id === request.targetId
  );
  if (!target) {
    throw new Error('조사 대상을 찾을 수 없습니다.');
  }

  const cardId = pickCardFromTarget(
    room,
    scenario,
    target.id,
    target.cardPool,
    forcedCardId
  );

  const revealResult = revealCardToPlayer(
    room,
    scenario,
    request.playerId,
    target.id,
    cardId,
    request.round
  );

  return {
    request,
    target,
    cardId,
    revealResult,
  };
};

const getCardBackStyle = (
  scenario: MurderMysteryScenario,
  target: MurderMysteryScenario['investigations']['rounds'][number]['targets'][number],
  cardId: string
) => {
  const card = getCardById(scenario, cardId);
  return {
    imageSrc: card?.back?.imageSrc ?? target.cardBack?.imageSrc,
    shortLabel:
      card?.back?.shortLabel ?? target.cardBack?.shortLabel ?? target.label,
  };
};

const buildBackCardView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  viewerId: string,
  target: MurderMysteryScenario['investigations']['rounds'][number]['targets'][number],
  cardId: string
): MurderMysteryInvestigationBackCardView | null => {
  const backId = getBackIdForTargetCard(room, target.id, cardId);
  if (!backId) {
    return null;
  }
  const style = getCardBackStyle(scenario, target, cardId);
  return {
    backId,
    targetId: target.id,
    targetLabel: target.label,
    imageSrc: style.imageSrc,
    shortLabel: style.shortLabel,
    isReservedByMe:
      room.gameData.investigationTurn.reservationByPlayerId[viewerId] ===
      backId,
  };
};

const buildInvestigationTargetView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  viewerId: string,
  target: MurderMysteryScenario['investigations']['rounds'][number]['targets'][number]
): MurderMysteryInvestigationTargetView => {
  const remainingCardIds = getRemainingCardIdsByTarget(
    room,
    scenario,
    target.id,
    target.cardPool
  );
  const totalClues = target.cardPool.length;
  const remainingClues = remainingCardIds.length;
  const revealedClues = Math.max(totalClues - remainingClues, 0);
  const availableBacks = remainingCardIds
    .map((cardId) =>
      buildBackCardView(room, scenario, viewerId, target, cardId)
    )
    .filter(Boolean) as MurderMysteryInvestigationBackCardView[];

  return {
    ...target,
    totalClues,
    revealedClues,
    remainingClues,
    isExhausted: remainingClues === 0,
    availableBacks,
  };
};

const buildInvestigationRoundViews = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  viewerId: string
): MurderMysteryInvestigationRoundView[] =>
  scenario.investigations.rounds.map((roundConfig) => ({
    round: roundConfig.round,
    targets: roundConfig.targets.map((target) =>
      buildInvestigationTargetView(room, scenario, viewerId, target)
    ),
  }));

const buildInvestigationMapView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  viewerId: string,
  roundViews: MurderMysteryInvestigationRoundView[]
): MurderMysteryInvestigationMapView | null => {
  const map = scenario.investigations.layout.map;
  if (!map) {
    return null;
  }

  const targetById = Object.fromEntries(
    roundViews.flatMap((roundView) =>
      roundView.targets.map((target) => [target.id, target] as const)
    )
  );

  return {
    scene: map.scene,
    hotspots: map.hotspots
      .map((hotspot) => {
        const target = targetById[hotspot.targetId];
        if (!target) {
          return null;
        }
        return {
          ...hotspot,
          targetLabel: target.label,
          totalClues: target.totalClues,
          remainingClues: target.remainingClues,
          isExhausted: target.isExhausted,
          isCurrentTurnTarget:
            Boolean(
              room.gameData.investigationTurn.reservationByPlayerId[viewerId]
            ) && !target.isExhausted,
        };
      })
      .filter(Boolean) as MurderMysteryInvestigationMapView['hotspots'],
  };
};

const buildInvestigationTurnView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  viewerId: string
): MurderMysteryInvestigationTurnView | null => {
  if (!isMapInvestigationMode(scenario)) {
    return null;
  }

  const turn = room.gameData.investigationTurn;
  const currentPlayerId = getCurrentTurnPlayerId(room);
  const myReservationBackId = turn.reservationByPlayerId[viewerId];
  let myReservation: MurderMysteryInvestigationBackCardView | null = null;

  if (myReservationBackId) {
    try {
      const { targetId, cardId } = resolveBackIdToTargetCard(
        room,
        myReservationBackId
      );
      const target = scenario.investigations.rounds
        .flatMap((roundConfig) => roundConfig.targets)
        .find((entry) => entry.id === targetId);
      if (target) {
        myReservation = buildBackCardView(
          room,
          scenario,
          viewerId,
          target,
          cardId
        );
      }
    } catch (error) {
      myReservation = null;
    }
  }

  const players: MurderMysteryInvestigationTurnPlayerView[] =
    turn.orderedPlayerIds.map((playerId, index) => {
      const player = room.players.find((entry) => entry.id === playerId);
      const completedCount = turn.completedPlayerIds.filter(
        (completedPlayerId) => completedPlayerId === playerId
      ).length;
      const requiredCount = turn.orderedPlayerIds.filter(
        (orderedPlayerId) => orderedPlayerId === playerId
      ).length;
      return {
        playerId,
        roleId: room.gameData.roleByPlayerId[playerId] ?? '',
        name: player?.name ?? 'unknown',
        displayName:
          room.gameData.roleDisplayNameByPlayerId[playerId] ??
          player?.name ??
          'unknown',
        order: index + 1,
        isCurrent: currentPlayerId === playerId,
        isCompleted: completedCount >= requiredCount,
        completedCount,
        requiredCount,
      };
    });

  return {
    enabled: turn.round !== null,
    currentPlayerId,
    orderedPlayerIds: turn.orderedPlayerIds,
    completedPlayerIds: turn.completedPlayerIds,
    turnStartedAt: turn.turnStartedAt,
    nextRoundFirstPlayerId: getNextRoundFirstPlayerId(
      room,
      scenario,
      turn.round
    ),
    players,
    canActNow: viewerId === currentPlayerId,
    allPlayersDone:
      currentPlayerId === null && turn.orderedPlayerIds.length > 0,
    myReservation,
  };
};

const buildEndbookView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
): MurderMysteryEndbookView | null => {
  const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
  if (currentStep?.kind !== 'endbook') {
    return null;
  }
  const variant =
    room.gameData.endbookVariant === 'matched'
      ? scenario.endbook.variantMatched
      : scenario.endbook.variantNotMatched;
  return {
    common: scenario.endbook.common,
    variant,
    closingLine: scenario.endbook.closingLine,
  };
};

const buildHostControls = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
): MurderMysteryHostControlsView => {
  const cardsByPlayerId: Record<string, MurderMysteryCardScenario[]> = {};
  room.players.forEach((player) => {
    const cardIds = [
      ...(room.gameData.privateCardIdsByPlayerId[player.id] ?? []),
      ...(room.gameData.revealedCardsByPlayerId[player.id] ?? []),
    ];
    cardsByPlayerId[player.id] = cardIds
      .map((cardId) => getCardById(scenario, cardId))
      .filter(Boolean) as MurderMysteryCardScenario[];
  });

  return {
    pendingInvestigations: room.gameData.pendingInvestigations.map(
      (pending) => {
        const player = room.players.find(
          (entry) => entry.id === pending.playerId
        );
        const roundConfig = getRoundConfig(scenario, pending.round);
        const target = roundConfig?.targets.find(
          (entry) => entry.id === pending.targetId
        );
        const cardOptions = getRemainingCardIdsByTarget(
          room,
          scenario,
          pending.targetId,
          target?.cardPool ?? []
        )
          .map((cardId) => getCardById(scenario, cardId))
          .filter(Boolean) as MurderMysteryCardScenario[];

        return {
          requestId: pending.requestId,
          playerId: pending.playerId,
          playerName: player?.name ?? 'unknown',
          targetId: pending.targetId,
          targetLabel: target?.label ?? pending.targetId,
          round: pending.round,
          requestedAt: pending.requestedAt,
          cardOptions,
        };
      }
    ),
    roleAssignments: room.players.map((player) => {
      const roleId = room.gameData.roleByPlayerId[player.id] ?? '';
      const role = getRoleById(scenario, roleId);
      return {
        playerId: player.id,
        playerName: player.name,
        roleId,
        displayName:
          room.gameData.roleDisplayNameByPlayerId[player.id] ??
          role?.displayName ??
          player.name,
        secretText: role?.secretText ?? '',
      };
    }),
    cardsByPlayerId,
  };
};

const buildCardSourceMap = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
): Record<
  string,
  { sourceTargetIds: string[]; sourceTargetLabels: string[] }
> => {
  const sourceSetByCardId: Record<
    string,
    { targetIdSet: Set<string>; targetLabelSet: Set<string> }
  > = {};

  scenario.investigations.rounds.forEach((roundConfig) => {
    roundConfig.targets.forEach((target) => {
      const revealedForTarget =
        room.gameData.revealedCardIdsByTargetId[target.id] ?? [];
      revealedForTarget.forEach((cardId) => {
        sourceSetByCardId[cardId] ??= {
          targetIdSet: new Set<string>(),
          targetLabelSet: new Set<string>(),
        };
        sourceSetByCardId[cardId].targetIdSet.add(target.id);
        sourceSetByCardId[cardId].targetLabelSet.add(target.label);
      });
    });
  });

  if (Object.keys(sourceSetByCardId).length === 0) {
    room.gameData.revealedCardIds.forEach((cardId) => {
      scenario.investigations.rounds.forEach((roundConfig) => {
        roundConfig.targets.forEach((target) => {
          if (!target.cardPool.includes(cardId)) {
            return;
          }
          sourceSetByCardId[cardId] ??= {
            targetIdSet: new Set<string>(),
            targetLabelSet: new Set<string>(),
          };
          sourceSetByCardId[cardId].targetIdSet.add(target.id);
          sourceSetByCardId[cardId].targetLabelSet.add(target.label);
        });
      });
    });
  }

  const specialEventStatusById = room.gameData.specialEventStatusById ?? {};
  scenario.specialEvents.forEach((event) => {
    if (specialEventStatusById[event.id] !== 'revealed') {
      return;
    }
    sourceSetByCardId[event.revealCardId] ??= {
      targetIdSet: new Set<string>(),
      targetLabelSet: new Set<string>(),
    };
    sourceSetByCardId[event.revealCardId].targetIdSet.add(event.id);
    sourceSetByCardId[event.revealCardId].targetLabelSet.add(event.label);
  });

  return Object.fromEntries(
    Object.entries(sourceSetByCardId).map(([cardId, source]) => [
      cardId,
      {
        sourceTargetIds: [...source.targetIdSet],
        sourceTargetLabels: [...source.targetLabelSet],
      },
    ])
  );
};

const buildPrivateCardSourceLabelMap = (
  scenario: MurderMysteryScenario,
  roleId: string | null
): Record<string, string> => {
  if (!roleId) {
    return {};
  }

  return Object.fromEntries(
    scenario.initialRoleCards
      .filter((entry) => entry.roleId === roleId)
      .map(
        (entry) =>
          [entry.cardId, entry.sourceLabel ?? '개인 전달 카드'] as const
      )
  );
};

const buildClueVaultCards = (
  scenario: MurderMysteryScenario,
  cardIds: string[],
  cardSourceMap: Record<
    string,
    { sourceTargetIds: string[]; sourceTargetLabels: string[] }
  >,
  fallbackSourceLabelByCardId: Record<string, string> = {}
): MurderMysteryClueVaultCardView[] =>
  cardIds
    .map((cardId) => {
      const card = getCardById(scenario, cardId);
      if (!card) {
        return null;
      }

      const source = cardSourceMap[cardId] ?? {
        sourceTargetIds: [],
        sourceTargetLabels: [],
      };
      const fallbackSourceLabel = fallbackSourceLabelByCardId[cardId];
      const sourceTargetLabels =
        source.sourceTargetLabels.length > 0
          ? source.sourceTargetLabels
          : fallbackSourceLabel
            ? [fallbackSourceLabel]
            : [];

      return {
        ...card,
        sourceTargetIds: source.sourceTargetIds,
        sourceTargetLabels,
      };
    })
    .filter(Boolean) as MurderMysteryClueVaultCardView[];

export const createMurderMysteryGameData = (
  scenarioId?: string,
  hostParticipatesAsPlayer = false
): MurderMysteryGameData => {
  const scenario = getMurderMysteryScenario(scenarioId);
  return createInitialStateWithScenario(scenario, hostParticipatesAsPlayer);
};

export const resetMurderMysteryGame = (
  room: MurderMysteryRoom,
  scenarioId?: string
) => {
  const scenario = getMurderMysteryScenario(
    scenarioId ?? room.gameData.scenarioId
  );
  room.gameData = createInitialStateWithScenario(
    scenario,
    room.gameData.hostParticipatesAsPlayer
  );
  room.status = GAME_STATUS.PENDING;
};

export const updateMurderMysterySeatPosition = (
  room: MurderMysteryRoom,
  sessionId: string,
  playerId: string,
  position: MurderMysterySeatPosition
) => {
  if (room.gameData.phase !== 'LOBBY') {
    throw new Error('게임 시작 후에는 좌석을 변경할 수 없습니다.');
  }
  if (sessionId !== playerId) {
    throw new Error('자기 좌석만 이동할 수 있습니다.');
  }
  if (!room.players.some((player) => player.id === playerId)) {
    throw new Error('존재하지 않는 플레이어 좌석입니다.');
  }
  if (
    !position ||
    typeof position.x !== 'number' ||
    typeof position.y !== 'number'
  ) {
    throw new Error('잘못된 좌석 좌표입니다.');
  }

  ensureMurderMysterySeatLayout(room);
  room.gameData.seatLayoutByPlayerId[playerId] =
    normalizeSeatPosition(position);
};

export const resetMurderMysterySeatLayout = (room: MurderMysteryRoom) => {
  if (room.gameData.phase !== 'LOBBY') {
    throw new Error('게임 시작 후에는 좌석 배치를 초기화할 수 없습니다.');
  }
  room.gameData.seatLayoutByPlayerId = buildDefaultSeatLayout(room);
};

export const assignMurderMysteryRoles = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  if (room.players.length > scenario.roles.length) {
    throw new Error('참가자 수에 비해 역할 수가 부족합니다.');
  }

  const usageTemplate = buildInvestigationUsageTemplate(scenario);
  ensureInvestigationUsageMap(room, scenario);
  room.gameData.roleByPlayerId = {};
  room.gameData.roleDisplayNameByPlayerId = {};
  room.gameData.privateCardIdsByPlayerId = {};
  room.gameData.revealedCardsByPlayerId = {};

  const selectedRoles = shuffled(scenario.roles).slice(0, room.players.length);
  const shuffledPlayers = shuffled(room.players);

  shuffledPlayers.forEach((player, index) => {
    const role = selectedRoles[index];
    room.gameData.roleByPlayerId[player.id] = role.id;
    room.gameData.roleDisplayNameByPlayerId[player.id] = role.displayName;
    room.gameData.privateCardIdsByPlayerId[player.id] =
      scenario.initialRoleCards
        .filter((entry) => entry.roleId === role.id)
        .map((entry) => entry.cardId);
    room.gameData.revealedCardsByPlayerId[player.id] = [];
    room.gameData.investigationUsedByPlayerId[player.id] = {
      ...usageTemplate,
    };
  });
};

export const startMurderMysteryGame = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  ensureMurderMysterySeatLayout(room);
  assignMurderMysteryRoles(room, scenario);

  const firstStep = scenario.flow.steps[0];
  if (!firstStep) {
    throw new Error('진행 단계(flow.steps)가 정의되지 않았습니다.');
  }

  applyPhaseWithTimer(room, scenario, firstStep.id);
  room.gameData.pendingInvestigations = [];
  room.gameData.investigationBackIdByTargetCardKey = {};
  room.gameData.investigationTargetCardKeyByBackId = {};
  room.gameData.revealedCardIds = [];
  room.gameData.revealedCardIdsByTargetId = {};
  room.gameData.revealedPartIds = [];
  room.gameData.specialEventStatusById =
    buildSpecialEventStatusTemplate(scenario);
  room.gameData.voteByPlayerId = {};
  room.gameData.finalVoteResult = null;
  room.gameData.endbookVariant = null;
  room.gameData.appliedDynamicRuleIds = {};
  room.gameData.announcements = [];
  clearInvestigationTurnState(room);
  ensureInvestigationBackRegistry(room, scenario);

  const firstRound = getInvestigationRoundByPhase(firstStep.id, scenario);
  if (firstRound && isMapInvestigationMode(scenario)) {
    initializeInvestigationTurnState(room, scenario, firstRound);
  }

  if (firstStep.enterAnnouncement) {
    appendMurderMysteryAnnouncement(
      room,
      'SYSTEM',
      firstStep.enterAnnouncement
    );
  }

  room.status = GAME_STATUS.IN_PROGRESS;
};

export const appendMurderMysteryAnnouncement = (
  room: MurderMysteryRoom,
  type: MurderMysteryAnnouncement['type'],
  text: string
): MurderMysteryAnnouncement => {
  const announcement: MurderMysteryAnnouncement = {
    id: makeId('mm_announcement'),
    type,
    text,
    at: Date.now(),
  };
  room.gameData.announcements.push(announcement);
  return announcement;
};

export const resolveAllPendingInvestigations = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const pending = [...room.gameData.pendingInvestigations];
  const outputs: Array<{
    request: MurderMysteryPendingInvestigation;
    cardId: string;
    revealResult: {
      card: MurderMysteryCardScenario;
      revealedParts: MurderMysteryPartScenario[];
      changedRoleName: boolean;
    };
  }> = [];

  pending.forEach((request) => {
    const resolved = resolvePendingRequestInternal(room, scenario, request);
    outputs.push({
      request: resolved.request,
      cardId: resolved.cardId,
      revealResult: resolved.revealResult,
    });
  });

  room.gameData.pendingInvestigations = [];
  return outputs;
};

export const moveMurderMysteryToNextPhase = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const currentPhase = room.gameData.phase;

  if (currentPhase === 'LOBBY') {
    startMurderMysteryGame(room, scenario);
    return {
      resolvedPending: [] as ReturnType<typeof resolveAllPendingInvestigations>,
    };
  }

  const currentStep = getFlowStepByPhase(scenario, currentPhase);
  if (!currentStep) {
    throw new Error('현재 단계가 시나리오 진행 단계와 일치하지 않습니다.');
  }

  if (currentStep.kind === 'final_vote') {
    throw new Error('최종 투표 집계를 먼저 실행해주세요.');
  }
  if (currentStep.kind === 'endbook') {
    throw new Error('이미 엔딩북 단계입니다.');
  }

  let resolvedPending: ReturnType<typeof resolveAllPendingInvestigations> = [];
  if (
    currentStep.kind === 'investigate' &&
    room.gameData.pendingInvestigations.length > 0
  ) {
    resolvedPending = resolveAllPendingInvestigations(room, scenario);
  }
  if (currentStep.kind === 'investigate') {
    clearInvestigationTurnState(room);
  }

  const nextPhase = getNextPhase(currentPhase, scenario);
  if (!nextPhase) {
    throw new Error('다음 단계로 이동할 수 없습니다.');
  }

  applyPhaseWithTimer(room, scenario, nextPhase);

  const nextStep = getFlowStepByPhase(scenario, nextPhase);
  if (nextStep?.kind === 'final_vote') {
    room.gameData.voteByPlayerId = {};
    room.gameData.finalVoteResult = null;
  }
  if (nextStep?.kind === 'investigate' && nextStep.round) {
    initializeInvestigationTurnState(room, scenario, nextStep.round);
  }
  if (nextStep?.enterAnnouncement) {
    appendMurderMysteryAnnouncement(room, 'SYSTEM', nextStep.enterAnnouncement);
  }

  room.status =
    nextStep?.kind === 'endbook'
      ? GAME_STATUS.PENDING
      : GAME_STATUS.IN_PROGRESS;

  return { resolvedPending };
};

export const submitMurderMysteryInvestigation = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  selection: {
    targetId?: string;
    backId?: string;
  }
) => {
  const round = getInvestigationRoundByPhase(room.gameData.phase, scenario);
  if (!round) {
    throw new Error('지금은 조사 단계가 아닙니다.');
  }

  const usageTemplate = buildInvestigationUsageTemplate(scenario);
  const usage = room.gameData.investigationUsedByPlayerId[playerId] ?? {
    ...usageTemplate,
  };
  const normalizedUsage = usage as Record<number, number | boolean | undefined>;

  if (hasUsedAllInvestigations(normalizedUsage, round, scenario)) {
    throw new Error('이번 라운드 조사 기회를 이미 사용했습니다.');
  }

  const roundConfig = getRoundConfig(scenario, round);
  if (!roundConfig) {
    throw new Error('조사 라운드 설정을 찾을 수 없습니다.');
  }

  if (isMapInvestigationMode(scenario)) {
    const backId = selection.backId;
    if (!backId) {
      throw new Error('맵에서 가져갈 카드 뒷면을 선택해주세요.');
    }

    ensureInvestigationBackRegistry(room, scenario);
    if (room.gameData.investigationTurn.round !== round) {
      initializeInvestigationTurnState(room, scenario, round);
    }

    const currentPlayerId = getCurrentTurnPlayerId(room);
    if (!currentPlayerId) {
      throw new Error('이번 라운드 조사 차례가 모두 끝났습니다.');
    }
    if (currentPlayerId !== playerId) {
      throw new Error('현재 조사 차례가 아닙니다.');
    }

    const { targetId, cardId } = resolveBackIdToTargetCard(room, backId);
    const target = roundConfig.targets.find((entry) => entry.id === targetId);
    if (!target || !target.cardPool.includes(cardId)) {
      throw new Error('이 라운드에서 선택할 수 없는 조사 카드입니다.');
    }
    if (isCardRevealedForTarget(room, scenario, target.id, cardId)) {
      throw new Error('이미 다른 플레이어가 먼저 가져간 카드입니다.');
    }

    room.gameData.investigationUsedByPlayerId[playerId] = {
      ...usage,
      [round]: getInvestigationUseCount(normalizedUsage, round, scenario) + 1,
    };

    const revealResult = revealCardToPlayer(
      room,
      scenario,
      playerId,
      target.id,
      cardId,
      round
    );
    advanceInvestigationTurnState(room, playerId, backId);

    return {
      mode: 'auto' as const,
      cardId,
      backId,
      target,
      revealResult,
    };
  }

  const targetId = selection.targetId;
  if (!targetId) {
    throw new Error('조사 대상을 선택해주세요.');
  }

  const target = roundConfig.targets.find((entry) => entry.id === targetId);
  if (!target) {
    throw new Error('존재하지 않는 조사 대상입니다.');
  }

  const remainingCards = getRemainingCardIdsByTarget(
    room,
    scenario,
    target.id,
    target.cardPool
  );

  if (remainingCards.length === 0) {
    throw new Error('이 조사 대상은 이미 단서가 모두 공개되었습니다.');
  }

  if (scenario.investigations.deliveryMode === 'manual') {
    const pendingCountForTarget = room.gameData.pendingInvestigations.filter(
      (pending) => pending.round === round && pending.targetId === target.id
    ).length;

    if (pendingCountForTarget >= remainingCards.length) {
      throw new Error(
        '이 조사 대상은 대기 중인 공개 요청으로 인해 남은 단서가 없습니다.'
      );
    }
  }

  room.gameData.investigationUsedByPlayerId[playerId] = {
    ...usage,
    [round]: getInvestigationUseCount(normalizedUsage, round, scenario) + 1,
  };

  if (scenario.investigations.deliveryMode === 'manual') {
    const request: MurderMysteryPendingInvestigation = {
      requestId: makeId('mm_req'),
      playerId,
      targetId: target.id,
      round,
      requestedAt: Date.now(),
    };
    room.gameData.pendingInvestigations.push(request);
    return {
      mode: 'manual' as const,
      request,
    };
  }

  const cardId = pickCardFromTarget(room, scenario, target.id, target.cardPool);

  const revealResult = revealCardToPlayer(
    room,
    scenario,
    playerId,
    target.id,
    cardId,
    round
  );

  return {
    mode: 'auto' as const,
    cardId,
    target,
    revealResult,
  };
};

export const setMurderMysteryInvestigationReservation = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  backId: string
) => {
  const round = getInvestigationRoundByPhase(room.gameData.phase, scenario);
  if (!round || !isMapInvestigationMode(scenario)) {
    throw new Error('지금은 예약 가능한 조사 단계가 아닙니다.');
  }

  ensureInvestigationBackRegistry(room, scenario);
  if (room.gameData.investigationTurn.round !== round) {
    initializeInvestigationTurnState(room, scenario, round);
  }

  const usageTemplate = buildInvestigationUsageTemplate(scenario);
  const usage = room.gameData.investigationUsedByPlayerId[playerId] ?? {
    ...usageTemplate,
  };
  if (
    hasUsedAllInvestigations(
      usage as Record<number, number | boolean | undefined>,
      round,
      scenario
    )
  ) {
    throw new Error('이번 라운드 조사를 이미 완료했습니다.');
  }

  const { targetId, cardId } = resolveBackIdToTargetCard(room, backId);
  const roundConfig = getRoundConfig(scenario, round);
  const target = roundConfig?.targets.find((entry) => entry.id === targetId);
  if (!target || !target.cardPool.includes(cardId)) {
    throw new Error('이 라운드에서 예약할 수 없는 카드입니다.');
  }
  if (isCardRevealedForTarget(room, scenario, targetId, cardId)) {
    throw new Error('이미 다른 플레이어가 먼저 가져간 카드입니다.');
  }

  room.gameData.investigationTurn.reservationByPlayerId[playerId] = backId;
};

export const clearMurderMysteryInvestigationReservation = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string
) => {
  if (!isMapInvestigationMode(scenario)) {
    return;
  }
  delete room.gameData.investigationTurn.reservationByPlayerId[playerId];
};

export const resolveMurderMysteryInvestigation = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  requestId: string,
  forcedCardId?: string
) => {
  const request = room.gameData.pendingInvestigations.find(
    (entry) => entry.requestId === requestId
  );
  if (!request) {
    throw new Error('처리할 조사 요청이 없습니다.');
  }

  const resolved = resolvePendingRequestInternal(
    room,
    scenario,
    request,
    forcedCardId
  );

  room.gameData.pendingInvestigations =
    room.gameData.pendingInvestigations.filter(
      (entry) => entry.requestId !== requestId
    );

  return {
    request: resolved.request,
    target: resolved.target,
    cardId: resolved.cardId,
    revealResult: resolved.revealResult,
  };
};

export const reportMurderMysterySpecialEvent = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  eventId: string,
  outcome: MurderMysterySpecialEventOutcome
) => {
  const event = getSpecialEventById(scenario, eventId);
  if (!event) {
    throw new Error('존재하지 않는 특수 이벤트입니다.');
  }

  if (outcome !== 'reveal' && outcome !== 'seal') {
    throw new Error('지원하지 않는 특수 이벤트 처리입니다.');
  }

  const roleId = room.gameData.roleByPlayerId[playerId];
  if (!roleId || !event.reporterRoleIds.includes(roleId)) {
    throw new Error('이 특수 이벤트를 신고할 수 없는 역할입니다.');
  }

  room.gameData.specialEventStatusById ??=
    buildSpecialEventStatusTemplate(scenario);
  const status = room.gameData.specialEventStatusById[event.id] ?? 'pending';
  if (status !== 'pending') {
    throw new Error('이미 처리된 특수 이벤트입니다.');
  }

  if (outcome === 'seal') {
    room.gameData.specialEventStatusById[event.id] = 'sealed';
    appendMurderMysteryAnnouncement(
      room,
      'SYSTEM',
      event.sealAnnouncement ?? `${event.label} 조건이 실패 처리되었습니다.`
    );
    return {
      outcome,
      card: null,
      revealedParts: [] as MurderMysteryPartScenario[],
      changedRoleName: false,
    };
  }

  room.gameData.specialEventStatusById[event.id] = 'revealed';
  const revealResult = revealPublicCard(room, scenario, event.revealCardId);
  appendMurderMysteryAnnouncement(
    room,
    'SYSTEM',
    event.revealAnnouncement ?? `${event.label} 카드가 전체 공개되었습니다.`
  );

  return {
    outcome,
    card: revealResult.card,
    revealedParts: revealResult.revealedParts,
    changedRoleName: revealResult.changedRoleName,
  };
};

export const submitMurderMysteryVote = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  selectedVoteId?: string
) => {
  const step = getFlowStepByPhase(scenario, room.gameData.phase);
  if (step?.kind !== 'final_vote') {
    throw new Error('지금은 최종 투표 단계가 아닙니다.');
  }

  const voteOptionId = resolveFinalVoteOptionId(room, scenario, selectedVoteId);

  room.gameData.voteByPlayerId[playerId] = voteOptionId;
};

const resolveFinalVoteOptionId = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  selectedVoteId?: string
) => {
  if (!selectedVoteId) {
    throw new Error('지목 대상을 선택해주세요.');
  }

  const option = scenario.finalVote.options.find(
    (entry) => entry.id === selectedVoteId
  );
  if (option) {
    return option.id;
  }

  const legacyPlayer = room.players.find(
    (player) => player.id === selectedVoteId
  );
  const legacyRoleId = legacyPlayer
    ? room.gameData.roleByPlayerId[legacyPlayer.id]
    : selectedVoteId;
  const roleOption = scenario.finalVote.options.find(
    (entry) => entry.optionType === 'role' && entry.roleId === legacyRoleId
  );
  if (roleOption) {
    return roleOption.id;
  }

  throw new Error('지목한 투표 후보를 찾을 수 없습니다.');
};

const getVoteOptionPlayerId = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  voteOptionId: string | null
) => {
  if (!voteOptionId) {
    return null;
  }
  const option = scenario.finalVote.options.find(
    (entry) => entry.id === voteOptionId
  );
  if (option?.optionType !== 'role' || !option.roleId) {
    return null;
  }
  return (
    room.players.find(
      (player) => room.gameData.roleByPlayerId[player.id] === option.roleId
    )?.id ?? null
  );
};

export const finalizeMurderMysteryVote = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
): MurderMysteryFinalVoteResult => {
  const step = getFlowStepByPhase(scenario, room.gameData.phase);
  if (step?.kind !== 'final_vote') {
    throw new Error('최종 투표 단계에서만 집계할 수 있습니다.');
  }

  const tally: Record<string, number> = {};
  Object.values(room.gameData.voteByPlayerId).forEach((selectedVoteId) => {
    const voteOptionId = resolveFinalVoteOptionId(
      room,
      scenario,
      selectedVoteId
    );
    tally[voteOptionId] = (tally[voteOptionId] ?? 0) + 1;
  });

  const tallyEntries = Object.entries(tally);
  const maxVoteCount = tallyEntries.reduce(
    (max, [, count]) => Math.max(max, count),
    0
  );
  const topEntries = tallyEntries.filter(([, count]) => count === maxVoteCount);
  const voteOptionId = topEntries.length === 1 ? topEntries[0][0] : null;
  const suspectPlayerId = getVoteOptionPlayerId(room, scenario, voteOptionId);
  const matched = Boolean(
    voteOptionId && voteOptionId === scenario.finalVote.correctOptionId
  );

  const result: MurderMysteryFinalVoteResult = {
    voteOptionId,
    suspectPlayerId,
    matched,
    tally,
  };

  room.gameData.finalVoteResult = result;
  room.gameData.endbookVariant = matched ? 'matched' : 'notMatched';

  const endbookStep = scenario.flow.steps.find(
    (flowStep) => flowStep.kind === 'endbook'
  );
  if (!endbookStep) {
    throw new Error('엔딩 단계(flow.endbook)가 정의되지 않았습니다.');
  }

  applyPhaseWithTimer(room, scenario, endbookStep.id);
  if (endbookStep.enterAnnouncement) {
    appendMurderMysteryAnnouncement(
      room,
      'SYSTEM',
      endbookStep.enterAnnouncement
    );
  }

  room.status = GAME_STATUS.PENDING;
  return result;
};

export const buildMurderMysterySnapshot = (
  room: MurderMysteryRoom,
  viewerId: string,
  isHostView: boolean
): MurderMysteryStateSnapshot => {
  const canUseHostGameMasterControls =
    isHostView && !room.gameData.hostParticipatesAsPlayer;
  const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
  const canSeePartDetails =
    canUseHostGameMasterControls || scenario.rules.partsPublicDetail;
  const seatLayoutByPlayerId = ensureMurderMysterySeatLayout(room);
  const player = room.players.find((entry) => entry.id === viewerId) ?? null;
  const roleId = player
    ? (room.gameData.roleByPlayerId[player.id] ?? null)
    : null;
  const role = roleId ? (getRoleById(scenario, roleId) ?? null) : null;

  const roleSheet: MurderMysteryRoleSheetView | null = role
    ? {
        roleId: role.id,
        displayName:
          room.gameData.roleDisplayNameByPlayerId[viewerId] ?? role.displayName,
        publicText: role.publicText,
        secretText: role.secretText,
      }
    : null;

  const privateCardIds = player
    ? (room.gameData.privateCardIdsByPlayerId[player.id] ?? [])
    : [];
  const revealedPersonalCardIds = player
    ? (room.gameData.revealedCardsByPlayerId[player.id] ?? [])
    : [];
  const myCardIds = [...privateCardIds, ...revealedPersonalCardIds];
  const myCards = myCardIds
    .map((cardId) => getCardById(scenario, cardId))
    .filter(Boolean) as MurderMysteryCardScenario[];

  const cardSourceMap = buildCardSourceMap(room, scenario);
  const privateCardSourceLabelMap = buildPrivateCardSourceLabelMap(
    scenario,
    roleId
  );
  const clueVaultMyClues = buildClueVaultCards(
    scenario,
    myCardIds,
    cardSourceMap,
    privateCardSourceLabelMap
  );
  const clueVaultPublicClues = buildClueVaultCards(
    scenario,
    room.gameData.revealedCardIds,
    cardSourceMap
  );
  const specialEventStatusById = room.gameData.specialEventStatusById ?? {};
  const reportableSpecialEvents = roleId
    ? scenario.specialEvents
        .filter((event) => event.reporterRoleIds.includes(roleId))
        .filter(
          (event) =>
            (specialEventStatusById[event.id] ?? 'pending') === 'pending'
        )
        .map((event) => ({
          id: event.id,
          label: event.label,
          description: event.description,
        }))
    : [];

  const round = getInvestigationRoundByPhase(room.gameData.phase, scenario);
  const roundViews = buildInvestigationRoundViews(room, scenario, viewerId);
  const mapView = buildInvestigationMapView(
    room,
    scenario,
    viewerId,
    roundViews
  );
  const turnView = buildInvestigationTurnView(room, scenario, viewerId);

  const timerDurationSec = room.gameData.phaseDurationSec;
  const timerStartedAt = room.gameData.phaseStartedAt;
  const timerElapsedSec =
    timerDurationSec && timerStartedAt
      ? Math.floor((Date.now() - timerStartedAt) / 1000)
      : null;
  const timerRemainingSec =
    timerDurationSec && timerElapsedSec !== null
      ? Math.max(timerDurationSec - timerElapsedSec, 0)
      : null;

  const usageTemplate = buildInvestigationUsageTemplate(scenario);
  const usage = player
    ? (room.gameData.investigationUsedByPlayerId[player.id] ?? {
        ...usageTemplate,
      })
    : { ...usageTemplate };
  const usedCount = round
    ? getInvestigationUseCount(
        usage as Record<number, number | boolean | undefined>,
        round,
        scenario
      )
    : 0;
  const limitPerRound = getInvestigationsPerRound(scenario);

  return {
    roomId: room.roomId,
    scenario: {
      id: scenario.id,
      title: scenario.title,
      roomDisplayName: scenario.roomDisplayName,
      intro: scenario.intro,
      rules: {
        partsPublicDetail: scenario.rules.partsPublicDetail,
      },
      flow: scenario.flow,
      parts: canSeePartDetails ? scenario.parts : [],
      investigations: scenario.investigations,
      finalVote: scenario.finalVote,
      endbook: scenario.endbook,
    },
    specialEvents: reportableSpecialEvents,
    seatLayoutByPlayerId,
    phase: room.gameData.phase,
    phaseOrder: getMurderMysteryPhaseOrder(scenario),
    players: room.players.map((entry) => {
      const entryRoleId = room.gameData.roleByPlayerId[entry.id] ?? null;
      const entryRole = entryRoleId
        ? (getRoleById(scenario, entryRoleId) ?? null)
        : null;
      return {
        id: entry.id,
        name: entry.name,
        socketId: entry.socketId,
        displayName:
          room.gameData.roleDisplayNameByPlayerId[entry.id] ??
          entryRole?.displayName ??
          entry.name,
        roleId: entryRoleId,
        roleDisplayName:
          room.gameData.roleDisplayNameByPlayerId[entry.id] ??
          entryRole?.displayName ??
          null,
        rolePublicText: entryRole?.publicText ?? null,
        statusText:
          (entry as { statusText?: '감시' | '격리' | '결박' }).statusText ??
          '감시',
        publicRevealedClues: buildClueVaultCards(
          scenario,
          room.gameData.revealedCardsByPlayerId[entry.id] ?? [],
          cardSourceMap
        ),
      };
    }),
    roleSheet,
    myCards,
    clueVault: {
      myClues: clueVaultMyClues,
      publicClues: clueVaultPublicClues,
    },
    partsBoard: {
      totalCount: scenario.parts.length,
      revealedCount: room.gameData.revealedPartIds.length,
      revealedPartIds: room.gameData.revealedPartIds,
      parts: canSeePartDetails ? scenario.parts : undefined,
    },
    announcements: room.gameData.announcements,
    phaseTimer: {
      durationSec: timerDurationSec,
      startedAt: timerStartedAt,
      remainingSec: timerRemainingSec,
      isExpired: timerRemainingSec === 0 && timerDurationSec !== null,
    },
    investigation: {
      round,
      revealedCardIds: room.gameData.revealedCardIds,
      revealedCardIdsByTargetId: room.gameData.revealedCardIdsByTargetId,
      layoutSections: scenario.investigations.layout.sections,
      used: round ? usedCount >= limitPerRound : false,
      usedCount,
      limitPerRound,
      mode: mapView ? 'map' : 'legacy',
      rounds: roundViews,
      turn: turnView,
      map: mapView,
    },
    finalVote: {
      question: scenario.finalVote.question,
      options: scenario.finalVote.options,
      totalVoters: room.players.length,
      submittedVoters: Object.keys(room.gameData.voteByPlayerId).length,
      yourVote: player
        ? (room.gameData.voteByPlayerId[player.id] ?? null)
        : null,
      votes:
        canUseHostGameMasterControls || room.gameData.finalVoteResult
          ? room.gameData.voteByPlayerId
          : {},
      result: room.gameData.finalVoteResult,
    },
    endbook: buildEndbookView(room, scenario),
    isHostView,
    hostParticipation: {
      hostParticipatesAsPlayer: room.gameData.hostParticipatesAsPlayer,
      playerCountIncludesHost: room.gameData.hostParticipatesAsPlayer,
      currentPlayerCount: room.players.length,
      requiredPlayerCount: room.maxPlayers,
    },
    canUseHostGameMasterControls,
    hostControls: canUseHostGameMasterControls
      ? buildHostControls(room, scenario)
      : undefined,
  };
};
