import { MurderMysteryRoom, Room } from '@/types/room';
import {
  MurderMysteryInvestigationRound,
  MurderMysteryPhase,
  MurderMysteryScenario,
} from '@/types/murderMystery';

export const toMurderMysteryRoom = (room: Room): MurderMysteryRoom => {
  if (room.gameType !== 'murder_mystery') {
    throw new Error('머더미스터리 방이 아닙니다.');
  }
  return room;
};

export const ensureMurderMysteryHost = (
  room: MurderMysteryRoom,
  sessionId: string
) => {
  if (room.host.id !== sessionId) {
    throw new Error('GM(방장)만 실행할 수 있습니다.');
  }
};

export const canUseMurderMysteryGameMasterControls = (
  room: MurderMysteryRoom
) => !room.gameData.hostParticipatesAsPlayer;

export const ensureMurderMysteryGameMaster = (
  room: MurderMysteryRoom,
  sessionId: string
) => {
  ensureMurderMysteryHost(room, sessionId);
  if (!canUseMurderMysteryGameMasterControls(room)) {
    throw new Error(
      '방장이 플레이어로 참가 중일 때는 이 진행자 전용 기능을 사용할 수 없습니다.'
    );
  }
};

export const getMurderMysteryPhaseOrder = (
  scenario: MurderMysteryScenario
): MurderMysteryPhase[] => [
  'LOBBY',
  ...scenario.flow.steps.map((step) => step.id),
];

export const getFlowStepByPhase = (
  scenario: MurderMysteryScenario,
  phase: MurderMysteryPhase
) => scenario.flow.steps.find((step) => step.id === phase) ?? null;

export const getInvestigationRoundByPhase = (
  phase: MurderMysteryPhase,
  scenario: MurderMysteryScenario
): MurderMysteryInvestigationRound | null => {
  const step = getFlowStepByPhase(scenario, phase);
  if (!step || step.kind !== 'investigate' || !step.round) {
    return null;
  }
  return step.round;
};

export const ensureAllowedPhase = (
  room: MurderMysteryRoom,
  allowed: MurderMysteryPhase[]
) => {
  if (!allowed.includes(room.gameData.phase)) {
    throw new Error(
      `현재 단계(${room.gameData.phase})에서는 실행할 수 없습니다.`
    );
  }
};

export const getNextPhase = (
  current: MurderMysteryPhase,
  scenario: MurderMysteryScenario
): MurderMysteryPhase | null => {
  const order = getMurderMysteryPhaseOrder(scenario);
  const index = order.indexOf(current);
  if (index < 0) {
    return null;
  }
  return order[index + 1] ?? null;
};

export const ensureScenarioPlayerCount = (
  room: MurderMysteryRoom,
  scenario: MurderMysteryScenario
) => {
  const playerCount = room.players.length;
  const playerCountRule = room.gameData.hostParticipatesAsPlayer
    ? '방장을 포함한 인원'
    : '방장을 제외한 인원';

  if (playerCount !== room.maxPlayers) {
    throw new Error(
      `현재 ${playerCountRule}은 ${playerCount}명이며, 게임 시작을 위해 정확히 ${room.maxPlayers}명이 필요합니다.`
    );
  }

  if (
    playerCount < scenario.players.min ||
    playerCount > scenario.players.max
  ) {
    throw new Error(
      `이 시나리오는 ${playerCountRule} ${scenario.players.min}~${scenario.players.max}명에서만 시작할 수 있습니다.`
    );
  }
};
