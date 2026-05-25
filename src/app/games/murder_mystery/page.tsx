'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
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
  const prologueText = `프롤로그

몇 달 전 패배로 후원이 끊겼던 토끼를 위해, 용왕재단은 후원 재개를 위한 기자간담회를 열었다.

후원선수 복귀 기자간담회.

오늘 저녁 본행사가 시작되고 얼마 지나지 않아, 재활수조실 방향에서 다급한 외침이 끼어들었다.

거북 선수가 쓰러졌다고.

그날 재활수조실은 단수 상태였다. 한쪽 수조에는 3cm 남짓한 물만 남아 있었고, 다른 한쪽 수조는 비어 있었다.

그 사이의 타일 위에 거북은 쓰러져 있었다.

몸을 돌려 확인해보니 핏자국도 없었다. 타박상도, 목을 조른 흔적도 없었다.

그런데도 거북은 숨을 쉬지 않았다.

죽은 것처럼 보이지 않는 시체.
살해의 흔적 없는 현장.

그 시간,
강당을 벗어난건 넷.

남은 질문은 하나였다.
거북은 어떻게 죽었는가.`;

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
          <Paper sx={{ p: 3, borderRadius: 1 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              🕵️ 토끼와 거북이: 사실이라고 해서, 진실은 아니다
            </Typography>
            <Stack spacing={2}>
              <Card variant="outlined" sx={{ borderRadius: 1 }}>
                <CardContent>
                  <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                    {prologueText}
                  </Typography>
                </CardContent>
              </Card>
              <Typography>
                머더미스터리는 시나리오 기반 추리 게임입니다. 현재 등록된
                시나리오는 용궁섬 의료동에서 벌어진 3인 심리 추리극,{' '}
                <strong>토끼와 거북이: 사실이라고 해서, 진실은 아니다</strong>
                입니다.
              </Typography>
              <Typography>
                진행 단계는 오프닝, 3회 조사/토론, 최종 투표, 엔딩 순으로
                이어지며, 각 조사 라운드에서 플레이어는 1회만 조사할 수
                있습니다.
              </Typography>
              <Typography>
                플레이어 역할은 남편토끼 윤유성, 여우 조희수, 자라 서기준이며
                아내토끼 한다정은 NPC 증언자로만 등장합니다.
              </Typography>
              <Typography>
                단서는 이미지와 설명이 함께 공개되며, 특정 조건을 신고하면 잠금
                증언 카드가 전체 공개되거나 영구 폐기됩니다.
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: 'rgba(255,255,255,0.6)',
                }}
              >
                <Stack spacing={1}>
                  <Typography fontWeight={700}>
                    텀블벅용 프롤로그 이미지
                  </Typography>
                  <Box
                    component="a"
                    href="/images/murder-mystery/rabbit-turtle-finish-line-night/ref/prologue.png"
                    target="_blank"
                    rel="noreferrer"
                    sx={{ display: 'block' }}
                  >
                    <Box
                      component="img"
                      src="/images/murder-mystery/rabbit-turtle-finish-line-night/ref/prologue.png"
                      alt="텀블벅용 프롤로그 이미지"
                      sx={{
                        width: '100%',
                        maxHeight: 260,
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'rgba(255,255,255,0.58)',
                      }}
                    />
                  </Box>
                  <Button
                    component="a"
                    href="/images/murder-mystery/rabbit-turtle-finish-line-night/ref/prologue.png"
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    size="small"
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    이미지 크게 보기
                  </Button>
                </Stack>
              </Paper>
              <Divider />
              <Typography variant="body2" color="textSecondary">
                별도 진행자 없이 방장을 포함한 3명이 바로 플레이합니다.
              </Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
