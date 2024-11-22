import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Player } from '@/types/room';
import { ShufflePlayerData, ShuffleGameData } from '@/types/shuffle';

interface ShuffleInitialState {
  players: (Player & ShufflePlayerData)[];
  gameData: ShuffleGameData;
  statusInfo: Player & ShufflePlayerData;
}

const initialState: ShuffleInitialState = {
  players: [],
  gameData: {
    correctOrder: ['A', 'B', 'C', 'D'],
    clips: [
      // 섞인 클립 정보
      { id: 'A', start: 30, end: 33 },
      // ...
    ],
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
  },
};

const shuffleSlice = createSlice({
  name: 'shuffle',
  initialState,
  reducers: {
    setPlayers(state, action: PayloadAction<(Player & ShufflePlayerData)[]>) {
      state.players = action.payload;
    },
    setGameData(state, action: PayloadAction<ShuffleGameData>) {
      state.gameData = action.payload;
    },
    setStatusInfo(state, action: PayloadAction<Player & ShufflePlayerData>) {
      state.statusInfo = action.payload;
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
  updateAnswer,
  updateIsAlive,
} = shuffleSlice.actions; // state 변경함수들 남음
export default shuffleSlice;
