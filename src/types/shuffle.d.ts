// 섞기 게임 데이터 타입 정의
export interface ShuffleGameData {
  videoUrl: string;
  startTime: number;
  interval: number;
  clipCount: number;
  clips: { id: string; start: number; end: number }[];
  correctOrder: string[];
  currentPhase: 'waiting' | 'playing' | 'answering' | 'result';
  isTimeover: boolean;
  timeLeft: number;
}

// 섞기 게임 플레이어 데이터 타입 정의
export interface ShufflePlayerData {
  answer: string | null;
  isAlive: boolean;
}
