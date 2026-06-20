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
  MurderMysteryInvestigationPlayerProgressView,
  MurderMysteryInvestigationRound,
  MurderMysteryInvestigationRoundView,
  MurderMysteryInvestigationTargetView,
  MurderMysteryInvestigationTurnPlayerView,
  MurderMysteryInvestigationTurnView,
  MurderMysteryPhase,
  MurderMysteryPartScenario,
  MurderMysteryPendingInvestigation,
  MurderMysteryPublicScriptView,
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
import { createMurderMysteryPreReadToken } from '@/lib/murderMysteryPreReadToken';

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

const KAKAO_TEXT_TEMPLATE_LIMIT = 200;

const fitKakaoTextTemplate = (text: string) =>
  text.length > KAKAO_TEXT_TEMPLATE_LIMIT
    ? `${text.slice(0, KAKAO_TEXT_TEMPLATE_LIMIT - 3)}...`
    : text;

const clampSeatCoordinate = (value: number, min: number, max: number) =>
  Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

const normalizeSeatPosition = (
  position: MurderMysterySeatPosition
): MurderMysterySeatPosition => ({
  x: clampSeatCoordinate(position.x, 8, 92),
  y: clampSeatCoordinate(position.y, 10, 90),
});

const RECTANGULAR_SEAT_POSITIONS: MurderMysterySeatPosition[] = [
  { x: 50, y: 18 },
  { x: 24, y: 82 },
  { x: 76, y: 82 },
  { x: 24, y: 18 },
  { x: 76, y: 18 },
  { x: 50, y: 88 },
];

const buildDefaultSeatPosition = (
  index: number,
  count: number
): MurderMysterySeatPosition => {
  if (count <= RECTANGULAR_SEAT_POSITIONS.length) {
    return RECTANGULAR_SEAT_POSITIONS[index] ?? RECTANGULAR_SEAT_POSITIONS[0];
  }

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

const ensureRoleReadingReadyMap = (room: MurderMysteryRoom) => {
  room.gameData.roleReadingReadyByPlayerId ??= {};
  const activePlayerIds = new Set(room.players.map((player) => player.id));

  Object.keys(room.gameData.roleReadingReadyByPlayerId).forEach((playerId) => {
    if (!activePlayerIds.has(playerId)) {
      delete room.gameData.roleReadingReadyByPlayerId[playerId];
    }
  });

  return room.gameData.roleReadingReadyByPlayerId;
};

const areAllRoleSheetsRead = (room: MurderMysteryRoom) => {
  const readyByPlayerId = ensureRoleReadingReadyMap(room);
  return (
    room.players.length > 0 &&
    room.players.every((player) => Boolean(readyByPlayerId[player.id]))
  );
};

const getFlowStepReadAloud = (
  scenario: MurderMysteryScenario,
  stepId: MurderMysteryPhase
) => {
  const step = getFlowStepByPhase(scenario, stepId);
  if (!step) {
    return '';
  }
  return (
    step.readAloud ?? (step.kind === 'intro' ? scenario.intro.readAloud : '')
  );
};

const buildPublicScripts = (
  scenario: MurderMysteryScenario,
  currentPhase: MurderMysteryPhase
): MurderMysteryPublicScriptView[] => {
  const currentStepIndex = scenario.flow.steps.findIndex(
    (step) => step.id === currentPhase
  );
  if (currentStepIndex < 0) {
    return [];
  }

  return scenario.flow.steps
    .slice(0, currentStepIndex + 1)
    .filter((step) => step.kind === 'intro')
    .map((step) => ({
      stepId: step.id,
      label: step.label,
      readAloud: getFlowStepReadAloud(scenario, step.id),
      unlocked: true,
      current: step.id === currentPhase,
    }))
    .filter((script) => script.readAloud.trim().length > 0);
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

const getInvestigationsPerRound = (
  scenario: MurderMysteryScenario,
  round?: MurderMysteryInvestigationRound | null
) => {
  const roundLimit = round
    ? getRoundConfig(scenario, round)?.investigationsPerPlayer
    : undefined;
  return Math.max(1, roundLimit || scenario.rules.investigationsPerRound || 1);
};

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
    return getInvestigationsPerRound(scenario, round);
  }
  return 0;
};

const hasUsedAllInvestigations = (
  usage: Record<number, number | boolean | undefined>,
  round: MurderMysteryInvestigationRound,
  scenario: MurderMysteryScenario
) =>
  getInvestigationUseCount(usage, round, scenario) >=
  getInvestigationsPerRound(scenario, round);

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

const getInvestigationTargetById = (
  scenario: MurderMysteryScenario,
  targetId: string
) =>
  scenario.investigations.rounds
    .flatMap((round) => round.targets)
    .find((target) => target.id === targetId);

const isRepeatableInvestigationTarget = (
  scenario: MurderMysteryScenario,
  targetId: string
) => Boolean(getInvestigationTargetById(scenario, targetId)?.repeatable);

const getEndingChoiceStep = (scenario: MurderMysteryScenario) =>
  scenario.flow.steps.find((step) => step.kind === 'ending_choice') ?? null;

const getPlayerByRoleId = (room: MurderMysteryRoom, roleId: string) =>
  room.players.find(
    (player) => room.gameData.roleByPlayerId[player.id] === roleId
  );

const getPlayerDisplayName = (room: MurderMysteryRoom, playerId: string) => {
  const player = room.players.find((entry) => entry.id === playerId);
  if (!player) {
    return '알 수 없음';
  }
  return room.gameData.roleDisplayNameByPlayerId[player.id] ?? player.name;
};

type MurderMysteryInvestigationTarget =
  MurderMysteryScenario['investigations']['rounds'][number]['targets'][number];

const isInvestigationTargetOwnedByPlayer = (
  room: MurderMysteryRoom,
  target: MurderMysteryInvestigationTarget,
  playerId: string
) =>
  Boolean(
    target.ownerRoleId &&
      room.gameData.roleByPlayerId[playerId] === target.ownerRoleId
  );

const getRequiredFirstInvestigationForPlayer = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  round: MurderMysteryInvestigationRound,
  playerId: string
) => {
  const roleId = room.gameData.roleByPlayerId[playerId];
  if (!roleId) {
    return null;
  }

  const usage = (room.gameData.investigationUsedByPlayerId[playerId] ??
    {}) as Record<number, number | boolean | undefined>;
  if (getInvestigationUseCount(usage, round, scenario) > 0) {
    return null;
  }

  return (
    scenario.investigations.requiredFirstInvestigations?.find(
      (entry) => entry.roleId === roleId && entry.round === round
    ) ?? null
  );
};

const hasRemainingNonOwnedInvestigationTarget = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  roundConfig: MurderMysteryScenario['investigations']['rounds'][number],
  playerId: string
) =>
  roundConfig.targets.some((target) => {
    if (isInvestigationTargetOwnedByPlayer(room, target, playerId)) {
      return false;
    }
    return (
      getRemainingCardIdsByTarget(room, scenario, target.id, target.cardPool)
        .length > 0
    );
  });

const getInvestigationRestrictionReason = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  roundConfig: MurderMysteryScenario['investigations']['rounds'][number],
  target: MurderMysteryInvestigationTarget,
  playerId: string
) => {
  const requiredFirstInvestigation = getRequiredFirstInvestigationForPlayer(
    room,
    scenario,
    roundConfig.round,
    playerId
  );
  if (
    requiredFirstInvestigation &&
    requiredFirstInvestigation.targetId !== target.id
  ) {
    return (
      requiredFirstInvestigation.reason ??
      '첫 조사는 지정된 조사 대상부터 확인해야 합니다.'
    );
  }

  if (
    isInvestigationTargetOwnedByPlayer(room, target, playerId) &&
    hasRemainingNonOwnedInvestigationTarget(
      room,
      scenario,
      roundConfig,
      playerId
    )
  ) {
    return '본인의 소지품은 조사할 수 없습니다.';
  }

  return null;
};

