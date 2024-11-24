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
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { updateIsRoundStarted } from '@/store/horseSlice';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { Timer as TimerIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { ClientSocketType } from '@/types/socket';

interface StartRoundModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  socket: ClientSocketType | null;
}

interface StartRoundFormValues {
  duration: number;
}

function StartRoundModal({
  open,
  onClose,
  roomId,
  socket,
}: StartRoundModalProps) {
  const { enqueueSnackbar } = useCustomSnackbar();
  const dispatch = useAppDispatch();

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<StartRoundFormValues>({
    defaultValues: {
      duration: 300,
    },
  });

  useEffect(() => {
    if (errors.duration) {
      setFocus('duration');
    }
  }, [errors.duration, setFocus]);

  const onSubmit = (data: StartRoundFormValues) => {
    const duration = data.duration;
    if (!socket) {
      // socket 미연결
      enqueueSnackbar('연결이 되지 않았습니다. 새로고침해주세요', {
        variant: 'error',
      });
      return;
    }

    socket.emit('horse-start-round', { roomId, duration }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message, { variant: 'error' });
      } else {
        enqueueSnackbar('라운드가 성공적으로 시작되었습니다.', {
          variant: 'success',
        });
        dispatch(updateIsRoundStarted(true));
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        <Box display="flex" alignItems="center" sx={{ ml: '6px' }}>
          <TimerIcon sx={{ marginRight: 1 }} />
          라운드 지속 시간 설정
        </Box>
      </DialogTitle>
      <DialogContent>
        <form
          id="start-round-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Controller
            name="duration"
            control={control}
            rules={{
              required: '지속 시간을 입력해주세요.',
              min: {
                value: 1,
                message: '지속 시간은 1 이상의 자연수여야 합니다.',
              },
              validate: (value) =>
                Number.isInteger(value) || '지속 시간은 자연수여야 합니다.',
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="number"
                label="지속 시간 (초)"
                fullWidth
                margin="dense"
                error={!!fieldState.error}
                helperText={
                  fieldState.error
                    ? fieldState.error.message
                    : '플레이어들과 조율하여 라운드 시간을 정해주세요'
                }
                slotProps={{
                  formHelperText: {
                    sx: { ml: '6px' },
                  },
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
        <Button
          type="submit"
          form="start-round-form"
          color="primary"
          sx={{ mr: '6px' }}
        >
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StartRoundModal;
