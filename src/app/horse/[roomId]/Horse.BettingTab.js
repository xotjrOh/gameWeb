'use client';

import { useState, useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  updateChip,
  updatePersonalRounds,
  updateIsBetLocked,
} from '@/store/horseSlice';
import BettingSection from '@/components/horse/BettingSection';
import BetHistory from '@/components/horse/BetHistory';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import {
  Box,
  Button,
  Typography,
} from '@mui/material';

function BettingTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [bets, setBets] = useState({});
  const { horses, statusInfo, isTimeover } = useSelector(
    (state) => state.horse.gameData
  );
  const { enqueueSnackbar } = useCustomSnackbar();

  useEffect(() => {
    if (socket) {
      const updateBetsAfterRoundEnd = () => {
        setBets({});
      };
      socket.on('round-ended', updateBetsAfterRoundEnd);

      return () => {
        socket.off('round-ended', updateBetsAfterRoundEnd);
      };
    }
  }, [socket?.id]);

  const handleBet = () => {
    if (statusInfo.isBetLocked || isTimeover) {
      return enqueueSnackbar('더이상 베팅할 수 없습니다.', { variant: 'error' });
    }

    if (Object.keys(bets).length > 0) {
      socket.emit('horse-bet', { roomId, bets }, (response) => {
        if (response.success) {
          enqueueSnackbar('베팅이 완료되었습니다.', { variant: 'success' });
          dispatch(updateChip(response.remainChips));
          dispatch(updatePersonalRounds(response.personalRounds));
          dispatch(updateIsBetLocked(response.isBetLocked));
          setBets({});
        } else {
          enqueueSnackbar(response.message, { variant: 'error' });
        }
      });
    } else {
      enqueueSnackbar('최소 하나의 말에 베팅해주세요.', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      {/* 베팅 섹션 */}
      <BettingSection
        horses={horses}
        bets={bets}
        setBets={setBets}
        statusInfo={statusInfo}
        isTimeover={isTimeover}
      />

      {/* 베팅 요약 섹션 */}
      <Box sx={{ position: 'fixed', bottom: 64, left: 16, right: 16, zIndex: 1000, textAlign: 'center', color: 'grey.600' }}>
        <Typography variant="body2">
          현재 베팅: {Object.keys(bets).length > 0 ? horses.map(horse => bets[horse] ? `${horse}: ${bets[horse]}` : null).filter(Boolean).join(', ') : '베팅 내역 없음'}
        </Typography>
      </Box>

      {/* 고정된 베팅 버튼 */}
      <Button
        variant="contained"
        color={statusInfo.isBetLocked || isTimeover ? 'inherit' : 'success'}
        onClick={handleBet}
        sx={{ 
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          height: '36px', // 버튼 높이 증가
          fontSize: '1rem', // 글자 크기 증가
        }}
        disabled={statusInfo.isBetLocked || isTimeover}
      >
        {statusInfo.isBetLocked && !isTimeover ? '베팅되었습니다' : '베팅하기'}
      </Button>

      {/* 베팅 내역 섹션 */}
      <BetHistory statusInfo={statusInfo} />
    </Box>
  );
}

export default memo(BettingTab);