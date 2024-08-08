// 보관소 /src/store.js
// user 선언부 지우고 import만 하면 끝난다
import { configureStore, createSlice } from '@reduxjs/toolkit'
import user from './store/userSlice.js'

// array, object일때 수정함수는 좀 다름. return 안써도됨
// Immer.js 가 자동설치되어 도움을 주기 때문 -> state 복사본을 return 해준다
let stock = createSlice({
	name : 'stock',
	initialState: [10, 11, 12],
	reducers : {
		setStock(state){ // state는 기존 state값을 의미
			state[1] = 100
		}
	}
})
export let { setStock } = stock.actions

let cart = createSlice({
	name: "cart",
	initialState : [
		{ id:0, name: "white and black", count:2 },
		{ id:2, name: "Grey Yordan", count:1 }
	],
	reducers : {
		addCount(state, action){
			let index = state.findIndex((a)=>{ return a.id == action.payload })
			state[index].count++
		}
	}
})

export default configureStore({
  reducer: { 
	  작명 : user.reducer,
	  stock: stock.reducer,
  }
}) 