'use client';

import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { Box, Grid2 as Grid, Slider, Typography, Paper } from '@mui/material';

function BettingSection({ horses, bets, setBets, statusInfo, isTimeover }) {
  const { enqueueSnackbar } = useCustomSnackbar();

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
      enqueueSnackbar('보유한 칩보다 많이 베팅할 수 없습니다.', {
        variant: 'error',
      });
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline">
        <Typography
          variant="h5"
          color="primary"
          fontWeight="bold"
          sx={{ ml: '6px' }}
        >
          베팅
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mr: '6px' }}>
          남은 칩 개수: {statusInfo?.chips || 0}
        </Typography>
      </Box>

      <Typography
        variant="caption"
        color="textSecondary"
        align="right"
        sx={{ display: 'block', mt: 1, mr: '6px' }}
      >
        수정 불가능 · 복수 베팅 가능
      </Typography>

      {/* 말 베팅 섹션 */}
      <Grid container spacing={2} mt={1}>
        {horses.map((horse) => (
          <Grid size={{ xs: 12 }} key={horse}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                backgroundColor: 'background.card',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Typography
                variant="h1"
                color="grey"
                fontWeight="bold"
                sx={{
                  opacity: 0.1,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '5rem',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {horse} {bets[horse] || ''}
              </Typography>
              <Slider
                value={bets[horse] || 0}
                min={0}
                max={statusInfo?.chips || 0}
                onChange={(e, value) => handleBetChange(horse, value)}
                disabled={statusInfo.isBetLocked || isTimeover}
                valueLabelDisplay="auto"
                sx={{ mt: 1.5 }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

export default BettingSection;
