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

    const handleSnapshot = (data: Parameters<typeof setSnapshot>[0]) => {
      dispatch(setSnapshot(data));
    };

    const handlePhase = (data: Parameters<typeof updatePhase>[0]) => {
      dispatch(updatePhase(data));
    };

    const handleDraftSaved = (data: { submittedAt: number }) => {
      dispatch(setDraftSaved(data.submittedAt));
    };

    const handleSubmissionDebug = (
      data: Parameters<typeof upsertSubmissionDebug>[0]
    ) => {
      dispatch(upsertSubmissionDebug(data));
    };

    const handleRoundResult = (data: Parameters<typeof setRoundResult>[0]) => {
      dispatch(setRoundResult(data));
    };

    socket.on('jamo_state_snapshot', handleSnapshot);
    socket.on('jamo_round_phase_changed', handlePhase);
    socket.on('jamo_draft_saved', handleDraftSaved);
    socket.on('jamo_submission_debug', handleSubmissionDebug);
    socket.on('jamo_round_result', handleRoundResult);

    socket.emit('jamo_get_state', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '상태 조회에 실패했습니다.', {
          variant: 'error',
        });
      }
    });

    return () => {
      socket.off('jamo_state_snapshot', handleSnapshot);
      socket.off('jamo_round_phase_changed', handlePhase);
      socket.off('jamo_draft_saved', handleDraftSaved);
      socket.off('jamo_submission_debug', handleSubmissionDebug);
      socket.off('jamo_round_result', handleRoundResult);
    };
  }, [dispatch, enqueueSnackbar, roomId, sessionId, socket]);
};

export default useJamoGameData;
