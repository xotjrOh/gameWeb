'use client';

import { Box, Container, Typography, Paper, Stack } from '@mui/material';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import PlaceGrid from '@/components/animal/PlaceGrid';

export default function AnimalRulePage() {
  const { data: session } = useSession();

  return (
    <>
      <Header session={session} />
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'radial-gradient(1200px 400px at 10% -10%, rgba(34,197,94,0.18), transparent 60%), radial-gradient(800px 400px at 100% -20%, rgba(59,130,246,0.12), transparent 60%), linear-gradient(180deg, #f0fdf4 0%, #dcfce7 55%, #dbeafe 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <Paper sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              🦁 동물 능력전 룰 요약
            </Typography>
            <Stack spacing={2}>
              <Typography>
                각 플레이어는 동물 역할과 능력을 부여받습니다. 준비 단계에서
                장소를 선택하고 잠근 뒤 라운드를 시작합니다.
              </Typography>
              <Typography>
                라운드 진행 중에는 사냥 의도와 능력을 사용합니다. 종료 시 서버가
                사냥 결과와 장소 정원 초과 여부를 판정합니다.
              </Typography>
              <Typography>
                정보는 완전하지 않으며, 정찰/기만/보호/정원 조작/이동/정산 개입
                능력을 통해 심리전과 협상을 유도합니다.
              </Typography>
              <PlaceGrid />
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
