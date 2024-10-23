import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setGameData } from '@/store/shuffleSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

export default function useShuffleGameData(roomId, socket, sessionId) {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    // 서버로부터 게임 데이터를 받아와 Redux 스토어에 저장
    socket.emit('shuffle-get-game-data', { roomId, sessionId }, (response) => {
        if (!response.success) {
            enqueueSnackbar(response.message, { variant: 'error' });
        }
    });

    // 게임 진행 중 발생하는 이벤트 처리
    socket.on('shuffle-game-updated', (data) => {
      dispatch(setGameData(data.gameData));
    });

    return () => {
      socket.off('shuffle-game-updated');
    };
  }, [roomId, socket, sessionId, dispatch]);
}