const canPlayerInvestigateTarget = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  roundConfig: MurderMysteryScenario['investigations']['rounds'][number],
  target: MurderMysteryInvestigationTarget,
  playerId: string
) =>
  !getInvestigationRestrictionReason(
    room,
    scenario,
    roundConfig,
    target,
    playerId
  );

const assertCanInvestigateTarget = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  roundConfig: MurderMysteryScenario['investigations']['rounds'][number],
  target: MurderMysteryInvestigationTarget,
  playerId: string
) => {
  const restrictionReason = getInvestigationRestrictionReason(
    room,
    scenario,
    roundConfig,
    target,
    playerId
  );
  if (restrictionReason) {
    throw new Error(restrictionReason);
  }
};

const doesFinalVoteConditionMatch = (
  result: MurderMysteryFinalVoteResult | null,
  condition?: {
    finalVoteMatched?: boolean;
    finalVoteOptionId?: string | null;
  }
) => {
  if (!condition) {
    return true;
  }
  if (
    condition.finalVoteMatched !== undefined &&
    Boolean(result?.matched) !== condition.finalVoteMatched
  ) {
    return false;
  }
  if (
    condition.finalVoteOptionId !== undefined &&
    (result?.voteOptionId ?? null) !== condition.finalVoteOptionId
  ) {
    return false;
  }
  return true;
};

const getActiveEndingChoices = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) =>
  scenario.endingChoices.filter((choice) =>
    doesFinalVoteConditionMatch(room.gameData.finalVoteResult, choice.opensWhen)
  );

const areAllEndingChoicesSubmitted = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const activeChoices = getActiveEndingChoices(room, scenario);
  return (
    activeChoices.length === 0 ||
    activeChoices.every((choice) => room.gameData.endingChoiceById[choice.id])
  );
};

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

const getCardReadCountForTarget = (
  room: MurderMysteryRoom,
  targetId: string,
  cardId: string
) =>
  (room.gameData.revealedCardIdsByTargetId[targetId] ?? []).filter(
    (revealedCardId) => revealedCardId === cardId
  ).length;

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

const grantInitialRoleCards = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  if (room.gameData.initialRoleCardsGranted) {
    return;
  }

  room.players.forEach((player) => {
    const roleId = room.gameData.roleByPlayerId[player.id];
    const initialCardIds = scenario.initialRoleCards
      .filter((entry) => entry.roleId === roleId)
      .map((entry) => entry.cardId);
    const currentCardIds =
      room.gameData.privateCardIdsByPlayerId[player.id] ?? [];
    room.gameData.privateCardIdsByPlayerId[player.id] = [
      ...new Set([...currentCardIds, ...initialCardIds]),
    ];
  });

  room.gameData.initialRoleCardsGranted = true;
};

const enterMurderMysteryPhase = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  nextPhase: MurderMysteryPhase
) => {
  applyPhaseWithTimer(room, scenario, nextPhase);

  const nextStep = getFlowStepByPhase(scenario, nextPhase);
  if (nextStep?.kind === 'final_vote') {
    room.gameData.voteByPlayerId = {};
    room.gameData.finalVoteResult = null;
    room.gameData.endingChoiceById = {};
  }
  if (nextStep?.kind === 'ending_choice') {
    room.gameData.endingChoiceById = {};
  }
  if (nextStep?.kind === 'investigate' && nextStep.round) {
    grantInitialRoleCards(room, scenario);
    initializeInvestigationTurnState(room, scenario, nextStep.round);
  }
  if (nextStep?.enterAnnouncement) {
    appendMurderMysteryAnnouncement(room, 'SYSTEM', nextStep.enterAnnouncement);
  }

  room.status =
    nextStep?.kind === 'endbook'
      ? GAME_STATUS.PENDING
      : GAME_STATUS.IN_PROGRESS;
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
  roleSelectionStatus: 'open',
  rolePreferencesByPlayerId: {},
  roleReadingReadyByPlayerId: {},
  initialRoleCardsGranted: false,
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
    extraInvestigationPendingPlayerId: null,
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
  endingChoiceById: {},
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
    extraInvestigationPendingPlayerId: null,
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
    return Array.from({
      length: getInvestigationsPerRound(scenario, round),
    }).flatMap(() => orderedPlayerIds);
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
  return Array.from({
    length: getInvestigationsPerRound(scenario, round),
  }).flatMap(() => rotatedPlayerIds);
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
    extraInvestigationPendingPlayerId: null,
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
  turn.extraInvestigationPendingPlayerId = null;
  clearReservationForBackId(room, revealedBackId);

  const nextIndex = turn.currentPlayerIndex + 1;
  turn.currentPlayerIndex = nextIndex;
  if (nextIndex >= turn.orderedPlayerIds.length) {
    turn.currentPlayerIndex = -1;
  }
  turn.turnStartedAt = turn.currentPlayerIndex >= 0 ? Date.now() : null;
};

const advanceCompletedInvestigationPhaseIfNeeded = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
  if (currentStep?.kind !== 'investigate') {
    return false;
  }

  const turn = room.gameData.investigationTurn;
  if (
    turn.extraInvestigationPendingPlayerId ||
    turn.currentPlayerIndex >= 0 ||
    turn.orderedPlayerIds.length === 0
  ) {
    return false;
  }

  const nextPhase = getNextPhase(room.gameData.phase, scenario);
  if (!nextPhase) {
    return false;
  }

  clearInvestigationTurnState(room);
  enterMurderMysteryPhase(room, scenario, nextPhase);
  return true;
};

const takeMapInvestigationBackForCurrentTurn = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  round: MurderMysteryInvestigationRound,
  backId: string
) => {
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
  assertCanInvestigateTarget(room, scenario, roundConfig, target, playerId);
  if (
    !target.repeatable &&
    isCardRevealedForTarget(room, scenario, target.id, cardId)
  ) {
    throw new Error('이미 다른 플레이어가 먼저 가져간 카드입니다.');
  }

  const revealResult = revealCardToPlayer(
    room,
    scenario,
    playerId,
    target.id,
    cardId,
    round
  );
  const canGrantExtraInvestigation =
    Boolean(revealResult.card.extraInvestigationOnReveal) &&
    room.gameData.investigationTurn.extraInvestigationPendingPlayerId !==
      playerId;

  if (canGrantExtraInvestigation) {
    delete room.gameData.investigationTurn.reservationByPlayerId[playerId];
    clearReservationForBackId(room, backId);
    room.gameData.investigationTurn.extraInvestigationPendingPlayerId =
      playerId;
    room.gameData.investigationTurn.turnStartedAt = Date.now();
  } else {
    room.gameData.investigationUsedByPlayerId[playerId] = {
      ...usage,
      [round]: getInvestigationUseCount(normalizedUsage, round, scenario) + 1,
    };
    advanceInvestigationTurnState(room, playerId, backId);
  }

  return {
    playerId,
    cardId,
    backId,
    target,
    revealResult,
    extraInvestigation: canGrantExtraInvestigation,
  };
};

