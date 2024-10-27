import { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Box,
} from '@mui/material';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

function SettingsModal({ open, onClose, roomId, socket }) {
  const { enqueueSnackbar } = useCustomSnackbar();

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm({
    defaultValues: {
      finishLine: 9,
    },
  });

  useEffect(() => {
    if (errors.finishLine) {
      setFocus('finishLine');
    }
  }, [errors.finishLine, setFocus]);

  const onSubmit = (data) => {
    const finishLine = data.finishLine;
    socket.emit(
      'horse-update-settings',
      { roomId, finishLine },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message, { variant: 'error' });
        } else {
          enqueueSnackbar('설정이 성공적으로 업데이트되었습니다.', { variant: 'success' });
          onClose();
        }
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        <Box display="flex" alignItems="center" sx={{ ml: '6px' }}>
          <SettingsIcon sx={{ marginRight: 1 }} />
          골인지점 설정
        </Box>
      </DialogTitle>
      <DialogContent>
        <form id="settings-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="finishLine"
            control={control}
            rules={{
              required: '골인지점을 입력해주세요.',
              min: { value: 1, message: '골인지점은 1 이상의 자연수여야 합니다.' },
              max: { value: 20, message: '골인지점은 20 이하의 자연수여야 합니다.' },
              validate: value => Number.isInteger(value) || '골인지점은 자연수여야 합니다.',
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="number"
                label="골인지점"
                fullWidth
                margin="dense"
                error={!!fieldState.error}
                helperText={
                  fieldState.error
                    ? fieldState.error.message
                    : '골인지점은 5 이상 11 이하를 추천합니다.'
                }
                slotProps={{
                  formHelperText : {
                    sx : { ml: '6px' },
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? '' : parseInt(value, 10));
                }}
              />
            )}
          />
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          취소
        </Button>
        <Button type="submit" form="settings-form" color="primary" sx={{ mr: '6px' }}>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SettingsModal;
