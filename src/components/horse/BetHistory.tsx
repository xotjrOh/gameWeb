import { Box, Paper, Typography } from '@mui/material';
import { RoundData } from '@/types/horse';

interface BetHistoryProps {
  rounds: RoundData[][];
}

function BetHistory({ rounds }: BetHistoryProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        mt: 4,
        borderRadius: 3,
        border: '1px solid rgba(15,23,42,0.08)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
      }}
    >
      <Typography
        variant="h6"
        color="primary"
        fontWeight="bold"
        mb={2}
        sx={{ ml: '6px' }}
      >
        내 베팅 내역
      </Typography>
      {rounds && rounds.length > 0 ? (
        rounds.map((round, roundIndex) => (
          <Box key={roundIndex} mb={3}>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              mb={1}
              sx={{ ml: '6px' }}
            >
              라운드 {roundIndex + 1}
            </Typography>
            {round.map((bet, betIndex) => (
              <Paper
                key={betIndex}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(248,250,255,0.9)',
                  borderRadius: 2,
                  border: '1px solid rgba(15,23,42,0.08)',
                }}
              >
                <Typography variant="body1" fontWeight="medium">
                  {bet.horse}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  칩: {bet.chips}
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
  );
}

export default BetHistory;