const collectAutomaticReservationReveals = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  round: MurderMysteryInvestigationRound
) => {
  const results: ReturnType<typeof takeMapInvestigationBackForCurrentTurn>[] =
    [];
  const maxAutoTakes = Math.max(
    room.gameData.investigationTurn.orderedPlayerIds.length,
    0
  );

  for (let index = 0; index < maxAutoTakes; index += 1) {
    const currentPlayerId = getCurrentTurnPlayerId(room);
    if (!currentPlayerId) {
      break;
    }

    const reservedBackId =
      room.gameData.investigationTurn.reservationByPlayerId[currentPlayerId];
    if (!reservedBackId) {
      break;
    }

    try {
      const result = takeMapInvestigationBackForCurrentTurn(
        room,
        scenario,
        currentPlayerId,
        round,
        reservedBackId
      );
      results.push(result);
      if (result.extraInvestigation) {
        break;
      }
    } catch (error) {
      delete room.gameData.investigationTurn.reservationByPlayerId[
        currentPlayerId
      ];
      break;
    }
  }

  return results;
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
  round?: MurderMysteryInvestigationRound
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
  const revealedForTarget = (
    room.gameData.revealedCardIdsByTargetId[targetId] ?? []
  ).includes(cardId);
  if (scenario.investigations.depletionMode === 'per_target') {
    return revealedForTarget;
  }
  return (
    Object.values(room.gameData.revealedCardIdsByTargetId).some((cardIds) =>
      cardIds.includes(cardId)
    ) || room.gameData.revealedCardIds.includes(cardId)
  );
};

const getRemainingCardIdsByTarget = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  targetId: string,
  targetCardPool: string[]
) => {
  if (isRepeatableInvestigationTarget(scenario, targetId)) {
    const revealCount =
      room.gameData.revealedCardIdsByTargetId[targetId]?.length ?? 0;
    const nextCardId =
      targetCardPool[Math.min(revealCount, targetCardPool.length - 1)];
    return nextCardId ? [nextCardId] : [];
  }

  return targetCardPool.filter(
    (cardId) => !isCardRevealedForTarget(room, scenario, targetId, cardId)
  );
};

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
    if (
      !isRepeatableInvestigationTarget(scenario, targetId) &&
      isCardRevealedForTarget(room, scenario, targetId, forcedCardId)
    ) {
      throw new Error('이미 공개된 단서 카드는 다시 배포할 수 없습니다.');
    }
    return forcedCardId;
  }

  if (remainingCardIds.length === 0) {
    throw new Error('이 조사 대상의 단서는 이미 모두 공개되었습니다.');
  }

  return pickRandom(remainingCardIds);
};

const applyPublicCardEffects = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  card: MurderMysteryCardScenario,
  round?: MurderMysteryInvestigationRound
) => {
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
    card.id,
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
  cardId: string,
  round?: MurderMysteryInvestigationRound
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

  return applyPublicCardEffects(room, scenario, card, round);
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

  room.gameData.revealedCardIdsByTargetId[targetId] ??= [];
  if (
    isRepeatableInvestigationTarget(scenario, targetId) ||
    !room.gameData.revealedCardIdsByTargetId[targetId].includes(cardId)
  ) {
    room.gameData.revealedCardIdsByTargetId[targetId].push(cardId);
  }

  if (card.extraInvestigationOnReveal) {
    return revealPublicCard(room, scenario, cardId, round);
  }

  return {
    card,
    revealedParts: [],
    changedRoleName: false,
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
  const card = getCardById(scenario, cardId);
  const style = getCardBackStyle(scenario, target, cardId);
  const readCount = getCardReadCountForTarget(room, target.id, cardId);
  return {
    backId,
    targetId: target.id,
    targetLabel: target.label,
    imageSrc: style.imageSrc,
    shortLabel: style.shortLabel,
    extraInvestigationOnReveal: Boolean(card?.extraInvestigationOnReveal),
    isReservedByMe:
      room.gameData.investigationTurn.reservationByPlayerId[viewerId] ===
      backId,
    hasBeenRead: target.repeatable === true && readCount > 0,
    readCount,
  };
};

const buildHeldCardBackViews = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  cardIds: string[]
): MurderMysteryInvestigationBackCardView[] => {
  const backsByCardId = new Map<
    string,
    MurderMysteryInvestigationBackCardView
  >();

  scenario.investigations.rounds.forEach((roundConfig) => {
    roundConfig.targets.forEach((target) => {
      const revealedForTarget =
        room.gameData.revealedCardIdsByTargetId[target.id] ?? [];
      revealedForTarget.forEach((cardId) => {
        if (!cardIds.includes(cardId) || backsByCardId.has(cardId)) {
          return;
        }
        const backId = getBackIdForTargetCard(room, target.id, cardId);
        const card = getCardById(scenario, cardId);
        if (!backId || !card) {
          return;
        }
        const style = getCardBackStyle(scenario, target, cardId);
        const readCount = revealedForTarget.filter(
          (revealedCardId) => revealedCardId === cardId
        ).length;
        backsByCardId.set(cardId, {
          backId,
          targetId: target.id,
          targetLabel: target.label,
          imageSrc: style.imageSrc,
          shortLabel: style.shortLabel,
          extraInvestigationOnReveal: Boolean(card.extraInvestigationOnReveal),
          isReservedByMe: false,
          hasBeenRead: target.repeatable === true && readCount > 0,
          readCount,
        });
      });
    });
  });

  return cardIds
    .map((cardId) => backsByCardId.get(cardId))
    .filter(Boolean) as MurderMysteryInvestigationBackCardView[];
};

const buildInvestigationTargetView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  viewerId: string,
  roundConfig: MurderMysteryScenario['investigations']['rounds'][number],
  target: MurderMysteryScenario['investigations']['rounds'][number]['targets'][number]
): MurderMysteryInvestigationTargetView => {
  const remainingCardIds = getRemainingCardIdsByTarget(
    room,
    scenario,
    target.id,
    target.cardPool
  );
  const totalClues = target.cardPool.length;
  const targetRevealCount =
    room.gameData.revealedCardIdsByTargetId[target.id]?.length ?? 0;
  const remainingClues = remainingCardIds.length;
  const revealedClues = target.repeatable
    ? Math.min(targetRevealCount, totalClues)
    : Math.max(totalClues - remainingClues, 0);
  const availableBacks = remainingCardIds
    .map((cardId) =>
      buildBackCardView(room, scenario, viewerId, target, cardId)
    )
    .filter(Boolean) as MurderMysteryInvestigationBackCardView[];
  const isOwnedByViewer = isInvestigationTargetOwnedByPlayer(
    room,
    target,
    viewerId
  );
  const investigationRestrictionReason = getInvestigationRestrictionReason(
    room,
    scenario,
    roundConfig,
    target,
    viewerId
  );
  const canInvestigateByViewer = canPlayerInvestigateTarget(
    room,
    scenario,
    roundConfig,
    target,
    viewerId
  );

  return {
    ...target,
    totalClues,
    revealedClues,
    remainingClues,
    isExhausted: !target.repeatable && remainingClues === 0,
    isOwnedByViewer,
    canInvestigateByViewer,
    investigationRestrictionReason: investigationRestrictionReason ?? undefined,
    isOwnedFallbackForViewer:
      isOwnedByViewer && canInvestigateByViewer && remainingClues > 0,
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
      buildInvestigationTargetView(
        room,
        scenario,
        viewerId,
        roundConfig,
        target
      )
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
    currentPlayerIndex: turn.currentPlayerIndex,
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
    extraInvestigationPending:
      viewerId === turn.extraInvestigationPendingPlayerId,
    allPlayersDone:
      currentPlayerId === null && turn.orderedPlayerIds.length > 0,
    myReservation,
  };
};

