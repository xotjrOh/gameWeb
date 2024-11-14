// 말의 위치 정보 타입 정의
export interface HorsePosition {
  name: string;
  position: number;
}

// 라운드 진행 데이터 타입 정의
export interface RoundData {
  horse: string;
  chips: number;
  progress: number;
}

// 말 경주 게임 데이터 타입 정의
export interface HorseGameData {
  finishLine: number;
  horses: string[];
  positions: HorsePosition[]; // 말의 위치 정보를 가진 배열
  rounds: RoundData[][]; // 각 라운드별 데이터 배열
  isTimeover: boolean;
  isRoundStarted: boolean;
  timeLeft: number;
}

// 말 경주 플레이어 데이터 타입 정의
export interface HorsePlayerData {
  dummyName: string;
  horse: string;
  isSolo: boolean;
  chips: number;
  chipDiff: number;
  rounds: RoundData[];
  voteHistory: string[];
  isBetLocked: boolean;
  isVoteLocked: boolean;
  memo: string[];
}
