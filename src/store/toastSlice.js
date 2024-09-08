import { createSlice } from '@reduxjs/toolkit';

const toastSlice = createSlice({
  name: 'toast',
  initialState: {
    toasts: []  // 여러 개의 Toast를 배열로 관리
  },
  reducers: {
    showToast: (state, action) => {
      state.toasts.push({
        id: Date.now(),  // 고유 ID 부여
        message: action.payload.message,
        type: action.payload.type,
      });
    },
    hideToast: (state, action) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);  // 특정 Toast 제거
    },
  },
});

export const { showToast, hideToast } = toastSlice.actions;
export default toastSlice;
