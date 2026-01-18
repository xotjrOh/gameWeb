import { CommonResponse } from '@/types/socket';

export interface VideoData {
  difficulty: string;
  videoId: string;
  full: { start: number; end: number };
  clips: { start: number; end: number }[];
}

export interface Clip {
  id: string;
  start: number;
  end: number;
}

// 섞기 게임 데이터 타입 정의
export interface ShuffleGameData {
  correctOrder: string[];
  clips: Clip[];
  difficulty?: '하' | '중' | '상';
  currentPhase: 'waiting' | 'playing' | 'answering' | 'result';
  isTimeover?: boolean;
  timeLeft?: number;
}

// 섞기 게임 플레이어 데이터 타입 정의
export interface ShufflePlayerData {
  answer: string[] | null;
  isAlive: boolean;
  isAnswerSubmitted: boolean;
  score: number;
}

export interface EvaluationResult {
  id: string;
  name: string;
  roundScore: number;
  totalScore: number;
}

export interface ShuffleClientToServerEvents {
  'shuffle-start-game': (
    data: { roomId: string; settings: Partial<ShuffleGameData> },
    callback: (response: CommonResponse) => void
  ) => void;
  'shuffle-reset-round': (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  'shuffle-end-round': (
    data: { roomId: string; sessionId: string },
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
  'shuffle-players-update': (data: {
    players: (Player & ShufflePlayerData)[];
  }) => void;
  'shuffle-round-reset': (data: {
    gameData: ShuffleGameData;
    players: (Player & ShufflePlayerData)[];
  }) => void;
  'shuffle-round-results': (data: {
    results: EvaluationResult[];
    correctOrder: string[];
    players: (Player & ShufflePlayerData)[];
    gameData: ShuffleGameData;
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