const buildInvestigationPlayerProgressView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  round: MurderMysteryInvestigationRound | null
): MurderMysteryInvestigationPlayerProgressView[] => {
  if (!round) {
    return [];
  }

  if (isMapInvestigationMode(scenario)) {
    const turn = room.gameData.investigationTurn;
    const isActiveTurnRound = turn.round === round;
    const orderedPlayerIds =
      isActiveTurnRound && turn.orderedPlayerIds.length > 0
        ? turn.orderedPlayerIds
        : getOrderedPlayerIdsForRound(room, scenario, round);
    const currentPlayerId = isActiveTurnRound
      ? getCurrentTurnPlayerId(room)
      : null;

    return room.players.map((player) => {
      const usage = room.gameData.investigationUsedByPlayerId[player.id] ?? {};
      const usageCount = getInvestigationUseCount(
        usage as Record<number, number | boolean | undefined>,
        round,
        scenario
      );
      const turnCompletedCount = isActiveTurnRound
        ? turn.completedPlayerIds.filter((playerId) => playerId === player.id)
            .length
        : 0;
      const requiredCount = orderedPlayerIds.filter(
        (playerId) => playerId === player.id
      ).length;
      const completedCount = Math.min(
        isActiveTurnRound ? turnCompletedCount : usageCount,
        requiredCount
      );

      return {
        playerId: player.id,
        completedCount,
        requiredCount,
        remainingCount: Math.max(requiredCount - completedCount, 0),
        isCurrent: currentPlayerId === player.id,
      };
    });
  }

  const requiredCount = getInvestigationsPerRound(scenario, round);

  return room.players.map((player) => {
    const usage = room.gameData.investigationUsedByPlayerId[player.id] ?? {};
    const completedCount = Math.min(
      getInvestigationUseCount(
        usage as Record<number, number | boolean | undefined>,
        round,
        scenario
      ),
      requiredCount
    );

    return {
      playerId: player.id,
      completedCount,
      requiredCount,
      remainingCount: Math.max(requiredCount - completedCount, 0),
      isCurrent: false,
    };
  });
};

const buildEndingChoicesView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  viewerId: string
) => {
  const endingChoiceStep = getEndingChoiceStep(scenario);
  const activeChoices = getActiveEndingChoices(room, scenario);
  const playerRoleId = room.gameData.roleByPlayerId[viewerId] ?? null;
  const submittedCount = activeChoices.filter(
    (choice) => room.gameData.endingChoiceById[choice.id]
  ).length;
  const allSubmitted = areAllEndingChoicesSubmitted(room, scenario);

  return {
    enabled: Boolean(endingChoiceStep) && activeChoices.length > 0,
    totalCount: activeChoices.length,
    submittedCount,
    allSubmitted,
    choices: activeChoices
      .filter((choice) => choice.roleId === playerRoleId)
      .map((choice) => {
        const yourSelection = room.gameData.endingChoiceById[choice.id] ?? null;
        return {
          id: choice.id,
          roleId: choice.roleId,
          label: choice.label,
          description: choice.description,
          options: choice.options,
          yourSelection,
          submitted: Boolean(yourSelection),
          canSubmit: !yourSelection,
        };
      }),
    progress: activeChoices.map((choice) => {
      const choicePlayer = getPlayerByRoleId(room, choice.roleId);
      return {
        choiceId: choice.id,
        label: choice.label,
        roleId: choice.roleId,
        roleDisplayName:
          (choicePlayer ? getPlayerDisplayName(room, choicePlayer.id) : null) ??
          getRoleById(scenario, choice.roleId)?.displayName ??
          choice.roleId,
        submitted: Boolean(room.gameData.endingChoiceById[choice.id]),
        selectedOptionId: null,
      };
    }),
  };
};

const doesEndbookConditionMatch = (
  room: MurderMysteryRoom,
  condition?: MurderMysteryScenario['endbook']['variants'][number]['when'],
  endingChoiceById: MurderMysteryGameData['endingChoiceById'] = room.gameData
    .endingChoiceById
) => {
  const result = room.gameData.finalVoteResult;
  if (!doesFinalVoteConditionMatch(result, condition)) {
    return false;
  }
  return Object.entries(condition?.choices ?? {}).every(
    ([choiceId, optionId]) => endingChoiceById[choiceId] === optionId
  );
};

const getMatchedEndbookSections = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  endingChoiceById: MurderMysteryGameData['endingChoiceById'] = room.gameData
    .endingChoiceById
) =>
  scenario.endbook.sections.filter((section) =>
    doesEndbookConditionMatch(room, section.when, endingChoiceById)
  );

const getEndingChoiceRoleDisplayName = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  choice: MurderMysteryScenario['endingChoices'][number]
) => {
  const choicePlayer = getPlayerByRoleId(room, choice.roleId);
  return (
    (choicePlayer ? getPlayerDisplayName(room, choicePlayer.id) : null) ??
    getRoleById(scenario, choice.roleId)?.displayName ??
    choice.roleId
  );
};

const buildEndbookChoiceSummaries = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
): MurderMysteryEndbookView['choiceSummaries'] =>
  getActiveEndingChoices(room, scenario).flatMap((choice) => {
    const selectedOptionId = room.gameData.endingChoiceById[choice.id];
    const selectedOption = choice.options.find(
      (option) => option.id === selectedOptionId
    );
    if (!selectedOptionId || !selectedOption) {
      return [];
    }
    return [
      {
        choiceId: choice.id,
        choiceLabel: choice.label,
        roleDisplayName: getEndingChoiceRoleDisplayName(room, scenario, choice),
        selectedOptionId,
        selectedOptionLabel: selectedOption.label,
      },
    ];
  });

const buildEndbookAlternateOutcomes = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  currentSections: MurderMysteryScenario['endbook']['sections']
): MurderMysteryEndbookView['alternateOutcomes'] => {
  if (scenario.endbook.sections.length === 0) {
    return [];
  }

  const currentSectionIds = new Set(
    currentSections.map((section) => section.id)
  );

  return getActiveEndingChoices(room, scenario).flatMap((choice) => {
    const selectedOptionId = room.gameData.endingChoiceById[choice.id];
    const selectedOption = choice.options.find(
      (option) => option.id === selectedOptionId
    );
    if (!selectedOptionId || !selectedOption) {
      return [];
    }

    return choice.options
      .filter((option) => option.id !== selectedOptionId)
      .flatMap((alternateOption) => {
        const alternateChoiceById = {
          ...room.gameData.endingChoiceById,
          [choice.id]: alternateOption.id,
        };
        const alternateSections = getMatchedEndbookSections(
          room,
          scenario,
          alternateChoiceById
        ).filter(
          (section) =>
            !currentSectionIds.has(section.id) &&
            section.when?.choices?.[choice.id] === alternateOption.id
        );

        if (alternateSections.length === 0) {
          return [];
        }

        const title =
          [...alternateSections].reverse().find((section) => section.title)
            ?.title ?? alternateOption.label;

        return [
          {
            choiceId: choice.id,
            choiceLabel: choice.label,
            roleDisplayName: getEndingChoiceRoleDisplayName(
              room,
              scenario,
              choice
            ),
            selectedOptionId,
            selectedOptionLabel: selectedOption.label,
            alternateOptionId: alternateOption.id,
            alternateOptionLabel: alternateOption.label,
            title,
            body: alternateSections
              .map((section) => section.body)
              .filter(Boolean)
              .join('\n\n'),
          },
        ];
      });
  });
};

