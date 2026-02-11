'use client';

import { useCallback } from 'react';
import { useSnackbar, VariantType, SnackbarMessage } from 'notistack';
import { Button } from '@mui/material';

interface CustomEnqueueSnackbarOptions {
  variant?: VariantType;
}

// snackbar에 기능 추가 : 클릭시 닫기
export function useCustomSnackbar() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const customEnqueueSnackbar = useCallback(
    (message: SnackbarMessage, options: CustomEnqueueSnackbarOptions = {}) => {
      enqueueSnackbar(message, {
        ...options,
        action: (key) => (
          <Button
            onClick={() => closeSnackbar(key)}
            style={{
              height: '100%',
              left: 0,
              position: 'absolute',
              top: 0,
              width: '100%',
            }}
          />
        ),
      });
    },
    [closeSnackbar, enqueueSnackbar]
  );

  return { enqueueSnackbar: customEnqueueSnackbar, closeSnackbar };
}
