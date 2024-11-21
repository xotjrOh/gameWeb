'use client';

import { useState, useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateVoteHistory, updateIsVoteLocked } from '@/store/horseSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { Box, Button } from '@mui/material';
import HorseSelection from '@/components/horse/HorseSelection';

function VoteTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [selectedHorse, setSelectedHorse] = useState('');
  const { statusInfo } = useSelector((state) => state.horse);
  const { horses, isTimeover } = useSelector((state) => state.horse.gameData);
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    if (socket) {
      // 'round-ended' 이벤트를 수신하여 칩 개수 업데이트
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

  // 투표 처리
  const handleVote = () => {
    if (statusInfo.isVoteLocked || isTimeover) {
      return enqueueSnackbar('더 이상 투표할 수 없습니다.', {
        variant: 'error',
      });
    }

    if (selectedHorse) {
      socket.emit(
        'horse-vote',
        { roomId, sessionId: session.user.id, selectedHorse },
        (response) => {
          if (response.success) {
            enqueueSnackbar('투표가 완료되었습니다.', { variant: 'success' });
            dispatch(updateVoteHistory(response.voteHistory)); // 개인 라운드 정보 업데이트
            dispatch(updateIsVoteLocked(response.isVoteLocked)); // 투표 잠금
            setSelectedHorse(''); // 선택 초기화
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
          height: '36px',
          fontSize: '1rem',
        }}
      >
        {statusInfo.isVoteLocked && !isTimeover ? '투표하였습니다' : '투표하기'}
      </Button>
    </Box>
  );
}

export default memo(VoteTab);
