import { CommonResponse } from '@/types/socket';

export interface Clip {
  id: string;
  start: number;
  end: number;
}

// 섞기 게임 데이터 타입 정의
export interface ShuffleGameData {
  correctOrder: string[];
  clips: Clip[];
  currentPhase: 'waiting' | 'playing' | 'answering' | 'result';
  isTimeover?: boolean;
  timeLeft?: number;
}

// 섞기 게임 플레이어 데이터 타입 정의
export interface ShufflePlayerData {
  answer: string[] | null;
  isAlive: boolean;
}

export interface EvaluationResult {
  id: string;
  name: string;
  isAlive: boolean;
}

export interface ShuffleClientToServerEvents {
  'shuffle-start-game': (
    data: { roomId: string; settings: Partial<ShuffleGameData> },
    callback: (response: CommonResponse) => void
  ) => void;
  'shuffle-submit-answer': (
    data: { roomId: string; sessionId: string; answer: string[] },
    callback: (response: CommonResponse) => void
  ) => void;
  'shuffle-get-game-data': (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  // ... 추가 Shuffle 게임 이벤트들
}

export interface ShuffleServerToClientEvents {
  'shuffle-start-answering': () => void;
  'shuffle-round-results': (data: {
    results: EvaluationResult[];
    correctOrder: string;
  }) => void;
  'shuffle-game-started': (data: {
    clips: Clip[];
    gameData: ShuffleGameData;
    players: Player[];
  }) => void;

  'shuffle-game-ended': (data: {
    players: (Player & ShufflePlayerData)[];
  }) => void;
  'shuffle-game-data-update': (data: {
    gameData: ShuffleGameData;
    players: (Player & ShufflePlayerData)[];
    statusInfo: Player & ShufflePlayerData;
  }) => void;
  // ... 추가 Shuffle 게임 이벤트들
}
