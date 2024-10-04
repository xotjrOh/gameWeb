import { useEffect } from 'react';
import { useSnackbar } from 'notistack';

function useLeaveRoom(socket, dispatch) {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (socket) {
      socket.on('room-closed', (response) => {
        enqueueSnackbar(response.message, { variant: 'info' });
        window.location.replace('/');
      });
    }

    return () => {
      if (socket) {
        socket.off('room-closed');  // **컴포넌트 언마운트 시 이벤트 리스너 제거**
      }
    };
  }, [socket, dispatch]);

}

export default useLeaveRoom;