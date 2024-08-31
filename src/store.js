// user 선언부 지우고 import만 하면 끝난다
import { configureStore } from '@reduxjs/toolkit'
import roomSlice from './store/roomSlice.js'
import socketSlice from './store/socketSlice.js'


export default configureStore({
  reducer: { 
	  room : roomSlice.reducer,
	  socket: socketSlice.reducer,
  },
  devTools : true,
}) 