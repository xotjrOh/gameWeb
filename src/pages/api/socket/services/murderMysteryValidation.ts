import { MurderMysteryRoom, Room } from '@/types/room';
import {
  MurderMysteryInvestigationRound,
  MurderMysteryPhase,
  MurderMysteryScenario,
} from '@/types/murderMystery';

export const MURDER_MYSTERY_PHASE_ORDER: MurderMysteryPhase[] = [
  'LOBBY',
  'INTRO',
  'ROUND1_DISCUSS',
  'ROUND1_INVESTIGATE',
  'ROUND2_DISCUSS',
  'ROUND2_INVESTIGATE',
  'FINAL_VOTE',
  'ENDBOOK',
];

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

export const getInvestigationRoundByPhase = (
  phase: MurderMysteryPhase
): MurderMysteryInvestigationRound | null => {
  if (phase === 'ROUND1_INVESTIGATE') {
    return 1;
  }
  if (phase === 'ROUND2_INVESTIGATE') {
    return 2;
  }
  return null;
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
  current: MurderMysteryPhase
): MurderMysteryPhase | null => {
  const index = MURDER_MYSTERY_PHASE_ORDER.indexOf(current);
  if (index < 0) {
    return null;
  }
  return MURDER_MYSTERY_PHASE_ORDER[index + 1] ?? null;
};
