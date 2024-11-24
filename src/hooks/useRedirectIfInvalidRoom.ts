import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAppDispatch } from '@/hooks/useAppSelector'; // 커스텀 훅
import { setIsLoading } from '@/store/loadingSlice';
import { useSocket } from '@/components/provider/SocketProvider';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

const useRedirectIfInvalidRoom = (roomId: string) => {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    if (status === 'authenticated' && socket && session) {
      dispatch(setIsLoading(false));
      socket.emit(
        'check-room',
        { roomId, sessionId: session.user.id },
        (response) => {
          if (!response.success) {
            enqueueSnackbar('잘못된 접근입니다. 대기방으로 이동합니다.', {
              variant: 'error',
            });
            router.replace('/');
            socket?.emit('get-room-list');
          }
        }
      );
    } else if (status === 'loading') {
      dispatch(setIsLoading(true));
    }
  }, [socket?.id, status, roomId, session, router, dispatch]);
};

export default useRedirectIfInvalidRoom;
