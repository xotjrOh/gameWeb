import { HorseGameData, HorsePlayerData } from '@/types/horse';
import { ShuffleGameData, ShufflePlayerData } from '@/types/shuffle';

export const AUTHORIZED_SESSION_IDS = ['3624891095', '116463162791834863252'];
export const MIN_PLAYER_LENGTH = 1;
export const MAX_NICKNAME_LENGTH = 10;
export const NOT_ASSIGNED = '할당되지않음';

export const MESSAGES = {
  ROOM_NOT_FOUND: '방이 존재하지 않습니다.',
  ROOM_FULL: '방이 가득찼습니다.',
  GAME_ALREADY_STARTED: '이미 게임이 시작되었습니다.',
  NICKNAME_ALREADY_IN_USE:
    '이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.',
  CANNOT_LEAVE_DURING_GAME:
    '게임이 진행 중입니다. 게임이 끝나기 전까지 방을 나갈 수 없습니다.',
  ONLY_HOST_CAN_CLOSE_ROOM: '방장만이 방을 종료할 수 있습니다.',
  ROOM_CLOSED_BY_HOST: '방장이 방을 종료했습니다.',
  NOT_ALL_PLAYERS_ASSIGNED: '모든 플레이어에게 말이 할당되지 않았습니다.',
  NICKNAME_REQUIRED: '닉네임을 정해주세요.',
  NICKNAME_TOO_LONG: `닉네임은 ${MAX_NICKNAME_LENGTH}자 이하로 입력해주세요.`,
  NOT_A_PARTICIPANT: '당신은 게임 참가자가 아닙니다.',
  INSUFFICIENT_CHIPS: '칩이 부족합니다.',
  CREATE_ROOM_AUTH_REQUIRED: '방을 만들기 위해서는 오태석에게 문의하세요.',
  ROOM_NAME_REQUIRED: '방이름을 정해주세요.',
  GAME_TYPE_REQUIRED: '게임종류를 정해주세요.',
  MAX_PLAYERS_INVALID: `최대 플레이어 수는 ${MIN_PLAYER_LENGTH} 이상의 정수여야 합니다.`,

  ALREADY_IN_ANOTHER_ROOM: (roomName: string) =>
    `이미 참여중인 게임방(${roomName})이 있습니다.`,
} as const;

export const GAME_STATUS = {
  PENDING: '대기중',
  IN_PROGRESS: '게임중',
} as const;

export const DEFAULT_GAME_DATA: {
  horse: HorseGameData;
  shuffle: ShuffleGameData;
} = {
  horse: {
    finishLine: 9,
    horses: [],
    positions: [],
    rounds: [],
    isTimeover: true,
    isRoundStarted: false,
    timeLeft: 0,
  },
  shuffle: {
    correctOrder: ['A', 'B', 'C', 'D'],
    clips: [{ id: 'A', start: 30, end: 33 }],
    currentPhase: 'waiting',
    isTimeover: true,
    timeLeft: 0,
  },
} as const;

export const DEFAULT_PLAYER_DATA: {
  horse: HorsePlayerData;
  shuffle: ShufflePlayerData;
} = {
  horse: {
    dummyName: NOT_ASSIGNED,
    horse: NOT_ASSIGNED,
    isSolo: false,
    chips: 0,
    chipDiff: 0,
    rounds: [],
    voteHistory: [],
    isBetLocked: false,
    isVoteLocked: false,
    memo: [],
  },
  shuffle: {
    answer: [],
    isAlive: true,
  },
} as const;
