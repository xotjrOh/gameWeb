import { CommonResponse } from '@/types/socket';

// 말의 위치 정보 타입 정의
export interface HorsePosition {
  name: string;
  position: number;
}

// 라운드 진행 데이터 타입 정의
export interface RoundData {
  horse: string;
  chips: number;
  progress?: number; // 칩만 업데이트하고, 추후에 progress를 계산하기때문
}

// 말 경주 게임 데이터 타입 정의
export interface HorseGameData {
  finishLine: number;
  horses: string[];
  positions: HorsePosition[]; // 말의 위치 정보를 가진 배열
  rounds: RoundData[][]; // 각 라운드별 데이터 배열
  bets: { [horse: string]: number };
  isTimeover: boolean;
  isRoundStarted: boolean;
  timeLeft: number;
  rankingLocked?: boolean;
}

// 말 경주 플레이어 데이터 타입 정의
// extends Player 유무는 리팩토링 이후에 결정
export interface HorsePlayerData {
  dummyName: string;
  horse: string;
  isSolo: boolean;
  chips: number;
  chipDiff: number;
  rounds: RoundData[][];
  voteHistory: string[];
  isBetLocked: boolean;
  isVoteLocked: boolean;
  memo: string[];
}

export interface HorseClientToServerEvents {
  'horse-start-round': (
    data: { roomId: string; duration: number },
    callback: (response: CommonResponse) => void
  ) => void;
  'horse-assign-roles': (
    data: { roomId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  'horse-bet': (
    data: {
      roomId: string;
      sessionId: string;
      bets: { [key: string]: number };
    },
    callback: (
      response: CommonResponse & {
        remainChips?: number;
        personalRounds?: RoundData[][];
        isBetLocked?: boolean;
      }
    ) => void
  ) => void;
  'horse-vote': (
    data: { roomId: string; sessionId: string; selectedHorse: string },
    callback: (
      response: CommonResponse & {
        voteHistory?: string[];
        isVoteLocked?: boolean;
      }
    ) => void
  ) => void;
  'horse-update-settings': (
    data: { roomId: string; finishLine: number },
    callback: (response: CommonResponse) => void
  ) => void;
  'horse-get-game-data': (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  'horse-new-game': (
    data: { roomId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  'horse-update-memo': (
    data: { roomId: string; index: number; memo: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  // ... 추가 Horse 게임 이벤트들
}

export interface HorseServerToClientEvents {
  'personal-round-update': (roundData: RoundData[][]) => void;
  'vote-history-update': (voteHistory: string[]) => void;
  'update-chip': (chip: number) => void;
  'update-chipDiff': (chipDiff: number) => void;
  'update-positions': (positions: {
    horsesData: HorsePosition[];
    rounds: RoundData[][];
  }) => void;
  'game-ended': (result: {
    winners: { horse: string; playerNames: string[] }[];
    losers: { horse: string; playerNames: string[] }[];
  }) => void;
  'status-update': (player: Player & HorsePlayerData) => void;
  'update-isBetLocked': (isBetLocked: boolean) => void;
  'update-isVoteLocked': (isVoteLocked: boolean) => void;
  'update-timer': (timeLeft: number) => void;
  'horse-all-data-update': (data: {
    players: (Player & HorsePlayerData)[];
    gameData: HorseGameData;
    statusInfo: Player & HorsePlayerData;
  }) => void;

  'round-ended': (data: {
    players: (Player & HorsePlayerData)[];
    roundResult: RoundData[];
  }) => void;
  'roles-assigned': (data: {
    success: boolean;
    horses: string[];
    players: Player[];
  }) => void;
  'update-finishLine': (finishLine: number) => void;
  // ... 추가 Horse 게임 이벤트들
}
