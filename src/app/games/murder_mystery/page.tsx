'use client';

import {
  Box,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';

export default function MurderMysteryRulePage() {
  const { data: session } = useSession();

  return (
    <>
      <Header session={session} />
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'radial-gradient(1200px 400px at 10% -10%, rgba(180,83,9,0.2), transparent 60%), radial-gradient(800px 400px at 100% -20%, rgba(2,132,199,0.15), transparent 60%), linear-gradient(180deg, #fff7ed 0%, #ffedd5 55%, #e0f2fe 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <Paper sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              🕵️ 토끼와 거북이, 결승선 다음의 밤
            </Typography>
            <Stack spacing={2}>
              <Typography>
                머더미스터리는 시나리오 기반 추리 게임입니다. 현재 등록된
                시나리오는 용궁섬 의료동에서 벌어진 4인 심리 스릴러,{' '}
                <strong>토끼와 거북이, 결승선 다음의 밤</strong>
                입니다.
              </Typography>
              <Typography>
                진행 단계는 오프닝, 2회 조사/토론, 최종 투표, 엔딩 순으로
                이어지며, 각 조사 라운드에서 플레이어는 1회만 조사할 수
                있습니다.
              </Typography>
              <Typography>
                핵심 문서와 공개 단서는 조사 카드 효과로 누적되며, 사건의 동선과
                은폐 정황을 좁히는 데 사용됩니다.
              </Typography>
              <Divider />
              <Typography variant="body2" color="textSecondary">
                GM은 오프닝/엔딩 낭독문 송출과 단계 진행을 제어할 수 있습니다.
              </Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
