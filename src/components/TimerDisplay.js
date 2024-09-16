import useTimeLeft from '@/hooks/useTimeLeft';

function TimerDisplay({ roomId, socket, dispatch }) {
  const { timeLeft } = useTimeLeft(roomId, socket, dispatch);

  return (
    <p className="text-lg md:text-xl text-indigo-600 font-bold">
      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
    </p>
  );
}

export default TimerDisplay;
