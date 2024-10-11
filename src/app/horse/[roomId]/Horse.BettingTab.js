'use client';

import { useState, useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  updateChip,
  updatePersonalRounds,
  updateIsBetLocked,
} from '@/store/horseSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import {
  Box,
  Button,
  Grid2 as Grid,
  Slider,
  Typography,
  Paper,
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

  const handleBetChange = (horse, amount) => {
    const sanitizedAmount =
      isNaN(amount) || amount === '' ? 0 : parseInt(amount);
    const newBets = { ...bets, [horse]: sanitizedAmount };
    const totalBet = Object.values(newBets).reduce(
      (sum, chips) => sum + chips,
      0
    );

    if (sanitizedAmount < 0) return; // 베팅 금액이 음수가 되지 않도록

    if (totalBet <= (statusInfo?.chips || 0)) {
      setBets(newBets);
    } else {
      enqueueSnackbar('보유한 칩보다 많이 베팅할 수 없습니다.', { variant: 'error' });
    }
  };

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
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box display="flex" justifyContent="center" alignItems="baseline">
          <Typography variant="h5" color="primary" fontWeight="bold">
            베팅
          </Typography>
          <Typography variant="body2" color="textSecondary" ml={2}>
            (남은 칩 개수 : {statusInfo?.chips || 0})
          </Typography>
        </Box>
        <Typography color="error" variant="body2" mt={1}>
          칩은 초기화되지 않으니 아껴서 베팅해주세요.
        </Typography>

        <Typography variant="caption" color="textSecondary" align="right" sx={{ display: 'block' }}>
          수정 불가능<br/>복수 베팅 가능
        </Typography>

        {/* 말 베팅 섹션 */}
        <Grid container spacing={2} mt={1}>
          {horses.map((horse) => (
            <Grid size={{ xs: 12 }} key={horse}>
              <Paper elevation={2} sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.card' }}>
                <Typography variant="h6" fontWeight="bold" mb={1}>
                  {horse}
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={1}>
                  베팅 칩 : {bets[horse] || 0}
                </Typography>
                <Slider
                  value={bets[horse] || 0}
                  min={0}
                  max={statusInfo?.chips || 0}
                  onChange={(e, value) => handleBetChange(horse, value)}
                  disabled={statusInfo.isBetLocked || isTimeover}
                  valueLabelDisplay="auto"
                  sx={{ mt: 2 }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Button
          variant="contained"
          color={statusInfo.isBetLocked || isTimeover ? 'inherit' : 'success'}
          onClick={handleBet}
          fullWidth
          sx={{ mt: 3 }}
          disabled={statusInfo.isBetLocked || isTimeover}
        >
          {statusInfo.isBetLocked && !isTimeover ? '베팅되었습니다' : '베팅하기'}
        </Button>
      </Paper>

      {/* 베팅 내역 섹션 */}
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h6" color="primary" fontWeight="bold" mb={2}>
          내 베팅 내역
        </Typography>
        {statusInfo.rounds && statusInfo.rounds.length > 0 ? (
          statusInfo.rounds.map((round, roundIndex) => (
            <Box key={roundIndex} mb={3}>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                라운드 {roundIndex + 1}
              </Typography>
              {round.map((bet, betIndex) => (
                <Paper
                  key={betIndex}
                  elevation={1}
                  sx={{ p: 2, mb: 1, display: 'flex', justifyContent: 'space-between', backgroundColor: 'background.card' }}
                >
                  <Typography variant="body1" fontWeight="medium">
                    {bet.horse}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    칩 : {bet.chips}
                  </Typography>
                </Paper>
              ))}
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="textSecondary" textAlign="center">
            아직 베팅 기록이 없습니다.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

export default memo(BettingTab);