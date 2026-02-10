import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import {
  setDraftSaved,
  upsertSubmissionDebug,
  setRoundResult,
  setSnapshot,
  updatePhase,
} from '@/store/jamoSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { ClientSocketType } from '@/types/socket';

const useJamoGameData = (
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

    socket.on('jamo_state_snapshot', (data) => {
      dispatch(setSnapshot(data));
    });

    socket.on('jamo_round_phase_changed', (data) => {
      dispatch(updatePhase(data));
    });

    socket.on('jamo_draft_saved', (data) => {
      dispatch(setDraftSaved(data.submittedAt));
    });

    socket.on('jamo_submission_debug', (data) => {
      dispatch(upsertSubmissionDebug(data));
    });

    socket.on('jamo_round_result', (data) => {
      dispatch(setRoundResult(data));
    });

    socket.emit('jamo_get_state', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '상태 조회에 실패했습니다.', {
          variant: 'error',
        });
      }
    });

    return () => {
      socket.off('jamo_state_snapshot');
      socket.off('jamo_round_phase_changed');
      socket.off('jamo_draft_saved');
      socket.off('jamo_submission_debug');
      socket.off('jamo_round_result');
    };
  }, [roomId, socket?.id, sessionId, dispatch, enqueueSnackbar]);
};

export default useJamoGameData;
