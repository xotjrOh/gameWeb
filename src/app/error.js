'use client';

import { useEffect } from "react";
import { Typography, Button, Container, Box } from '@mui/material';

export default function Error({ error, reset }) {

  useEffect(() => {
    console.error('Error:', error.message);
  }, [error?.message]);

  return (
    <Container
      sx={{
        minHeight: '100vh', // 전체 화면 높이
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5', // 배경색
        textAlign: 'center',
        padding: 2, // 여백 조정
      }}
      maxWidth={false}
    >
      <Box
        sx={{
          p: 4,
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: 3,
          maxWidth: '400px',
          width: '100%',
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          에러가 발생했습니다.
        </Typography>
        <Typography variant="body1" gutterBottom>
          {error.message}
        </Typography>
        <Button variant="contained" onClick={reset}>
          새로고침
        </Button>
      </Box>
    </Container>
  );
}
