import { createSlice } from '@reduxjs/toolkit';

const shuffleSlice = createSlice({
  name: 'shuffle',
  initialState: {
    players: [],
    gameData: {
      videoUrl: 'https://www.youtube.com/watch?v=Gh-M6yHqpDc&t=160s',
      startTime: 30,
      interval: 3,
      clipCount: 4,
      clips: [
        // 섞인 클립 정보
        { id: 'A', start: 30, end: 33 },
        // ...
      ],
      correctOrder: ['A', 'B', 'C', 'D'],
      currentPhase: 'waiting', // 'playing', 'answering', 'result'
      isTimeover: true,

      timeLeft: 0,
    },
    statusInfo: {
      answer: null,
      isAlive: true,
    },
  },
  reducers: {
    setPlayers(state, action) {
      state.players = action.payload;
    },
    setGameData(state, action) {
      state.gameData = action.payload;
    },
    setStatusInfo(state, action) {
      state.statusInfo = action.payload;
    },
    updateAnswer(state, action) {
      state.statusInfo.answer = action.payload;
    },
    updateIsAlive(state, action) {
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
