'use client';

import { useState, useEffect, memo } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { updateVoteHistory, updateIsVoteLocked } from '@/store/horseSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { Box, Typography, Button, Paper } from '@mui/material';
import HorseSelection from '@/components/horse/HorseSelection';
import VoteHistory from '@/components/horse/VoteHistory';
import { ClientSocketType } from '@/types/socket';
import { Session } from 'next-auth';

interface VoteTabProps {
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

function VoteTab({ roomId, socket, session }: VoteTabProps) {
  const dispatch = useAppDispatch();
  const [selectedHorse, setSelectedHorse] = useState<string>('');
  const { statusInfo } = useAppSelector((state) => state.horse);
  const { horses, rounds, isTimeover } = useAppSelector(
    (state) => state.horse.gameData
  );
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    if (socket) {
      // 'round-ended' 이벤트를 수신하여 선택된 말을 초기화
      const updateVoteAfterRoundEnd = () => {
        setSelectedHorse('');
      };
      socket.on('round-ended', updateVoteAfterRoundEnd);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        socket.off('round-ended', updateVoteAfterRoundEnd);
      };
    }
  }, [socket?.id]);

  const handleVote = () => {
    if (statusInfo.isVoteLocked || isTimeover) {
      return enqueueSnackbar('더 이상 투표할 수 없습니다.', {
        variant: 'error',
      });
    }
    if (!socket) {
      // socket 미연결
      enqueueSnackbar('연결이 되지 않았습니다. 새로고침해주세요', {
        variant: 'error',
      });
      return;
    }
    if (!session) {
      // session 미연결
      enqueueSnackbar('로그인이 확인되지 않습니다.', {
        variant: 'error',
      });
      return;
    }

    if (selectedHorse) {
      socket.emit(
        'horse-vote',
        { roomId, sessionId: session.user.id, selectedHorse },
        (response) => {
          if (response.success) {
            enqueueSnackbar('투표가 완료되었습니다.', { variant: 'success' });
            dispatch(updateVoteHistory(response.voteHistory!));
            dispatch(updateIsVoteLocked(response.isVoteLocked!));
            setSelectedHorse('');
          } else {
            enqueueSnackbar(response.message, { variant: 'error' });
          }
        }
      );
    } else {
      enqueueSnackbar('말을 선택해주세요.', { variant: 'error' });
    }
  };

  const isVoteDisabled = statusInfo.isVoteLocked || isTimeover;

  return (
    <Box sx={{ mt: 2, pb: 8 }}>
      {/* 상단 카드 */}
      <HorseSelection
        horses={horses}
        selectedHorse={selectedHorse}
        setSelectedHorse={setSelectedHorse}
        isVoteDisabled={isVoteDisabled}
      />

      {/* 보너스 안내 */}
      {statusInfo.isSolo && (
        <Paper
          elevation={3}
          sx={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
            p: 3,
            mt: 3,
            borderRadius: 3,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'success.dark', fontWeight: 700 }}
          >
            솔로 플레이어는 예측에 성공할 경우 5개의 칩이 추가됩니다!
          </Typography>
        </Paper>
      )}

      {/* 투표 내역 */}
      <VoteHistory voteHistory={statusInfo.voteHistory} rounds={rounds} />

      {/* 고정된 투표 버튼 */}
      <Button
        variant="contained"
        color={isVoteDisabled ? 'inherit' : 'success'}
        onClick={handleVote}
        disabled={isVoteDisabled}
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          height: '44px',
          fontSize: '1rem',
          borderRadius: 999,
          fontWeight: 700,
          textTransform: 'none',
          boxShadow: '0 10px 28px rgba(16, 185, 129, 0.35)',
        }}
      >
        {statusInfo.isVoteLocked && !isTimeover ? '투표하였습니다' : '투표하기'}
      </Button>
    </Box>
  );
}

export default memo(VoteTab);
