import { Typography } from '@mui/material';
import useTimeLeft from '@/hooks/useTimeLeft';

function TimerDisplay({ roomId, socket, dispatch }) {
  const { timeLeft } = useTimeLeft(roomId, socket, dispatch);

  return (
    <Typography
      variant="h6"
      color="primary"
      fontWeight="bold"
      sx={{
        fontSize: {
          xs: '1.25rem',
          md: '1.5rem'
        },
        textAlign: 'center'
      }}
    >
      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
    </Typography>
  );
}

export default TimerDisplay;
