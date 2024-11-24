import { useEffect, useState } from 'react';
import {
  updateIsTimeover,
  updateHorses,
  updatePositions,
  setPlayers,
} from '@/store/horseSlice';
import { AppDispatch } from '@/store';
import { ClientSocketType } from '@/types/socket';

function useTimeLeft(
  roomId: string,
  socket: ClientSocketType | null,
  dispatch: AppDispatch
) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (socket) {
      socket.on('update-timer', (newTimeLeft) => {
        setTimeLeft(newTimeLeft);
        dispatch(updateIsTimeover(newTimeLeft <= 0));
      });

      socket.on('roles-assigned', ({ horses, players }) => {
        const positions = horses.map((horse) => ({
          name: horse,
          position: 0,
        }));
        dispatch(updateHorses(horses));
        dispatch(updatePositions(positions));
        dispatch(setPlayers(players));
      });

      return () => {
        socket.off('update-timer');
        socket.off('roles-assigned');
      };
    }
  }, [roomId, socket?.id, dispatch]);

  return { timeLeft };
}

export default useTimeLeft;
