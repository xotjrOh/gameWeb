'use client';

import { useState, useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateVoteHistory, updateIsVoteLocked } from '@/store/horseSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import HorseSelection from '@/components/horse/HorseSelection';
import VoteHistory from '@/components/horse/VoteHistory';

function VoteTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [selectedHorse, setSelectedHorse] = useState('');
  const { horses, statusInfo, rounds, isTimeover } = useSelector((state) => state.horse.gameData);
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
      return enqueueSnackbar('더 이상 투표할 수 없습니다.', { variant: 'error' });
    }

    if (selectedHorse) {
      socket.emit('horse-vote', { roomId, session, selectedHorse }, (response) => {
        if (response.success) {
          enqueueSnackbar('투표가 완료되었습니다.', { variant: 'success' });
          dispatch(updateVoteHistory(response.voteHistory));
          dispatch(updateIsVoteLocked(response.isVoteLocked));
          setSelectedHorse('');
        } else {
          enqueueSnackbar(response.message, { variant: 'error' });
        }
      });
    } else {
      enqueueSnackbar('말을 선택해주세요.', { variant: 'error' });
    }
  };

  const isVoteDisabled = statusInfo.isVoteLocked || isTimeover;

  return (
    <Box sx={{ mt:2 ,pb: 8 }}>
      {/* 상단 카드 */}
      <HorseSelection
        horses={horses}
        selectedHorse={selectedHorse}
        setSelectedHorse={setSelectedHorse}
        isVoteDisabled={isVoteDisabled}
      />

      {/* 보너스 안내 */}
      {statusInfo.isSolo && (
        <Paper elevation={3} sx={{ backgroundColor: 'success.light', p: 4, mt: 4, }}>
          <Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 'bold' }}>
            솔로 플레이어는 투표에 성공할 경우 5개의 칩이 추가됩니다!
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
