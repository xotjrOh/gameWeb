import { createSlice } from '@reduxjs/toolkit'

const chipSlice = createSlice({
	name : 'chip',
	initialState: {
		chip: 20,
	},
	reducers : {
		setChip(state, action) {
			state.chip = action.payload;
		},
	}
})

export const { setChip } = chipSlice.actions // state 변경함수들 남음
export default chipSlice