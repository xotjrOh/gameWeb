'use client';

import { useAppSelector } from '@/hooks/useAppSelector';
import { Backdrop, CircularProgress } from '@mui/material';

export default function LoadingSpinner() {
  const { isLoading } = useAppSelector((state) => state.loading);
  const shouldShow = isLoading;

  return (
    <Backdrop
      open={shouldShow}
      transitionDuration={0}
      style={{
        zIndex: 9999,
        opacity: shouldShow ? 1 : 0,
        visibility: shouldShow ? 'visible' : 'hidden',
        pointerEvents: shouldShow ? 'auto' : 'none',
      }}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}
