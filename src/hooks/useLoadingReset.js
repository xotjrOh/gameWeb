import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { setIsLoading } from '@/store/loadingSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

function useLoadingReset(socket, dispatch) {
    const { isLoading } = useSelector((state) => state.loading);
    const { enqueueSnackbar } = useCustomSnackbar();

    useEffect(() => {
        let timeoutId;
        if (isLoading) {
            timeoutId = setTimeout(() => {
                if (isLoading) {
                    // socket.disconnect();
                    // socket.connect();
                    dispatch(setIsLoading(false));
                    enqueueSnackbar('서버와 재연결 시도중.. 모달이 열려있다면 닫았다가 다시 시도해주세요.', { variant: 'error' });
                }
            }, 9000); // 9초 후 타임아웃
        }

        // 컴포넌트가 언마운트되거나 로딩 상태가 변경되면 타이머 해제
        return () => clearTimeout(timeoutId);
    }, [socket, isLoading, dispatch]);

}

export default useLoadingReset;