const resolveEndbookVariant = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) =>
  scenario.endbook.variants.find((variant) =>
    doesEndbookConditionMatch(room, variant.when)
  ) ?? scenario.endbook.variants[0];

const resolveEndbookView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
): MurderMysteryEndbookView => {
  const choiceSummaries = buildEndbookChoiceSummaries(room, scenario);

  if (scenario.endbook.sections.length > 0) {
    const matchedSections = getMatchedEndbookSections(room, scenario);
    const body = matchedSections
      .map((section) => section.body)
      .filter(Boolean)
      .join('\n\n');
    const title =
      [...matchedSections].reverse().find((section) => section.title)?.title ??
      scenario.endbook.title ??
      '엔딩';

    return {
      id:
        matchedSections.length > 0
          ? matchedSections.map((section) => section.id).join('+')
          : 'composed_endbook',
      title,
      body,
      evidenceQna: scenario.endbook.evidenceQna,
      choiceSummaries,
      alternateOutcomes: buildEndbookAlternateOutcomes(
        room,
        scenario,
        matchedSections
      ),
    };
  }

  const variant = resolveEndbookVariant(room, scenario);
  return {
    id: variant.id,
    title: variant.title,
    body: variant.body,
    evidenceQna: scenario.endbook.evidenceQna,
    choiceSummaries,
    alternateOutcomes: [],
  };
};

export const buildMurderMysteryEndbookText = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const endbook = resolveEndbookView(room, scenario);
  return [endbook.title, endbook.body].filter(Boolean).join('\n\n');
};

