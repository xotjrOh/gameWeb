// user 선언부 지우고 import만 하면 끝난다
import { configureStore } from '@reduxjs/toolkit'
import loadingSlice from './store/loadingSlice.js'
import roomSlice from './store/roomSlice.js'
import horseSlice from './store/horseSlice.js'
import toastSlice from './store/toastSlice.js'

export default configureStore({
  reducer: { 
	  loading: loadingSlice.reducer,
	  room : roomSlice.reducer,
	  horse : horseSlice.reducer,
	  toast : toastSlice.reducer,
  },
  devTools : true,
}) 