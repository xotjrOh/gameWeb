'use client';

import React from 'react';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { Box, Grid2 as Grid, Slider, Typography, Paper } from '@mui/material';

interface BettingSectionProps {
  horses: string[];
  bets: { [key: string]: number };
  setBets: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
  statusInfo: {
    chips?: number;
    isBetLocked?: boolean;
  };
  isTimeover: boolean;
}

function BettingSection({
  horses,
  bets,
  setBets,
  statusInfo,
  isTimeover,
}: BettingSectionProps) {
  const { enqueueSnackbar } = useCustomSnackbar();

  const handleBetChange = (horse: string, amount: number) => {
    // TODO : 문자열 거르는 로직 제거, 오류 확인 필요
    const newBets = { ...bets, [horse]: amount };
    const totalBet = Object.values(newBets).reduce(
      (sum, chips) => sum + chips,
      0
    );

    if (amount < 0) return; // 베팅 금액이 음수가 되지 않도록

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
                onChange={(e, value) => handleBetChange(horse, value as number)} // TODO : number[]가 전달되는 케이스 생기나 체크필요
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
