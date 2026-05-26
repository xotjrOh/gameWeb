import { Backdrop, CircularProgress } from '@mui/material';

export default function Loading() {
  return (
    <Backdrop
      open
      transitionDuration={0}
      style={{
        pointerEvents: 'none',
      }}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}
