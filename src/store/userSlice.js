// src/store/userSlice.js
import { createSlice } from '@reduxjs/toolkit'

let rooms = createSlice({
	name : 'rooms',
	initialState: "kim",
	reducers : {
		// 보통 두번째 인자는 action이라고 작명한다
		setUser(state, user){ // state는 기존 state값을 의미, user는 입력된 인자값
			return user.payload // 기존 state값이 return값으로 대체됨
		}
	}
})

export let { setUser } = user.actions // state 변경함수들 남음
export default user