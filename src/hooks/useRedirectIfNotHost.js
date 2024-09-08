import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDispatch } from 'react-redux';
import { setIsLoading } from '@/store/loadingSlice';
import { useSocket } from '@/components/provider/SocketProvider';
import { showToast } from '@/store/toastSlice';

const useRedirectIfInvalidRoom = (roomId) => {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useDispatch();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && socket) {
      dispatch(setIsLoading(false));
      socket.emit('check-room-host', { roomId, sessionId: session.user.id }, (response) => {
        if (!response.isInRoom) {
          dispatch(showToast({ message: '호스트가 아닙니다. 대기방으로 이동합니다.', type: 'error' }));
          router.push('/');
        }
      });
    } else if (status === "loading") {
      dispatch(setIsLoading(true));
    }
  }, [socket, status, roomId, session, router, dispatch]);
}

export default useRedirectIfInvalidRoom;