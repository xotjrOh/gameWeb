'use client';

import { Typography, Button, Container, Paper } from '@mui/material';
import { signIn } from "next-auth/react";
import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error') || 'Unknown Error';

  // 에러 메시지 매핑 (필요에 따라 추가)
  const errorMessages = {
    CredentialsSignin: '잘못된 자격 증명입니다. 다시 시도해주세요.',
    OAuthSignin: 'OAuth 로그인 중 오류가 발생했습니다.',
    OAuthCallback: 'OAuth 콜백 중 오류가 발생했습니다.',
    OAuthCreateAccount: 'OAuth 계정 생성 중 오류가 발생했습니다.',
    EmailCreateAccount: '이메일 계정 생성 중 오류가 발생했습니다.',
    Callback: '콜백 중 오류가 발생했습니다.',
    OAuthAccountNotLinked: '이 계정은 다른 로그인 방법과 연결되어 있습니다.',
    EmailSignin: '이메일 로그인 중 오류가 발생했습니다.',
    Default: '로그인 중 알 수 없는 오류가 발생했습니다.',
  };

  const errorMessage = errorMessages[errorCode] || errorMessages['Default'];

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh', // 전체 화면 높이
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fdecea', // Tailwind의 bg-red-50에 상응하는 색상
        padding: 2, // 컨테이너 내부 여백
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
          로그인 에러
        </Typography>
        <Typography variant="body1" color="error.main" gutterBottom>
          {errorMessage}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => signIn()}
          sx={{ mt: 3 }} // 상단 마진
        >
          다시 시도하기
        </Button>
      </Paper>
    </Container>
  );
}
