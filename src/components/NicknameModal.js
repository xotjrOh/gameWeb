'use client';

import { useState } from 'react';
import { Box, Modal, Typography, TextField, Button } from '@mui/material';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

export default function NicknameModal({ isOpen, onClose, onSubmit }) {
  const [nickname, setNickname] = useState('');
  const { enqueueSnackbar } = useCustomSnackbar();

  const handleSubmit = () => {
    if (nickname.trim() === '') {
      // 닉네임이 비어있을 경우 처리
      return enqueueSnackbar('닉네임을 입력해주세요.', { variant: 'error' });
    }
    onSubmit(nickname);
    setNickname('');
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 300,
          bgcolor: 'background.card',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" component="h2" gutterBottom sx={{ p: 1 }}>
          게임에 참여하실 닉네임을 입력해주세요{' '}
          <Box component="span" sx={{ fontSize: '0.8rem', color: 'gray' }}>
            (최대 10자)
          </Box>
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          label="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          onClick={handleSubmit}
        >
          확인
        </Button>
      </Box>
    </Modal>
  );
}
