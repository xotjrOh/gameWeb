'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import KakaoIcon from '@/components/icon/KakaoIcon';
import GoogleIcon from '@/components/icon/GoogleIcon';
import Link from 'next/link';
import { Container, Box, Button, Typography, Card, CardContent } from '@mui/material';


export default function SignInPage() {
  const [isKakaoBrowser, setIsKakaoBrowser] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('kakaotalk')) {
      setIsKakaoBrowser(true);
    }
  }, []);

  return (
    <Container
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: 'url("/images/background-image.avif")',
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
        <Link href="/games/horse" prefetch={false}>
          <Button
            variant="contained"
            color="primary"
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
        </Link>
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
              fontWeight: "bold", 
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
              onClick={() => signIn('kakao', { callbackUrl: '/' })}
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
                '&:hover': { bgcolor: isKakaoBrowser ? 'grey.500' : 'error.dark' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 20px',
                color: isKakaoBrowser ? 'grey.200' : 'white',
              }}
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              <GoogleIcon sx={{ mr: 1 }} />
              {isKakaoBrowser ? (
                <Typography variant="body2" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                  구글 로그인 불가 <br />
                  <Typography variant="caption">(카카오톡 브라우저 미지원)</Typography>
                </Typography>
              ) : (
                <Typography variant="button" sx={{ fontWeight: 'bold', color: 'inherit' }}>
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
