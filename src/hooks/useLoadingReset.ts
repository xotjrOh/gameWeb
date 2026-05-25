import { useEffect } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { LoadingReason, setIsLoading } from '@/store/loadingSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { AppDispatch } from '@/store';
import { ClientSocketType } from '@/types/socket';

const timeoutMessages: Record<Exclude<LoadingReason, null>, string> = {
  'create-room': '서버 응답이 지연되고 있습니다.',
  'join-room': '서버 응답이 지연되고 있습니다.',
  'route-check': '요청 처리가 지연되고 있습니다.',
  'socket-disconnect': '서버와 재연결 중입니다.',
};

const getTimeoutMessage = (reason: LoadingReason) => {
  if (reason && timeoutMessages[reason]) {
    return timeoutMessages[reason];
  }
  return '요청 처리가 지연되고 있습니다.';
};

function useLoadingReset(
  socket: ClientSocketType | null,
  dispatch: AppDispatch
) {
  const { isLoading, reason } = useAppSelector((state) => state.loading);
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isLoading) {
      timeoutId = setTimeout(() => {
        if (isLoading) {
          // socket.disconnect();
          // socket.connect();
          dispatch(setIsLoading(false));
          enqueueSnackbar(getTimeoutMessage(reason), { variant: 'error' });
        }
      }, 9000); // 9초 후 타임아웃
    }

    // 컴포넌트가 언마운트되거나 로딩 상태가 변경되면 타이머 해제
    return () => clearTimeout(timeoutId);
  }, [socket, isLoading, reason, dispatch]);
}

export default useLoadingReset;
