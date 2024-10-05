'use client';

import { SnackbarProvider } from 'notistack';

export default function ToastProvider({ children }) {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      autoHideDuration={3000} // 자동 숨김 시간 설정
      preventDuplicate
    >
      {children}
    </SnackbarProvider>
  );
}
