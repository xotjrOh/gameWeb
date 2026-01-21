import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import {
  setSnapshot,
  updatePhase,
  appendEventLog,
  setRoundResult,
} from '@/store/animalSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { ClientSocketType } from '@/types/socket';

const useAnimalGameData = (
  roomId: string,
  socket: ClientSocketType | null,
  sessionId: string
) => {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    if (!socket || !roomId) {
      return;
    }

    socket.on('server_state_snapshot', (data) => {
      dispatch(setSnapshot(data));
    });

    socket.on('server_round_phase_changed', (data) => {
      dispatch(updatePhase(data));
    });

    socket.on('server_event_log_append', (data) => {
      dispatch(appendEventLog(data));
    });

    socket.on('server_round_result', (data) => {
      dispatch(setRoundResult(data));
    });

    socket.emit('player_get_state', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message, { variant: 'error' });
      }
    });

    return () => {
      socket.off('server_state_snapshot');
      socket.off('server_round_phase_changed');
      socket.off('server_event_log_append');
      socket.off('server_round_result');
    };
  }, [roomId, socket?.id, sessionId, dispatch, enqueueSnackbar]);
};

export default useAnimalGameData;
