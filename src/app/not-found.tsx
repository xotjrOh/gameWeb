'use client';

import { Typography, Button, Container, Paper } from '@mui/material';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh', // 전체 화면 높이
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5', // 배경색
        padding: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          borderRadius: '8px',
          textAlign: 'center',
          backgroundColor: '#ffffff', // 흰색 배경
        }}
      >
        <Typography variant="h4" color="error" gutterBottom>
          페이지를 찾을 수 없습니다 (404)
        </Typography>
        <Typography variant="body1" gutterBottom>
          요청하신 페이지가 존재하지 않거나, 접근 권한이 없습니다.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          component={Link}
          href="/"
          sx={{ mt: 3 }}
        >
          홈으로 돌아가기
        </Button>
      </Paper>
    </Container>
  );
}
