'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';

export default function JamoRulePage() {
  const { data: session } = useSession();

  return (
    <>
      <Header session={session} />
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'radial-gradient(1200px 400px at 10% -10%, rgba(251,146,60,0.18), transparent 60%), radial-gradient(800px 400px at 100% -20%, rgba(59,130,246,0.12), transparent 60%), linear-gradient(180deg, #fff7ed 0%, #ffedd5 55%, #e0f2fe 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <Paper sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              🔤 자모 토의 단어게임 룰 요약
            </Typography>
            <Stack spacing={2}>
              <Typography>
                6x4 보드(1~24)에 자음 14개와 모음 10개가 무작위로 배치됩니다.
                참가자들은 일부 칸만 확인한 상태로 토의하며 단어를 추리합니다.
              </Typography>
              <Typography>
                제출은 숫자 목록(예: 1,3,11,7,19)으로 하고, 서버가 자모를 조합해
                단어를 판정합니다. 정답은 사전 API에 존재하고 2음절 이상이어야
                합니다.
              </Typography>
              <Typography>
                같은 단어는 한 번만 성공 처리됩니다. 점수는 사용한 칸 번호
                합계이며, 라운드 종료 시 성공자 수와 최고 점수(동점이면 먼저
                성공한 사람)가 우승입니다.
              </Typography>
              <Divider />
              <Typography variant="body2" color="textSecondary">
                메모는 개인 전용이며, 채팅으로 토의한 뒤 언제든 제출할 수
                있습니다.
              </Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
