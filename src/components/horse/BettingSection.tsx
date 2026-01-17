'use client';

import React from 'react';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import {
  Box,
  Grid2 as Grid,
  Slider,
  Typography,
  Paper,
  Chip,
} from '@mui/material';

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
    const newBets = { ...bets };
    if (amount === 0) {
      delete newBets[horse];
    } else {
      newBets[horse] = amount;
    }
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
    <Paper
      elevation={0}
      sx={{
        p: 4,
        textAlign: 'center',
        borderRadius: 3,
        border: '1px solid rgba(15,23,42,0.08)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography
          variant="h5"
          color="primary"
          fontWeight="bold"
          sx={{ ml: '6px' }}
        >
          베팅
        </Typography>
        <Chip
          size="small"
          label={`남은 칩 ${statusInfo?.chips || 0}`}
          sx={{
            fontWeight: 600,
            borderRadius: 999,
            backgroundColor: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(37,99,235,0.2)',
          }}
        />
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
              elevation={0}
              sx={{
                p: 2,
                textAlign: 'center',
                backgroundColor: 'rgba(248,250,255,0.9)',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2,
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
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
                sx={{
                  mt: 1.5,
                  '& .MuiSlider-thumb': {
                    boxShadow: '0 6px 16px rgba(37,99,235,0.25)',
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: 'primary.main',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: 'rgba(37,99,235,0.15)',
                  },
                }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

export default BettingSection;
