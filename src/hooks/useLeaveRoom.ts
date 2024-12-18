import { useEffect } from 'react';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { AppDispatch } from '@/store';
import { ClientSocketType } from '@/types/socket';

function useLeaveRoom(socket: ClientSocketType | null, dispatch: AppDispatch) {
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    if (socket) {
      socket.on('room-closed', (response) => {
        enqueueSnackbar(response.message, { variant: 'info' });
        window.location.replace('/');
      });
    }

    return () => {
      if (socket) {
        socket.off('room-closed'); // **컴포넌트 언마운트 시 이벤트 리스너 제거**
      }
    };
  }, [socket, dispatch]);
}

export default useLeaveRoom;