const buildEndbookView = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
): MurderMysteryEndbookView | null => {
  const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
  if (currentStep?.kind !== 'endbook') {
    return null;
  }
  return resolveEndbookView(room, scenario);
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

type MurderMysteryCardSourceView = {
  sourceTargetIds: string[];
  sourceTargetLabels: string[];
  sourceBackLabels: string[];
};

const buildCardSourceMap = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
): Record<string, MurderMysteryCardSourceView> => {
  const sourceSetByCardId: Record<
    string,
    {
      targetIdSet: Set<string>;
      targetLabelSet: Set<string>;
      backLabelSet: Set<string>;
    }
  > = {};

  scenario.investigations.rounds.forEach((roundConfig) => {
    roundConfig.targets.forEach((target) => {
      const revealedForTarget =
        room.gameData.revealedCardIdsByTargetId[target.id] ?? [];
      revealedForTarget.forEach((cardId) => {
        sourceSetByCardId[cardId] ??= {
          targetIdSet: new Set<string>(),
          targetLabelSet: new Set<string>(),
          backLabelSet: new Set<string>(),
        };
        sourceSetByCardId[cardId].targetIdSet.add(target.id);
        sourceSetByCardId[cardId].targetLabelSet.add(target.label);
        sourceSetByCardId[cardId].backLabelSet.add(
          getCardBackStyle(scenario, target, cardId).shortLabel
        );
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
            backLabelSet: new Set<string>(),
          };
          sourceSetByCardId[cardId].targetIdSet.add(target.id);
          sourceSetByCardId[cardId].targetLabelSet.add(target.label);
          sourceSetByCardId[cardId].backLabelSet.add(
            getCardBackStyle(scenario, target, cardId).shortLabel
          );
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
      backLabelSet: new Set<string>(),
    };
    sourceSetByCardId[event.revealCardId].targetIdSet.add(event.id);
    sourceSetByCardId[event.revealCardId].targetLabelSet.add(event.label);
    sourceSetByCardId[event.revealCardId].backLabelSet.add(event.label);
  });

  return Object.fromEntries(
    Object.entries(sourceSetByCardId).map(([cardId, source]) => [
      cardId,
      {
        sourceTargetIds: [...source.targetIdSet],
        sourceTargetLabels: [...source.targetLabelSet],
        sourceBackLabels: [...source.backLabelSet],
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
  cardSourceMap: Record<string, MurderMysteryCardSourceView>,
  fallbackSourceLabelByCardId: Record<string, string> = {},
  options: {
    publicCardIds?: Set<string>;
    publiclyRevealableCardIds?: Set<string>;
  } = {}
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
        sourceBackLabels: [],
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
        sourceBackLabels: source.sourceBackLabels,
        isPublic: Boolean(options.publicCardIds?.has(cardId)),
        canRevealPublicly: Boolean(
          options.publiclyRevealableCardIds?.has(cardId) &&
            !options.publicCardIds?.has(cardId)
        ),
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

const validateRolePreferenceIds = (
  scenario: MurderMysteryScenario,
  roleIds: string[]
) => {
  if (!Array.isArray(roleIds)) {
    throw new Error('캐릭터를 하나 선택해주세요.');
  }
  const scenarioRoleIdSet = new Set(scenario.roles.map((role) => role.id));

  if (roleIds.length !== 1) {
    throw new Error('캐릭터를 하나 선택해주세요.');
  }
  if (roleIds.some((roleId) => !scenarioRoleIdSet.has(roleId))) {
    throw new Error('존재하지 않는 캐릭터가 포함되어 있습니다.');
  }

  return roleIds;
};

const clearStaleRolePreferences = (room: MurderMysteryRoom) => {
  const activePlayerIds = new Set(room.players.map((player) => player.id));
  Object.keys(room.gameData.rolePreferencesByPlayerId ?? {}).forEach(
    (playerId) => {
      if (!activePlayerIds.has(playerId)) {
        delete room.gameData.rolePreferencesByPlayerId[playerId];
      }
    }
  );
};

const isRoleSelectionOpenPhase = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
  return (
    room.gameData.phase === 'LOBBY' ||
    currentStep?.kind === 'intro' ||
    currentStep?.kind === 'role_selection'
  );
};

const applyMurderMysteryRoleAssignments = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  roleIdByPlayerId: Record<string, string>
) => {
  if (room.players.length > scenario.roles.length) {
    throw new Error('참가자 수에 비해 역할 수가 부족합니다.');
  }

  const usageTemplate = buildInvestigationUsageTemplate(scenario);
  ensureInvestigationUsageMap(room, scenario);
  room.gameData.roleByPlayerId = {};
  room.gameData.roleDisplayNameByPlayerId = {};
  room.gameData.roleReadingReadyByPlayerId = {};
  room.gameData.initialRoleCardsGranted = false;
  room.gameData.privateCardIdsByPlayerId = {};
  room.gameData.revealedCardsByPlayerId = {};

  room.players.forEach((player) => {
    const roleId = roleIdByPlayerId[player.id];
    const role = roleId ? getRoleById(scenario, roleId) : null;
    if (!role) {
      throw new Error('캐릭터 배정 결과를 찾을 수 없습니다.');
    }
    room.gameData.roleByPlayerId[player.id] = role.id;
    room.gameData.roleDisplayNameByPlayerId[player.id] = role.displayName;
    room.gameData.privateCardIdsByPlayerId[player.id] = [];
    room.gameData.revealedCardsByPlayerId[player.id] = [];
    room.gameData.investigationUsedByPlayerId[player.id] = {
      ...usageTemplate,
    };
  });
};

const resolveMurderMysteryRoleSelectionIfReady = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  room.gameData.roleSelectionStatus ??= 'open';
  room.gameData.rolePreferencesByPlayerId ??= {};
  clearStaleRolePreferences(room);
  if (room.gameData.roleSelectionStatus === 'locked') {
    return false;
  }
  if (room.players.length !== room.maxPlayers) {
    return false;
  }
  if (
    room.players.some(
      (player) => !room.gameData.rolePreferencesByPlayerId[player.id]?.[0]
    )
  ) {
    return false;
  }

  const remainingRoleIds = new Set(scenario.roles.map((role) => role.id));
  const roleIdByPlayerId: Record<string, string> = {};
  const unresolvedPlayers: MurderMysteryRoom['players'] = [];

  scenario.roles.forEach((role) => {
    const contenders = room.players.filter(
      (player) =>
        room.gameData.rolePreferencesByPlayerId[player.id]?.[0] === role.id
    );
    if (contenders.length === 0) {
      return;
    }

    const randomizedContenders = shuffled(contenders);
    const winner = randomizedContenders[0];
    if (!winner) {
      return;
    }
    roleIdByPlayerId[winner.id] = role.id;
    remainingRoleIds.delete(role.id);
    unresolvedPlayers.push(...randomizedContenders.slice(1));
  });

  const fallbackRoleIds = shuffled([...remainingRoleIds]);
  shuffled(unresolvedPlayers).forEach((player) => {
    const roleId = fallbackRoleIds.pop();
    if (!roleId) {
      throw new Error('캐릭터 배정 결과를 만들 수 없습니다.');
    }
    roleIdByPlayerId[player.id] = roleId;
  });

  applyMurderMysteryRoleAssignments(room, scenario, roleIdByPlayerId);
  room.gameData.roleSelectionStatus = 'locked';
  return true;
};

export const submitMurderMysteryRolePreferences = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  roleIds: string[]
) => {
  if (room.gameData.roleSelectionStatus === 'locked') {
    throw new Error('이미 캐릭터 배정이 완료되었습니다.');
  }
  if (!isRoleSelectionOpenPhase(room, scenario)) {
    throw new Error('캐릭터 선택이 열려있을 때만 제출할 수 있습니다.');
  }
  if (!room.players.some((player) => player.id === playerId)) {
    throw new Error('참가자만 캐릭터 선택을 제출할 수 있습니다.');
  }

  room.gameData.rolePreferencesByPlayerId ??= {};
  room.gameData.rolePreferencesByPlayerId[playerId] = [
    ...validateRolePreferenceIds(scenario, roleIds),
  ];
  clearStaleRolePreferences(room);

  return {
    allSubmitted:
      room.players.length === room.maxPlayers &&
      room.players.every(
        (player) => room.gameData.rolePreferencesByPlayerId[player.id]?.[0]
      ),
  };
};

export const clearMurderMysteryRolePreferences = (
  room: MurderMysteryRoom,
  playerId: string
) => {
  const scenario = getMurderMysteryScenario(room.gameData.scenarioId);
  if (room.gameData.roleSelectionStatus === 'locked') {
    throw new Error('이미 캐릭터 배정이 완료되었습니다.');
  }
  if (!isRoleSelectionOpenPhase(room, scenario)) {
    throw new Error('캐릭터 선택이 열려있을 때만 수정할 수 있습니다.');
  }
  if (!room.players.some((player) => player.id === playerId)) {
    throw new Error('참가자만 캐릭터 선택을 수정할 수 있습니다.');
  }

  room.gameData.rolePreferencesByPlayerId ??= {};
  delete room.gameData.rolePreferencesByPlayerId[playerId];
};

export const buildMurderMysteryRoleShareText = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  roleId: string
) => {
  const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
  if (
    room.gameData.phase !== 'LOBBY' &&
    currentStep?.kind !== 'intro' &&
    currentStep?.kind !== 'role_selection'
  ) {
    throw new Error(
      '캐릭터 선택이 열려있을 때만 사전 룰지를 공유할 수 있습니다.'
    );
  }

  const role = getRoleById(scenario, roleId);
  if (!role) {
    throw new Error('공유할 수 없는 역할입니다.');
  }

  const token = createMurderMysteryPreReadToken({
    scenarioId: scenario.id,
    roleId,
    issuedAt: Date.now(),
  });
  const linkPath = `/murder_mystery/pre-read/${token}`;
  const title = '머더미스터리';
  const text = fitKakaoTextTemplate(
    [
      scenario.title,
      '',
      `${role.displayName} 사전 룰지입니다.`,
      '링크에서 프롤로그, 룰지, 규칙을 읽어주세요.',
    ].join('\n')
  );

  return {
    title,
    text,
    linkPath,
  };
};

export const startMurderMysteryGame = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  ensureMurderMysterySeatLayout(room);
  if (room.players.length !== room.maxPlayers) {
    throw new Error('모든 참가자가 입장해야 게임을 시작할 수 있습니다.');
  }

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
  room.gameData.roleSelectionStatus = 'open';
  room.gameData.rolePreferencesByPlayerId ??= {};
  clearStaleRolePreferences(room);
  room.gameData.roleByPlayerId = {};
  room.gameData.roleDisplayNameByPlayerId = {};
  room.gameData.roleReadingReadyByPlayerId = {};
  room.gameData.initialRoleCardsGranted = false;
  room.gameData.privateCardIdsByPlayerId = Object.fromEntries(
    room.players.map((player) => [player.id, []])
  );
  room.gameData.specialEventStatusById =
    buildSpecialEventStatusTemplate(scenario);
  room.gameData.voteByPlayerId = {};
  room.gameData.finalVoteResult = null;
  room.gameData.endingChoiceById = {};
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

  const nextPhase = getNextPhase(currentPhase, scenario);
  if (!nextPhase) {
    throw new Error('다음 단계로 이동할 수 없습니다.');
  }
  const nextStep = getFlowStepByPhase(scenario, nextPhase);

  if (currentStep.kind === 'final_vote') {
    throw new Error('최종 투표 집계를 먼저 실행해주세요.');
  }
  if (currentStep.kind === 'endbook') {
    throw new Error('이미 엔딩북 단계입니다.');
  }
  if (currentStep.kind === 'role_reading' && !areAllRoleSheetsRead(room)) {
    throw new Error(
      '모든 플레이어가 비공개 룰지를 읽어야 다음 단계로 이동할 수 있습니다.'
    );
  }
  if (
    currentStep.kind === 'role_selection' ||
    (currentStep.kind === 'intro' &&
      nextStep?.kind === 'role_reading' &&
      room.gameData.roleSelectionStatus !== 'locked')
  ) {
    const locked = resolveMurderMysteryRoleSelectionIfReady(room, scenario);
    if (!locked) {
      throw new Error(
        '모든 참가자가 캐릭터 선택을 제출해야 배정을 확정할 수 있습니다.'
      );
    }
  }
  if (
    currentStep.kind === 'ending_choice' &&
    !areAllEndingChoicesSubmitted(room, scenario)
  ) {
    throw new Error(
      '모든 엔딩 선택이 제출되어야 엔딩 단계로 이동할 수 있습니다.'
    );
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

  enterMurderMysteryPhase(room, scenario, nextPhase);

  return { resolvedPending };
};

export const advanceExpiredMurderMysteryDiscussionIfNeeded = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
  if (currentStep?.kind !== 'discuss') {
    return false;
  }

  const durationSec = room.gameData.phaseDurationSec;
  const startedAt = room.gameData.phaseStartedAt;
  if (!durationSec || !startedAt) {
    return false;
  }

  const remainingMs = durationSec * 1000 - (Date.now() - startedAt);
  if (remainingMs > 0) {
    return false;
  }

  const nextPhase = getNextPhase(room.gameData.phase, scenario);
  if (!nextPhase) {
    return false;
  }

  enterMurderMysteryPhase(room, scenario, nextPhase);
  return true;
};

export const markMurderMysteryRoleSheetRead = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string
) => {
  const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
  if (currentStep?.kind !== 'role_reading') {
    throw new Error('비공개 룰지 읽기 단계에서만 실행할 수 있습니다.');
  }
  if (!room.players.some((player) => player.id === playerId)) {
    throw new Error('참가자만 읽음 완료를 제출할 수 있습니다.');
  }

  const readyByPlayerId = ensureRoleReadingReadyMap(room);
  readyByPlayerId[playerId] ??= Date.now();

  if (!areAllRoleSheetsRead(room)) {
    return { allReady: false, advanced: false };
  }

  const nextPhase = getNextPhase(room.gameData.phase, scenario);
  if (!nextPhase) {
    throw new Error('다음 단계로 이동할 수 없습니다.');
  }

  enterMurderMysteryPhase(room, scenario, nextPhase);

  return { allReady: true, advanced: true };
};

