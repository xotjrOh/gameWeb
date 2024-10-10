'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button, Typography, Container, Paper } from '@mui/material';
import Header from '@/components/header/Header';
import ConstructionIcon from '@mui/icons-material/Construction'; // 공사중 아이콘

export default function ShuffleGame() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
    // socket?.emit('get-room-list'); // socket 관련 코드가 필요하다면 추가하세요.
  };

  return (
    <>
      <Header session={session} />
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ padding: 4, marginTop: 8, textAlign: 'center' }}>
          {/* 공사 중 아이콘 */}
          <ConstructionIcon color="action" sx={{ fontSize: 60, mb: 2 }} />

          {/* 제목 */}
          <Typography variant="h4" component="h1" color="textPrimary" sx={{ fontWeight: 'bold', mb: 2 }}>
            게임 준비 중입니다.
          </Typography>

          {/* 설명 문구 */}
          <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
            현재 이 게임은 개발 중입니다.<br/>
            곧 재미있는 게임으로 찾아뵙겠습니다!
          </Typography>

          {/* 홈으로 돌아가기 버튼 */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleGoHome}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              textTransform: 'none',
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
                bgcolor: 'primary.dark',
              },
            }}
          >
            홈으로 돌아가기
          </Button>
        </Paper>
      </Container>
    </>
  );
}
