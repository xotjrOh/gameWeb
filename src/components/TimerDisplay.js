import useTimeLeft from '@/hooks/useTimeLeft';

function TimerDisplay({ roomId, socket, dispatch }) {
  const { timeLeft } = useTimeLeft(roomId, socket, dispatch);

  return (
    <p className="text-lg">
      {Math.floor(timeLeft / 60)}:{timeLeft % 60}
    </p>
  );
}

export default TimerDisplay;