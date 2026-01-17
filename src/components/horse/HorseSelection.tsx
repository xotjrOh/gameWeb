import React from 'react';
import { Grid2 as Grid, ButtonBase, Typography, Paper } from '@mui/material';

interface HorseSelectionProps {
  horses: string[];
  selectedHorse: string;
  setSelectedHorse: React.Dispatch<React.SetStateAction<string>>;
  isVoteDisabled: boolean;
}

function HorseSelection({
  horses,
  selectedHorse,
  setSelectedHorse,
  isVoteDisabled,
}: HorseSelectionProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        border: '1px solid rgba(15,23,42,0.08)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
      }}
    >
      <Typography
        variant="h5"
        color="primary"
        fontWeight="bold"
        sx={{ ml: '6px' }}
      >
        예측
      </Typography>
      <Typography
        variant="body2"
        color="textSecondary"
        sx={{ ml: '6px', mr: '6px', mt: 1 }}
      >
        이번 라운드의 최다 득표 말을 맞추면 칩이 2개 추가됩니다.
      </Typography>

      <Typography
        variant="caption"
        color="textSecondary"
        align="right"
        sx={{ display: 'block', mt: 1, mr: '6px' }}
      >
        수정 불가능 · 단일 선택 가능
      </Typography>

      {/* 말 선택 섹션 */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {horses.map((horse) => (
          <Grid size={{ xs: 6 }} key={horse}>
            <ButtonBase
              onClick={() =>
                setSelectedHorse((prev) => (prev === horse ? '' : horse))
              }
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                p: 2,
                borderRadius: 2,
                boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                border: '1px solid',
                borderColor:
                  selectedHorse === horse ? 'primary.main' : 'grey.300',
                backgroundColor:
                  selectedHorse === horse
                    ? 'rgba(37,99,235,0.12)'
                    : 'rgba(248,250,255,0.9)',
                '&:hover': {
                  backgroundColor:
                    selectedHorse === horse
                      ? 'rgba(37,99,235,0.2)'
                      : 'rgba(226,232,255,0.8)',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'grey.100',
                  borderColor: 'grey.300',
                  color: 'text.disabled',
                },
                transition: 'background-color 0.3s, transform 0.2s',
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
              disabled={isVoteDisabled}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color:
                    selectedHorse === horse ? 'primary.dark' : 'text.primary',
                  transition: 'color 0.3s',
                }}
              >
                {horse}
              </Typography>
            </ButtonBase>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

export default HorseSelection;
