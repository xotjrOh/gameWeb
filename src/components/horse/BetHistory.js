import { Box, Paper, Typography } from '@mui/material';

function BetHistory({ statusInfo }) {
    return (
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
