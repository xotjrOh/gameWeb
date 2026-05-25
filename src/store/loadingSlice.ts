import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LoadingReason =
  | 'create-room'
  | 'join-room'
  | 'route-check'
  | 'socket-disconnect'
  | null;

interface LoadingInitialState {
  isLoading: boolean;
  reason: LoadingReason;
}

const initialState: LoadingInitialState = {
  isLoading: false,
  reason: null,
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    setIsLoading(
      state,
      action: PayloadAction<
        boolean | { isLoading: boolean; reason?: LoadingReason }
      >
    ) {
      if (typeof action.payload === 'boolean') {
        state.isLoading = action.payload;
        state.reason = null;
        return;
      }

      state.isLoading = action.payload.isLoading;
      state.reason = action.payload.isLoading
        ? (action.payload.reason ?? null)
        : null;
    },
  },
});

export const { setIsLoading } = loadingSlice.actions;
export default loadingSlice;
