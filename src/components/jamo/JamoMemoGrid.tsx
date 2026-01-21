'use client';

import { Box, TextField, Typography } from '@mui/material';

interface JamoMemoGridProps {
  memo: Record<number, string>;
  onChange: (num: number, value: string) => void;
  disabled?: boolean;
}

export default function JamoMemoGrid({
  memo,
  onChange,
  disabled,
}: JamoMemoGridProps) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        개인 메모
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 1,
        }}
      >
        {Array.from({ length: 24 }, (_, index) => index + 1).map((num) => (
          <TextField
            key={num}
            value={memo[num] ?? ''}
            onChange={(event) => onChange(num, event.target.value)}
            size="small"
            disabled={disabled}
            placeholder={String(num)}
            inputProps={{ maxLength: 12 }}
            sx={{
              '& .MuiInputBase-input': { textAlign: 'center' },
            }}
          />
        ))}
      </Box>
      <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
        메모는 개인 전용이며 서버에 전송되지 않습니다.
      </Typography>
    </Box>
  );
}
