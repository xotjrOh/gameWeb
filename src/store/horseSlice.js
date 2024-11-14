import { createSlice } from '@reduxjs/toolkit';

const horseSlice = createSlice({
  name: 'horse',
  initialState: {
    players: [
      // { dummyName: 'player1', chips: 20 },
      // { dummyName: 'player2', chips: 20 },
    ],
    gameData: {
      horses: [], // ['A', 'B', 'C'],
      positions: [
        // { name: 'A', position: 2 },
        // { name: 'B', position: 3 },
      ],
      finishLine: 9,
      isTimeover: true,
      isRoundStarted: false,
      rounds: [
        [
          // 1R
          // { horse : "A", chips: 13, progress: 2},
          // { horse : "C", chips: 13, progress: 2},
          // { horse : "B", chips: 7,  progress: 1},
        ],
        // [ // 2R
        // 	{ horse : "C", chips: 10, progress: 2},
        // 	{ horse : "A", chips: 9,  progress: 1},
        // 	{ horse : "B", chips: 7,  progress: 0},
        // ],
      ],
      timeLeft: 0,
    },
    statusInfo: {
      dummyName: '할당되지않음',
      horse: '할당되지않음',
      isSolo: false,
      chips: 0,
      chipDiff: 0,
      rounds: [],
      voteHistory: [],
      isBetLocked: false,
      isVoteLocked: false,
      memo: [],
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

    updateHorses(state, action) {
      state.gameData.horses = action.payload; // horses 필드만 업데이트
    },
    updatePositions(state, action) {
      state.gameData.positions = action.payload; // positions 필드만 업데이트
    },
    updateFinishLine(state, action) {
      state.gameData.finishLine = action.payload; // finishLine 필드만 업데이트
    },
    updateIsTimeover(state, action) {
      state.gameData.isTimeover = action.payload; // isTimeover 필드만 업데이트
    },

    updateChip(state, action) {
      state.statusInfo.chips = action.payload; // statusInfo.chip 필드만 업데이트
    },
    updateChipDiff(state, action) {
      state.statusInfo.chipDiff = action.payload; // statusInfo.chipDiff 필드만 업데이트
    },
    updatePersonalRounds(state, action) {
      state.statusInfo.rounds = action.payload; // statusInfo.rounds 필드만 업데이트
    },
    updateVoteHistory(state, action) {
      state.statusInfo.voteHistory = action.payload; // statusInfo.rounds 필드만 업데이트
    },
    updateIsBetLocked(state, action) {
      state.statusInfo.isBetLocked = action.payload; // statusInfo.isBetLocked 필드만 업데이트
    },
    updateIsVoteLocked(state, action) {
      state.statusInfo.isVoteLocked = action.payload; // statusInfo.isVoteLocked 필드만 업데이트
    },
    updateMemo(state, action) {
      const { index, memo } = action.payload; // statusInfo.memo 필드만 업데이트
      state.statusInfo.memo[index] = memo;
    },

    updateIsRoundStarted(state, action) {
      state.gameData.isRoundStarted = action.payload; // isRoundStarted 필드만 업데이트
    },
    updateRounds(state, action) {
      state.gameData.rounds = action.payload; // rounds 필드만 업데이트
    },
  },
});

export const {
  setPlayers,
  setGameData,
  setStatusInfo,

  updateHorses,
  updatePositions,
  updateFinishLine,
  updateIsTimeover,
  updateChip,
  updateChipDiff,
  updatePersonalRounds,
  updateVoteHistory,
  updateIsBetLocked,
  updateIsVoteLocked,
  updateMemo,
  updateIsRoundStarted,
  updateRounds,
} = horseSlice.actions; // state 변경함수들 남음
export default horseSlice;
