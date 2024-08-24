import { createSlice } from '@reduxjs/toolkit'
// rooms[roomName] = {
// 	roomName,
// 	gameType,
// 	host: userName,
// 	players: [userName],
// 	gameData: {},
// 	status: '대기 중',
// 	maxPlayers,
//   };

let roomSlice = createSlice({
	name : 'room',
	initialState: {
		rooms: {},
	},
	reducers : {
		setRooms(state, action) {
			state.rooms = action.payload;
		},
	}
})

export let { setRooms } = roomSlice.actions // state 변경함수들 남음
export default roomSlice