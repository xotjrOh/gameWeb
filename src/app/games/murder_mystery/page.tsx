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
              🕵️ 반장을 죽였다 룰 요약
            </Typography>
            <Stack spacing={2}>
              <Typography>
                머더미스터리는 시나리오 기반 추리 게임입니다. 역할/단서/조사
                대상/엔딩 텍스트가 모두 시나리오 데이터에서 로드됩니다.
              </Typography>
              <Typography>
                진행 단계는 INTRO, 2회 토론/조사, FINAL VOTE, ENDBOOK 순으로
                고정되며, 각 조사 라운드에서 플레이어는 1회만 조사할 수
                있습니다.
              </Typography>
              <Typography>
                뗏목 파츠는 단서 카드 효과로 획득되며 획득 즉시 전체에게
                공개되어 파츠 보드에 누적됩니다.
              </Typography>
              <Divider />
              <Typography variant="body2" color="textSecondary">
                GM은 오프닝/엔딩북 낭독문 송출과 조사 카드 배포(자동/수동)를
                제어할 수 있습니다.
              </Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
