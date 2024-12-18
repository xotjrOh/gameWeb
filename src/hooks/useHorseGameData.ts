import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import {
  setPlayers,
  setGameData,
  setStatusInfo,
  updatePositions,
  updateRounds,
  updateFinishLine,
  updatePersonalRounds,
  updateVoteHistory,
  updateIsBetLocked,
  updateIsVoteLocked,
  updateChip,
  updateChipDiff,
} from '@/store/horseSlice'; // Redux 슬라이스에서 가져옴
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { ClientSocketType } from '@/types/socket';

const useHorseGameData = (
  roomId: string,
  socket: ClientSocketType | null,
  sessionId: string
) => {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    if (socket && roomId) {
      socket.on('horse-all-data-update', (data) => {
        dispatch(setPlayers(data.players));
        dispatch(setGameData(data.gameData));
        dispatch(setStatusInfo(data.statusInfo));
      });

      // 호스트를 위한 rounds 데이터
      socket.on('update-positions', ({ horsesData, rounds }) => {
        dispatch(updatePositions(horsesData));
        dispatch(updateRounds(rounds));
      });
      socket.on('update-finishLine', (data) => {
        dispatch(updateFinishLine(data));
      });
      socket.on('personal-round-update', (data) => {
        dispatch(updatePersonalRounds(data));
      });
      socket.on('vote-history-update', (data) => {
        dispatch(updateVoteHistory(data));
      });
      socket.on('update-isBetLocked', (data) => {
        dispatch(updateIsBetLocked(data));
      });
      socket.on('update-isVoteLocked', (data) => {
        dispatch(updateIsVoteLocked(data));
      });
      socket.on('update-chip', (data) => {
        dispatch(updateChip(data));
      });
      socket.on('update-chipDiff', (data) => {
        dispatch(updateChipDiff(data));
      });

      // 서버에서 데이터를 받아와 Redux에 저장
      socket.emit('horse-get-game-data', { roomId, sessionId }, (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message, { variant: 'error' });
        }
      });

      // cleanup: 컴포넌트가 언마운트되거나 socket이 변경될 때 이벤트 제거
      return () => {
        socket.off('horse-all-data-update');
        socket.off('update-positions');
        socket.off('update-finishLine');
        socket.off('personal-round-update');
        socket.off('vote-history-update');
        socket.off('update-isBetLocked');
        socket.off('update-isVoteLocked');
        socket.off('update-chip');
        socket.off('update-chipDiff');
      };
    }
  }, [roomId, socket?.id, sessionId, dispatch]);
};

export default useHorseGameData;
