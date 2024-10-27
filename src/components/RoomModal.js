'use client';

import { useForm } from 'react-hook-form';
import { TextField, Button, Select, MenuItem, InputLabel, FormControl, Backdrop, IconButton, Box, Typography } from '@mui/material';
import { Cancel as CancelIcon } from '@mui/icons-material';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { useHideScroll } from '@/hooks/useHideScroll';
import { setIsLoading } from '@/store/loadingSlice';

export default function RoomModal({ closeModal, socket, router, dispatch, session }) {
  const { enqueueSnackbar } = useCustomSnackbar();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      roomName: '',
      gameType: 'horse',
      maxPlayers: '',
    },
  });

  const onSubmit = (data) => {
    if (!socket || !socket.connected || !socket.id) {
      return enqueueSnackbar('소켓 연결 대기 중입니다.', { variant: 'warning' });
    }

    dispatch(setIsLoading(true));
    socket.emit('create-room', { ...data, userName: session.user.name, sessionId: session.user.id }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message, { variant: 'error' });
        return dispatch(setIsLoading(false));
      }

      router.replace(`/${data.gameType}/${response.roomId}/host`);
      dispatch(setIsLoading(false));
    });
  };

  useHideScroll();

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}> 
      {/* 어두운 배경 */}
      <Backdrop open={true} onClick={closeModal} />
      
      {/* 모달 내용 */}
      <Box sx={{ backgroundColor: 'background.card', p: 4, borderRadius: 2, boxShadow: 24, zIndex: 10, width: '80%', maxWidth: 400, position: 'relative' }}>
        <IconButton 
          sx={{ position: 'absolute', top: 16, right: 16 }} 
          onClick={closeModal}
        >
          <CancelIcon />
        </IconButton>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h5" color="primary" fontWeight="bold">방 만들기</Typography>
          </Box>
        </Box>

        {/* 방 이름 입력 */}
        <TextField
          label="방 이름"
          {...register('roomName', { required: '방 이름을 입력해주세요.' })}
          error={!!errors.roomName}
          helperText={errors.roomName?.message}
          fullWidth
          variant="outlined"
          margin="normal"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
          slotProps={{
            formHelperText: {
              sx: {
                margin: 0, 
                paddingLeft: '12px',
                backgroundColor: 'background.card',  // 여기서 에러 문구의 색상을 검정으로 설정
              },
            }
          }}
        />

        {/* 게임 종류 선택 */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="game-type-label">게임 종류</InputLabel>
          <Select
            labelId="game-type-label"
            defaultValue="horse" MenuProps={{ PaperProps: { style: { maxHeight: 200, overflowY: 'auto' } } }}
            {...register('gameType', { required: '게임 종류가 미설정된 상태입니다.' })}
            label="게임 종류"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <MenuItem value="horse">🏇경마게임</MenuItem>
            <MenuItem value="shuffle">🔀뒤죽박죽</MenuItem>
          </Select>
        </FormControl>

        {/* 최대 인원 입력 */}
        <TextField label="최대 인원"
          type="text"
          {...register('maxPlayers', { required: '최대 인원을 입력해주세요.', valueAsNumber: true })}
          error={!!errors.maxPlayers}
          helperText={errors.maxPlayers?.message}
          fullWidth
          variant="outlined"
          margin="normal"
          onInput={(e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
          }}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
          slotProps={{
            formHelperText: {
              sx: {
                margin: 0, 
                paddingLeft: '12px',
                backgroundColor: 'background.card',  // 여기서 에러 문구의 색상을 검정으로 설정
              },
            }
          }}
        />

        {/* 방 만들기 버튼 */}
        <Button onClick={handleSubmit(onSubmit)}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          방 만들기
        </Button>
      </Box>
    </Box>
  );
}
