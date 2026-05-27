import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { setIsLoading } from '@/store/loadingSlice';
import { useSocket } from '@/components/provider/SocketProvider';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

const useRedirectIfNotHost = (
  roomId: string,
  enabled = true,
  redirectPath = '/'
) => {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (status === 'authenticated' && socket) {
      dispatch(setIsLoading(false));
      socket.emit(
        'check-room-host',
        { roomId, sessionId: session.user.id },
        (response) => {
          if (!response.success) {
            enqueueSnackbar('호스트가 아닙니다. 대기방으로 이동합니다.', {
              variant: 'error',
            });
            router.replace(redirectPath);
            socket?.emit('get-room-list');
          }
        }
      );
    } else if (status === 'loading') {
      dispatch(setIsLoading({ isLoading: true, reason: 'route-check' }));
    }
  }, [
    enabled,
    socket?.id,
    status,
    roomId,
    session,
    router,
    dispatch,
    redirectPath,
  ]);
};

export default useRedirectIfNotHost;
