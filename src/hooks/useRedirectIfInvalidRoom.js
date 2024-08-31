import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDispatch } from 'react-redux';
import { setIsLoading } from '@/store/loadingSlice';
import useSocket from '@/hooks/useSocket';

const useRedirectIfInvalidRoom = (roomId) => {
  const socket = useSocket();
  const router = useRouter();
  const dispatch = useDispatch();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && socket) {
      dispatch(setIsLoading(false));
      socket.emit('check-room', { roomId, sessionId: session.user.id }, (response) => {
        if (!response.isInRoom) {
          alert('잘못된 접근입니다. 대기방으로 이동합니다.');
          router.push('/');
        }
      });
    } else if (status === "loading") {
      dispatch(setIsLoading(true));
    }
  }, [socket, status, roomId, session, router, dispatch]);
}

export default useRedirectIfInvalidRoom;