export const markMurderMysteryPhaseRead = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string
) => {
  const currentStep = getFlowStepByPhase(scenario, room.gameData.phase);
  if (currentStep?.kind === 'role_reading') {
    return markMurderMysteryRoleSheetRead(room, scenario, playerId);
  }
  throw new Error(
    '비공개 룰지 읽기 단계에서만 읽음 완료를 제출할 수 있습니다.'
  );
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

    const result = takeMapInvestigationBackForCurrentTurn(
      room,
      scenario,
      playerId,
      round,
      backId
    );
    const automaticResults = result.extraInvestigation
      ? []
      : collectAutomaticReservationReveals(room, scenario, round);
    const phaseAdvanced = advanceCompletedInvestigationPhaseIfNeeded(
      room,
      scenario
    );

    return {
      mode: 'auto' as const,
      ...result,
      automaticResults,
      phaseAdvanced,
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
  assertCanInvestigateTarget(room, scenario, roundConfig, target, playerId);

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

  if (scenario.investigations.deliveryMode === 'manual') {
    room.gameData.investigationUsedByPlayerId[playerId] = {
      ...usage,
      [round]: getInvestigationUseCount(normalizedUsage, round, scenario) + 1,
    };
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
      automaticResults: [],
      phaseAdvanced: false,
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
  const canGrantExtraInvestigation = Boolean(
    revealResult.card.extraInvestigationOnReveal
  );
  if (!canGrantExtraInvestigation) {
    room.gameData.investigationUsedByPlayerId[playerId] = {
      ...usage,
      [round]: getInvestigationUseCount(normalizedUsage, round, scenario) + 1,
    };
  }

  return {
    mode: 'auto' as const,
    playerId,
    cardId,
    target,
    revealResult,
    extraInvestigation: canGrantExtraInvestigation,
    automaticResults: [],
    phaseAdvanced: false,
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
  if (!roundConfig) {
    throw new Error('조사 라운드 설정을 찾을 수 없습니다.');
  }
  const target = roundConfig.targets.find((entry) => entry.id === targetId);
  if (!target || !target.cardPool.includes(cardId)) {
    throw new Error('이 라운드에서 예약할 수 없는 카드입니다.');
  }
  assertCanInvestigateTarget(room, scenario, roundConfig, target, playerId);
  if (
    !target.repeatable &&
    isCardRevealedForTarget(room, scenario, targetId, cardId)
  ) {
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

export const revealMurderMysteryOwnedClue = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  cardId: string
) => {
  const card = getCardById(scenario, cardId);
  if (!card) {
    throw new Error('존재하지 않는 단서 카드입니다.');
  }
  if (!card.backId) {
    throw new Error('조사로 획득한 단서만 전체 공개할 수 있습니다.');
  }
  if (card.publicRevealDisabled) {
    throw new Error('이 단서는 전체 공개할 수 없습니다.');
  }

  const ownedCardIds = room.gameData.revealedCardsByPlayerId[playerId] ?? [];
  if (!ownedCardIds.includes(cardId)) {
    throw new Error('본인이 획득한 단서만 전체 공개할 수 있습니다.');
  }

  const alreadyPublic = room.gameData.revealedCardIds.includes(cardId);
  const revealResult = revealPublicCard(room, scenario, cardId);

  return {
    alreadyPublic,
    card: revealResult.card,
    revealedParts: revealResult.revealedParts,
    changedRoleName: revealResult.changedRoleName,
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
  if (!room.gameData.initialRoleCardsGranted) {
    throw new Error('아직 특수 이벤트를 신고할 수 없습니다.');
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

export const submitMurderMysteryEndingChoice = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  choiceId: string,
  optionId: string
) => {
  const step = getFlowStepByPhase(scenario, room.gameData.phase);
  if (step?.kind !== 'ending_choice') {
    throw new Error('지금은 엔딩 선택 단계가 아닙니다.');
  }
  const roleId = room.gameData.roleByPlayerId[playerId];
  if (!roleId) {
    throw new Error('참가자만 엔딩 선택을 제출할 수 있습니다.');
  }
  const choice = getActiveEndingChoices(room, scenario).find(
    (entry) => entry.id === choiceId
  );
  if (!choice) {
    throw new Error('제출할 수 있는 엔딩 선택지를 찾을 수 없습니다.');
  }
  if (choice.roleId !== roleId) {
    throw new Error('자신에게 열린 엔딩 선택지만 제출할 수 있습니다.');
  }
  if (room.gameData.endingChoiceById[choice.id]) {
    throw new Error('이미 엔딩 선택을 제출했습니다.');
  }
  if (!choice.options.some((option) => option.id === optionId)) {
    throw new Error('존재하지 않는 엔딩 선택 옵션입니다.');
  }
  room.gameData.endingChoiceById[choice.id] = optionId;
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
  if (tallyEntries.length === 0) {
    throw new Error('최종 투표가 하나도 제출되지 않았습니다.');
  }

  const maxVoteCount = tallyEntries.reduce(
    (max, [, count]) => Math.max(max, count),
    0
  );
  const topEntries = tallyEntries.filter(([, count]) => count === maxVoteCount);
  const voteOptionId = topEntries.length === 1 ? topEntries[0][0] : null;

  if (voteOptionId === null) {
    const result: MurderMysteryFinalVoteResult = {
      voteOptionId: null,
      suspectPlayerId: null,
      matched: false,
      tally,
    };

    room.gameData.voteByPlayerId = {};
    room.gameData.finalVoteResult = null;
    room.gameData.endingChoiceById = {};
    return result;
  }

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
  room.gameData.endingChoiceById = {};

  const endingChoiceStep = getEndingChoiceStep(scenario);
  if (getActiveEndingChoices(room, scenario).length > 0) {
    if (!endingChoiceStep) {
      throw new Error(
        '엔딩 선택 단계(flow.ending_choice)가 정의되지 않았습니다.'
      );
    }
    enterMurderMysteryPhase(room, scenario, endingChoiceStep.id);
    return result;
  }

  const endbookStep = scenario.flow.steps.find(
    (flowStep) => flowStep.kind === 'endbook'
  );
  if (!endbookStep) {
    throw new Error('엔딩 단계(flow.endbook)가 정의되지 않았습니다.');
  }

  enterMurderMysteryPhase(room, scenario, endbookStep.id);
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
        ...(role.personalGoal ? { personalGoal: role.personalGoal } : {}),
        ...(role.ruleText ? { ruleText: role.ruleText } : {}),
        ...(role.belongingHints ? { belongingHints: role.belongingHints } : {}),
        ...(role.secretTextHighlights
          ? { secretTextHighlights: role.secretTextHighlights }
          : {}),
        ...(role.portraitSrc ? { portraitSrc: role.portraitSrc } : {}),
        ...(role.portraitAlt ? { portraitAlt: role.portraitAlt } : {}),
      }
    : null;

  const privateCardIds = player
    ? (room.gameData.privateCardIdsByPlayerId[player.id] ?? [])
    : [];
  const revealedPersonalCardIds = player
    ? (room.gameData.revealedCardsByPlayerId[player.id] ?? [])
    : [];
  const myCardIds = [
    ...new Set([...privateCardIds, ...revealedPersonalCardIds]),
  ];
  const myCards = myCardIds
    .map((cardId) => getCardById(scenario, cardId))
    .filter(Boolean) as MurderMysteryCardScenario[];

  const cardSourceMap = buildCardSourceMap(room, scenario);
  const publicCardIdSet = new Set(room.gameData.revealedCardIds);
  const publiclyRevealableMyCardIds = new Set(
    revealedPersonalCardIds.filter((cardId) => {
      const card = getCardById(scenario, cardId);
      return Boolean(card?.backId && !card.publicRevealDisabled);
    })
  );
  const privateCardSourceLabelMap = buildPrivateCardSourceLabelMap(
    scenario,
    roleId
  );
  const clueVaultMyClues = buildClueVaultCards(
    scenario,
    myCardIds,
    cardSourceMap,
    privateCardSourceLabelMap,
    {
      publicCardIds: publicCardIdSet,
      publiclyRevealableCardIds: publiclyRevealableMyCardIds,
    }
  );
  const clueVaultPublicClues = buildClueVaultCards(
    scenario,
    room.gameData.revealedCardIds,
    cardSourceMap,
    {},
    { publicCardIds: publicCardIdSet }
  );
  const specialEventStatusById = room.gameData.specialEventStatusById ?? {};
  const reportableSpecialEvents =
    roleId && room.gameData.initialRoleCardsGranted
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
  const limitPerRound = getInvestigationsPerRound(scenario, round);
  const roleSelectionStatus = room.gameData.roleSelectionStatus ?? 'open';
  const rolePreferencesByPlayerId =
    room.gameData.rolePreferencesByPlayerId ?? {};
  const yourPreferenceRoleIds = player
    ? (rolePreferencesByPlayerId[player.id] ?? [])
    : [];
  const yourAssignedRoleId = player
    ? (room.gameData.roleByPlayerId[player.id] ?? null)
    : null;
  const yourSubmittedRoleId = yourPreferenceRoleIds[0] ?? null;
  const roleSelection = {
    status: roleSelectionStatus,
    roles: scenario.roles.map((scenarioRole) => ({
      id: scenarioRole.id,
      displayName: scenarioRole.displayName,
      publicText: scenarioRole.publicText,
      ...(scenarioRole.portraitSrc
        ? { portraitSrc: scenarioRole.portraitSrc }
        : {}),
      ...(scenarioRole.portraitAlt
        ? { portraitAlt: scenarioRole.portraitAlt }
        : {}),
      assignedPlayerId:
        room.players.find(
          (entry) => room.gameData.roleByPlayerId[entry.id] === scenarioRole.id
        )?.id ?? null,
    })),
    publicCovers: [
      ...scenario.roles.map((scenarioRole) => ({
        id: scenarioRole.id,
        displayName: scenarioRole.displayName,
        publicText: scenarioRole.publicText,
        ...(scenarioRole.portraitSrc
          ? { portraitSrc: scenarioRole.portraitSrc }
          : {}),
        ...(scenarioRole.portraitAlt
          ? { portraitAlt: scenarioRole.portraitAlt }
          : {}),
        selectable: true,
        assignedPlayerId:
          room.players.find(
            (entry) =>
              room.gameData.roleByPlayerId[entry.id] === scenarioRole.id
          )?.id ?? null,
        preferredPlayerIds: room.players
          .filter(
            (entry) =>
              rolePreferencesByPlayerId[entry.id]?.[0] === scenarioRole.id
          )
          .map((entry) => entry.id),
      })),
      ...(scenario.publicCovers ?? []).map((cover) => ({
        id: cover.id,
        displayName: cover.displayName,
        publicText: cover.publicText,
        ...(cover.portraitSrc ? { portraitSrc: cover.portraitSrc } : {}),
        ...(cover.portraitAlt ? { portraitAlt: cover.portraitAlt } : {}),
        selectable: false,
        assignedPlayerId: null,
        preferredPlayerIds: [],
      })),
    ],
    players: room.players.map((entry) => ({
      playerId: entry.id,
      playerName: entry.name,
      submitted:
        roleSelectionStatus === 'locked' ||
        Boolean(rolePreferencesByPlayerId[entry.id]?.[0]),
    })),
    requiredPlayerCount: room.maxPlayers,
    submittedCount:
      roleSelectionStatus === 'locked'
        ? room.players.length
        : room.players.filter(
            (entry) => rolePreferencesByPlayerId[entry.id]?.[0]
          ).length,
    yourPreferenceRoleIds,
    yourAssignedRoleId,
    yourAssignedRoleWasRandom: Boolean(
      player &&
        roleSelectionStatus === 'locked' &&
        yourSubmittedRoleId &&
        yourAssignedRoleId &&
        yourSubmittedRoleId !== yourAssignedRoleId
    ),
  };
  const roleReadingReadyByPlayerId = ensureRoleReadingReadyMap(room);
  const roleReadingPlayers = room.players.map((entry) => ({
    playerId: entry.id,
    playerName: entry.name,
    ready: Boolean(roleReadingReadyByPlayerId[entry.id]),
    readyAt: roleReadingReadyByPlayerId[entry.id] ?? null,
  }));
  const roleReadingReadyCount = roleReadingPlayers.filter(
    (entry) => entry.ready
  ).length;
  const roleReading = {
    readyCount: roleReadingReadyCount,
    totalCount: room.players.length,
    allReady:
      room.players.length > 0 && roleReadingReadyCount === room.players.length,
    yourReady: player ? Boolean(roleReadingReadyByPlayerId[player.id]) : false,
    players: roleReadingPlayers,
  };
  const publicScripts = buildPublicScripts(scenario, room.gameData.phase);

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
      endingChoices: scenario.endingChoices,
      endbook: scenario.endbook,
    },
    specialEvents: reportableSpecialEvents,
    seatLayoutByPlayerId,
    roleSelection,
    roleReading,
    publicScripts,
    phase: room.gameData.phase,
    phaseOrder: getMurderMysteryPhaseOrder(scenario),
    players: room.players.map((entry) => {
      const entryRoleId = room.gameData.roleByPlayerId[entry.id] ?? null;
      const entryRole = entryRoleId
        ? (getRoleById(scenario, entryRoleId) ?? null)
        : null;
      const entryOwnedCardIds =
        room.gameData.revealedCardsByPlayerId[entry.id] ?? [];
      const entryPublicCardIds = entryOwnedCardIds.filter((cardId) =>
        publicCardIdSet.has(cardId)
      );
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
        rolePortraitSrc: entryRole?.portraitSrc ?? null,
        rolePortraitAlt: entryRole?.portraitAlt ?? null,
        statusText:
          (entry as { statusText?: '감시' | '격리' | '결박' }).statusText ??
          '감시',
        heldCardBacks: buildHeldCardBackViews(
          room,
          scenario,
          entryOwnedCardIds
        ),
        publicRevealedClues: buildClueVaultCards(
          scenario,
          entryPublicCardIds,
          cardSourceMap,
          {},
          { publicCardIds: publicCardIdSet }
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
      playerProgress: buildInvestigationPlayerProgressView(
        room,
        scenario,
        round
      ),
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
    endingChoices: buildEndingChoicesView(room, scenario, viewerId),
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
