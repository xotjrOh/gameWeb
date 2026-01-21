import { configureStore } from '@reduxjs/toolkit';
import loadingSlice from './store/loadingSlice';
import roomSlice from './store/roomSlice';
import horseSlice from './store/horseSlice';
import shuffleSlice from './store/shuffleSlice';
import animalSlice from './store/animalSlice';

const store = configureStore({
  reducer: {
    loading: loadingSlice.reducer,
    room: roomSlice.reducer,
    horse: horseSlice.reducer,
    shuffle: shuffleSlice.reducer,
    animal: animalSlice.reducer,
  },
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
