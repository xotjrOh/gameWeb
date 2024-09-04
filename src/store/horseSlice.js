import { createSlice } from '@reduxjs/toolkit'

const horseSlice = createSlice({
	name : 'horse',
	initialState: {
		gameData : {
			horses : ['A', 'B', 'C'],
			chip: 20,
			players : [
				{ dummyName: 'player1', chip: 20 },
				{ dummyName: 'player2', chip: 20 },
			],
			positions: [
				{ name: 'A', position: 2 },
				{ name: 'B', position: 3 },
			],
			finishLine: 9,
			statusInfo: { dummyName: '할당되지않음', horse: '할당되지않음', isSolo: false },

			isRoundStarted : false,
		}
	},
	reducers : {
		setGameData(state, action) {
			state.gameData = action.payload;
		},

		updateHorses(state, action) {
			state.gameData.horses = action.payload;  // horses 필드만 업데이트
		},
		updateChip(state, action) {
			state.gameData.chip = action.payload;  // chip 필드만 업데이트
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
		updateStatusInfo(state, action) {
			state.gameData.statusInfo = action.payload;  // statusInfo 필드만 업데이트
		},

		// todo : 새로고침시 별도의 로직 필요. length
		updateIsRoundStarted(state, action) {
			state.gameData.isRoundStarted = action.payload;  // isRoundStarted 필드만 업데이트
		},
	}
});

export const { setGameData, updateHorses, updateChip, updatePlayers, updatePositions, updateFinishLine, updateStatusInfo,
	updateIsRoundStarted } = horseSlice.actions; // state 변경함수들 남음
export default horseSlice;