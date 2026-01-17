import { Box, Typography, Paper } from '@mui/material';
import { RoundData } from '@/types/horse';

interface VoteHistoryProps {
  voteHistory: string[];
  rounds: RoundData[][];
}

function VoteHistory({ voteHistory, rounds }: VoteHistoryProps) {
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
        내 투표 내역
      </Typography>
      {voteHistory && voteHistory.length > 0 ? (
        voteHistory.map((vote, index) => {
          const round = rounds?.[index] || [];
          const votedHorseResult = round.find((r) => r.horse === vote);
          const isSuccessful =
            votedHorseResult && votedHorseResult.progress === 2;

          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                mb: 1,
                borderRadius: 2,
                boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
                border: '1px solid',
                borderColor: isSuccessful ? 'border.success' : 'border.fail',
                backgroundColor: isSuccessful
                  ? 'background.success'
                  : 'background.fail',
                transition: 'background-color 0.3s',
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                라운드 {index + 1}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                예측: {vote}
              </Typography>
            </Box>
          );
        })
      ) : (
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ textAlign: 'center' }}
        >
          아직 투표 기록이 없습니다.
        </Typography>
      )}
    </Paper>
  );
}

export default VoteHistory;
