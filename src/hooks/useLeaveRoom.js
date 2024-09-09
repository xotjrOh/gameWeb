import { useEffect } from 'react';
import { showToast } from '@/store/toastSlice';

function useLeaveRoom(socket, dispatch) {

  useEffect(() => {
    if (socket) {
      socket.on('room-closed', (response) => {
        dispatch(showToast({ message: response.message, type: 'info' }));
        window.location.href = '/';
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