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
  MurderMysteryInvestigationRound,
  MurderMysteryPhase,
  MurderMysteryPartScenario,
  MurderMysteryPendingInvestigation,
  MurderMysteryRoleSheetView,
  MurderMysteryScenario,
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

const buildInvestigationUsageTemplate = (
  scenario: MurderMysteryScenario
): Record<number, boolean> =>
  getInvestigationRounds(scenario).reduce<Record<number, boolean>>(
    (acc, round) => {
      acc[round] = false;
      return acc;
    },
    {}
  );

const getRoleById = (scenario: MurderMysteryScenario, roleId: string) =>
  scenario.roles.find((role) => role.id === roleId);

const getCardById = (scenario: MurderMysteryScenario, cardId: string) =>
  scenario.cards.find((card) => card.id === cardId);

const getPartById = (scenario: MurderMysteryScenario, partId: string) =>
  scenario.parts.find((part) => part.id === partId);

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
  pendingInvestigations: [],
  revealedCardsByPlayerId: {},
  revealedCardIds: [],
  revealedCardIdsByTargetId: {},
  revealedPartIds: [],
  voteByPlayerId: {},
  finalVoteResult: null,
  endbookVariant: null,
  announcements: [],
  appliedDynamicRuleIds: {},
});

const ensureInvestigationUsageMap = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const usageTemplate = buildInvestigationUsageTemplate(scenario);
  room.players.forEach((player) => {
    room.gameData.investigationUsedByPlayerId[player.id] ??= {
      ...usageTemplate,
    };
    room.gameData.revealedCardsByPlayerId[player.id] ??= [];
  });
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
    const cardIds = room.gameData.revealedCardsByPlayerId[player.id] ?? [];
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

const buildClueVaultCards = (
  scenario: MurderMysteryScenario,
  cardIds: string[],
  cardSourceMap: Record<
    string,
    { sourceTargetIds: string[]; sourceTargetLabels: string[] }
  >
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

      return {
        ...card,
        sourceTargetIds: source.sourceTargetIds,
        sourceTargetLabels: source.sourceTargetLabels,
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

  const selectedRoles = shuffled(scenario.roles).slice(0, room.players.length);
  const shuffledPlayers = shuffled(room.players);

  shuffledPlayers.forEach((player, index) => {
    const role = selectedRoles[index];
    room.gameData.roleByPlayerId[player.id] = role.id;
    room.gameData.roleDisplayNameByPlayerId[player.id] = role.displayName;
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
  assignMurderMysteryRoles(room, scenario);

  const firstStep = scenario.flow.steps[0];
  if (!firstStep) {
    throw new Error('진행 단계(flow.steps)가 정의되지 않았습니다.');
  }

  applyPhaseWithTimer(room, scenario, firstStep.id);
  room.gameData.pendingInvestigations = [];
  room.gameData.revealedCardIds = [];
  room.gameData.revealedCardIdsByTargetId = {};
  room.gameData.revealedPartIds = [];
  room.gameData.voteByPlayerId = {};
  room.gameData.finalVoteResult = null;
  room.gameData.endbookVariant = null;
  room.gameData.appliedDynamicRuleIds = {};
  room.gameData.announcements = [];

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
  targetId: string
) => {
  const round = getInvestigationRoundByPhase(room.gameData.phase, scenario);
  if (!round) {
    throw new Error('지금은 조사 단계가 아닙니다.');
  }

  const usageTemplate = buildInvestigationUsageTemplate(scenario);
  const usage = room.gameData.investigationUsedByPlayerId[playerId] ?? {
    ...usageTemplate,
  };

  if (usage[round]) {
    throw new Error('이번 라운드 조사 기회를 이미 사용했습니다.');
  }

  const roundConfig = getRoundConfig(scenario, round);
  if (!roundConfig) {
    throw new Error('조사 라운드 설정을 찾을 수 없습니다.');
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
    [round]: true,
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

export const submitMurderMysteryVote = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario,
  playerId: string,
  suspectPlayerId: string
) => {
  const step = getFlowStepByPhase(scenario, room.gameData.phase);
  if (step?.kind !== 'final_vote') {
    throw new Error('지금은 최종 투표 단계가 아닙니다.');
  }

  const suspectExists = room.players.some(
    (player) => player.id === suspectPlayerId
  );
  if (!suspectExists) {
    throw new Error('지목한 플레이어를 찾을 수 없습니다.');
  }

  room.gameData.voteByPlayerId[playerId] = suspectPlayerId;
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
  Object.values(room.gameData.voteByPlayerId).forEach((suspectPlayerId) => {
    tally[suspectPlayerId] = (tally[suspectPlayerId] ?? 0) + 1;
  });

  const tallyEntries = Object.entries(tally);
  const maxVoteCount = tallyEntries.reduce(
    (max, [, count]) => Math.max(max, count),
    0
  );
  const topEntries = tallyEntries.filter(([, count]) => count === maxVoteCount);
  const suspectPlayerId = topEntries.length === 1 ? topEntries[0][0] : null;
  const suspectRoleId = suspectPlayerId
    ? room.gameData.roleByPlayerId[suspectPlayerId]
    : null;
  const matched = Boolean(
    suspectRoleId && suspectRoleId === scenario.finalVote.correctRoleId
  );

  const result: MurderMysteryFinalVoteResult = {
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

  const myCardIds = player
    ? (room.gameData.revealedCardsByPlayerId[player.id] ?? [])
    : [];
  const myCards = myCardIds
    .map((cardId) => getCardById(scenario, cardId))
    .filter(Boolean) as MurderMysteryCardScenario[];

  const cardSourceMap = buildCardSourceMap(room, scenario);
  const clueVaultMyClues = buildClueVaultCards(
    scenario,
    myCardIds,
    cardSourceMap
  );
  const clueVaultPublicClues = buildClueVaultCards(
    scenario,
    room.gameData.revealedCardIds,
    cardSourceMap
  );

  const round = getInvestigationRoundByPhase(room.gameData.phase, scenario);
  const roundConfig = round ? getRoundConfig(scenario, round) : undefined;

  const targetsWithProgress = (roundConfig?.targets ?? []).map((target) => {
    const remainingClues = getRemainingCardIdsByTarget(
      room,
      scenario,
      target.id,
      target.cardPool
    ).length;
    const totalClues = target.cardPool.length;
    const revealedClues = Math.max(totalClues - remainingClues, 0);

    return {
      ...target,
      totalClues,
      revealedClues,
      remainingClues,
      isExhausted: remainingClues === 0,
    };
  });

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
    phase: room.gameData.phase,
    phaseOrder: getMurderMysteryPhaseOrder(scenario),
    players: room.players.map((entry) => ({
      id: entry.id,
      name: entry.name,
      socketId: entry.socketId,
      displayName:
        room.gameData.roleDisplayNameByPlayerId[entry.id] ?? entry.name,
      statusText:
        (entry as { statusText?: '감시' | '격리' | '결박' }).statusText ??
        '감시',
    })),
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
      used: round ? Boolean(usage[round]) : false,
      targets: targetsWithProgress,
    },
    finalVote: {
      question: scenario.finalVote.question,
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
