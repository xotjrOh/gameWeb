import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Player } from '@/types/room';
import {
  ShufflePlayerData,
  ShuffleGameData,
  EvaluationResult,
} from '@/types/shuffle';

interface ShuffleInitialState {
  players: (Player & ShufflePlayerData)[];
  gameData: ShuffleGameData;
  statusInfo: Player & ShufflePlayerData;
  lastRoundResults: EvaluationResult[];
  lastRoundCorrectOrder: string[];
}

const initialState: ShuffleInitialState = {
  players: [],
  gameData: {
    correctOrder: [],
    clips: [],
    difficulty: undefined,
    roundIndex: 0,
    rankingRoundsTotal: 0,
    rankingLocked: false,
    rankingWinners: [],
    currentPhase: 'waiting', // 'playing', 'answering', 'result'
    isTimeover: true,

    timeLeft: 0,
  },
  statusInfo: {
    id: 'sessionId',
    name: '접속한 닉네임',
    socketId: 'socketId',

    answer: null,
    isAlive: true,
    isAnswerSubmitted: false,
    score: 0,
  },
  lastRoundResults: [],
  lastRoundCorrectOrder: [],
};

const shuffleSlice = createSlice({
  name: 'shuffle',
  initialState,
  reducers: {
    setPlayers(state, action: PayloadAction<(Player & ShufflePlayerData)[]>) {
      state.players = action.payload ?? [];
    },
    setGameData(state, action: PayloadAction<ShuffleGameData>) {
      state.gameData = action.payload;
    },
    setStatusInfo(state, action: PayloadAction<Player & ShufflePlayerData>) {
      state.statusInfo = action.payload;
    },
    setLastRoundResults(state, action: PayloadAction<EvaluationResult[]>) {
      state.lastRoundResults = action.payload ?? [];
    },
    setLastRoundCorrectOrder(state, action: PayloadAction<string[]>) {
      state.lastRoundCorrectOrder = action.payload ?? [];
    },
    updateAnswer(state, action: PayloadAction<string[] | null>) {
      state.statusInfo.answer = action.payload;
    },
    updateIsAlive(state, action: PayloadAction<boolean>) {
      state.statusInfo.isAlive = action.payload;
    },
  },
});

export const {
  setPlayers,
  setGameData,
  setStatusInfo,
  setLastRoundResults,
  setLastRoundCorrectOrder,
  updateAnswer,
  updateIsAlive,
} = shuffleSlice.actions; // state 변경함수들 남음
export default shuffleSlice;
