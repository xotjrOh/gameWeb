import { createSlice } from '@reduxjs/toolkit'

const horseSlice = createSlice({
	name : 'horse',
	initialState: {
		gameData : {
			horses : ['A', 'B', 'C'],
			players : [
				{ dummyName: 'player1', chips: 20 },
				{ dummyName: 'player2', chips: 20 },
			],
			positions: [
				{ name: 'A', position: 2 },
				{ name: 'B', position: 3 },
			],
			finishLine: 9,
			isTimeover: true,
			statusInfo: { dummyName: '할당되지않음', horse: '할당되지않음', isSolo: false, chips: 0, rounds: [], voteHistory:[], isBetLocked: false, isVoteLocked: false },

			isRoundStarted : false,
			rounds: [
				[ // 1R
					{ horse : "A", chips: 13, progress: 2},
					{ horse : "C", chips: 13, progress: 2},
					{ horse : "B", chips: 7,  progress: 1},
				],
				[ // 2R
					{ horse : "C", chips: 10, progress: 2},
					{ horse : "A", chips: 9,  progress: 1},
					{ horse : "B", chips: 7,  progress: 0},
				],
			],
		}
	},
	reducers : {
		setGameData(state, action) {
			state.gameData = action.payload;
		},

		updateHorses(state, action) {
			state.gameData.horses = action.payload;  // horses 필드만 업데이트
		},
		updatePlayers(state, action) {
			state.gameData.players = action.payload;  // players 필드만 업데이트
		},
		updatePositions(state, action) {
			state.gameData.positions = action.payload;  // positions 필드만 업데이트
		},
		updateFinishLine(state, action) {
			state.gameData.finishLine = action.payload;  // finishLine 필드만 업데이트
		},
		updateIsTimeover(state, action) {
			state.gameData.isTimeover = action.payload;  // isTimeover 필드만 업데이트
		},
		updateStatusInfo(state, action) {
			state.gameData.statusInfo = action.payload;  // statusInfo 필드만 업데이트
		},
		updateChip(state, action) {
			state.gameData.statusInfo.chips = action.payload;  // statusInfo.chip 필드만 업데이트
		},
		updatePersonalRounds(state, action) {
			console.log("여기", action.payload);
			state.gameData.statusInfo.rounds = action.payload;  // statusInfo.rounds 필드만 업데이트
		},
		updateVoteHistory(state, action) {
			console.log("voteHistory slice", action.payload);
			state.gameData.statusInfo.voteHistory = action.payload;  // statusInfo.rounds 필드만 업데이트
		},
		updateIsBetLocked(state, action) {
			state.gameData.statusInfo.isBetLocked = action.payload;  // statusInfo.isBetLocked 필드만 업데이트
		},
		updateIsVoteLocked(state, action) {
			state.gameData.statusInfo.isVoteLocked = action.payload;  // statusInfo.isVoteLocked 필드만 업데이트
		},

		updateIsRoundStarted(state, action) {
			state.gameData.isRoundStarted = action.payload;  // isRoundStarted 필드만 업데이트
		},
		updateRounds(state, action) {
			state.gameData.rounds = action.payload;  // rounds 필드만 업데이트
		},
	}
});

export const { setGameData, updateHorses, updatePlayers, updatePositions, updateFinishLine, updateIsTimeover, updateStatusInfo, 
	updateChip, updatePersonalRounds, updateVoteHistory, updateIsBetLocked, updateIsVoteLocked,
	updateIsRoundStarted, updateRounds } = horseSlice.actions; // state 변경함수들 남음
export default horseSlice;