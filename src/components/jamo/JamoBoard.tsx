'use client';

import { Box, Paper, Typography } from '@mui/material';

interface JamoBoardProps {
  board: Record<number, string | null>;
  title?: string;
}

export default function JamoBoard({ board, title }: JamoBoardProps) {
  return (
    <Box>
      {title && (
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {title}
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 1.5,
        }}
      >
        {Array.from({ length: 24 }, (_, index) => index + 1).map((num) => {
          const value = board[num];
          return (
            <Paper
              key={num}
              variant="outlined"
              sx={{
                p: 1,
                borderRadius: 2,
                minHeight: 72,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: value
                  ? 'rgba(59,130,246,0.08)'
                  : 'rgba(15,23,42,0.04)',
              }}
            >
              <Typography variant="caption" color="textSecondary">
                {num}
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {value ?? '??'}
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
