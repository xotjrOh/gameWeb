import { useEffect, useState } from 'react';
import { updateHorses, updatePositions, updatePlayers } from '@/store/horseSlice';

function useTimeLeft(roomId, socket, dispatch) {
    const [timeLeft, setTimeLeft] = useState(0); 

    useEffect(() => {
        if (socket) {
          socket.on('update-timer', (newTimeLeft) => {
            setTimeLeft(newTimeLeft);
          });
    
          socket.on('roles-assigned', ({ horses, players }) => {
            const positions = horses.map(horse => ({
              name: horse,
              position: 0
            }));
            dispatch(updateHorses(horses));
            dispatch(updatePositions(positions));
            dispatch(updatePlayers(players));
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