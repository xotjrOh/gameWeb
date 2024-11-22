import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LoadingInitialState {
  isLoading: boolean;
}

const initialState: LoadingInitialState = {
  isLoading: false,
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    setIsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
  },
});

export const { setIsLoading } = loadingSlice.actions;
export default loadingSlice;
