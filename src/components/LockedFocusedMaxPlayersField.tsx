'use client';

import {
  FormControl,
  FormHelperText,
  InputLabel,
  OutlinedInput,
} from '@mui/material';

interface LockedFocusedMaxPlayersFieldProps {
  value: number;
  error?: boolean;
  helperText?: string;
}

export default function LockedFocusedMaxPlayersField({
  value,
  error = false,
  helperText,
}: LockedFocusedMaxPlayersFieldProps) {
  return (
    <FormControl fullWidth margin="normal" variant="outlined" error={error}>
      <InputLabel shrink>최대 인원</InputLabel>
      <OutlinedInput
        label="최대 인원"
        value={String(value)}
        readOnly
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
        }}
      />
      {helperText ? (
        <FormHelperText
          sx={{
            margin: 0,
            paddingLeft: '12px',
            backgroundColor: 'background.card',
          }}
        >
          {helperText}
        </FormHelperText>
      ) : null}
    </FormControl>
  );
}
