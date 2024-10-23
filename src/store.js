import { configureStore } from '@reduxjs/toolkit'
import loadingSlice from './store/loadingSlice.js'
import roomSlice from './store/roomSlice.js'
import horseSlice from './store/horseSlice.js'
import shuffleSlice from './store/shuffleSlice.js'

export default configureStore({
  reducer: { 
	  loading: loadingSlice.reducer,
	  room : roomSlice.reducer,
	  horse : horseSlice.reducer,
	  shuffle : shuffleSlice.reducer,
  },
  devTools : true,
}) 