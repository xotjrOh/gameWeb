import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import {
  setGameData,
  setPlayers,
  setStatusInfo,
  setLastRoundResults,
  setLastRoundCorrectOrder,
} from '@/store/shuffleSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { ClientSocketType } from '@/types/socket';

export default function useShuffleGameData(
  roomId: string,
  socket: ClientSocketType | null,
  sessionId: string
) {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    if (socket && roomId) {
      // 서버로부터 게임 데이터를 받아와 Redux 스토어에 저장
      socket.emit(
        'shuffle-get-game-data',
        { roomId, sessionId },
        (response) => {
          if (!response.success) {
            enqueueSnackbar(response.message, { variant: 'error' });
          }
        }
      );

      // 게임 진행 중 발생하는 이벤트 처리
      // TODO : 에러 발생시 타입 명시적으로 표현
      socket.on('shuffle-game-data-update', (data) => {
        dispatch(setGameData(data.gameData));
        dispatch(setPlayers(data.players));
        dispatch(setStatusInfo(data.statusInfo));
      });
      socket.on('shuffle-game-started', (data) => {
        if (data?.gameData) {
          dispatch(setGameData(data.gameData));
        }
        if (Array.isArray(data?.players)) {
          dispatch(setPlayers(data.players));
        }
        dispatch(setLastRoundResults([]));
        dispatch(setLastRoundCorrectOrder([]));
      });
      socket.on('shuffle-round-results', (data) => {
        if (Array.isArray(data?.players)) {
          dispatch(setPlayers(data.players));
          const myInfo = data.players.find((player) => player.id === sessionId);
          if (myInfo) {
            dispatch(setStatusInfo(myInfo));
          }
        }
        if (Array.isArray(data?.results)) {
          dispatch(setLastRoundResults(data.results));
        }
        if (Array.isArray(data?.correctOrder)) {
          dispatch(setLastRoundCorrectOrder(data.correctOrder));
        }
      });

      return () => {
        socket.off('shuffle-game-data-update');
        socket.off('shuffle-game-started');
        socket.off('shuffle-round-results');
      };
    }
  }, [roomId, socket?.id, sessionId, dispatch]);
}
