'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import KakaoIcon from '@/components/icon/KakaoIcon';
import GoogleIcon from '@/components/icon/GoogleIcon';
import Link from 'next/link';
import {
  Container,
  Box,
  Button,
  Typography,
  Card,
  CardContent,
} from '@mui/material';

export default function SignInPage() {
  const [isKakaoBrowser, setIsKakaoBrowser] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('kakaotalk')) {
      setIsKakaoBrowser(true);
    }
  }, []);

  // 팝업창에서 로그인 창으로 돌아가면 종료
  useEffect(() => {
    if (window.opener) window.close();
  }, []);

  const handleSignIn = (provider) => {
    const popup = window.open(
      `/auth/popup?provider=${provider}`,
      'oauthPopup',
      'width=500,height=600'
    );

    if (!popup) {
      alert('팝업 차단을 해제해주세요.');
      return;
    }

    // 팝업 창으로부터 메시지 수신
    const messageHandler = (event) => {
      const callbackUrl =
        searchParams.get('callbackUrl') || window.location.origin;
      if (event.origin !== window.location.origin) return;
      if (event.data === 'oauth:success') {
        // 인증 성공 시 처리
        router.replace(callbackUrl);
      } else if (event.data === 'oauth:error') {
        // 인증 실패 시 처리
        alert('인증에 실패했습니다.');
      }
    };

    window.addEventListener('message', messageHandler);

    // 팝업 창이 닫혔을 때 이벤트 리스너 제거
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', messageHandler);
      }
    }, 500);
  };

  return (
    <Container
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: 'url("/images/background-image.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}
      maxWidth={false}
    >
      {/* 어두운 오버레이 */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'rgba(0, 0, 0, 0.7)',
        }}
      ></Box>

      {/* 룰 설명 버튼 */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 50 }}>
        <Button
          variant="contained"
          color="primary"
          component={Link}
          href="/games/horse"
          prefetch={false}
          sx={{
            py: 1,
            px: 2,
            fontWeight: 'bold',
            borderRadius: '50px',
            boxShadow: 3,
            transition: '0.2s',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
        >
          룰 설명 보기
        </Button>
      </Box>

      <Card
        sx={{
          zIndex: 10,
          backdropFilter: 'blur(10px)',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '20px',
          boxShadow: 5,
          width: '90%', // 더 넓게 설정 (반응형)
          maxWidth: 400, // 최대 너비 제한
          py: 2, // 위아래 여백 증가
          px: 2, // 좌우 여백 증가
        }}
      >
        <CardContent>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: 'text.primary',
              textAlign: 'center',
              fontFamily: '"Noto Sans KR", sans-serif',
            }}
          >
            간편 로그인
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              fullWidth
              sx={{
                bgcolor: '#FEE500',
                '&:hover': { bgcolor: '#FFD700' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 20px',
              }}
              onClick={() => handleSignIn('kakao')}
            >
              <KakaoIcon sx={{ mr: 1 }} />
              <Typography
                variant="button"
                sx={{ fontWeight: 'bold', color: 'inherit' }} // 상속된 컬러 유지
              >
                카카오 로그인
              </Typography>
            </Button>

            {/* 구글 로그인 버튼 */}
            <Button
              variant="contained"
              fullWidth
              disabled={isKakaoBrowser}
              sx={{
                bgcolor: isKakaoBrowser ? 'grey.400' : 'error.main',
                '&:hover': {
                  bgcolor: isKakaoBrowser ? 'grey.500' : 'error.dark',
                },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 20px',
                color: isKakaoBrowser ? 'grey.200' : 'white',
              }}
              onClick={() => handleSignIn('google')}
            >
              <GoogleIcon sx={{ mr: 1 }} />
              {isKakaoBrowser ? (
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 'bold', textAlign: 'center' }}
                >
                  구글 로그인 불가 <br />
                  <Typography variant="caption">
                    (카카오톡 브라우저 미지원)
                  </Typography>
                </Typography>
              ) : (
                <Typography
                  variant="button"
                  sx={{ fontWeight: 'bold', color: 'inherit' }}
                >
                  구글 로그인
                </Typography>
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
