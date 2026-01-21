'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Chip,
  TextField,
  Divider,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/components/provider/SocketProvider';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import useAnimalGameData from '@/hooks/useAnimalGameData';
import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import PlaceGrid from '@/components/animal/PlaceGrid';
import { PlaceId } from '@/lib/animalPlaces';

interface AnimalHostPageProps {
  params: {
    roomId: string;
  };
}

const phaseLabels: Record<string, string> = {
  ready: '준비',
  start: '시작',
  running: '라운드 진행',
  resolve: '정산 중',
  result: '결과',
  ended: '게임 종료',
};

const formatTime = (timeLeft: number) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.max(0, timeLeft % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const roleLabels: Record<string, string> = {
  owl: '부엉이',
  meerkat: '미어캣',
  fox: '여우',
  chameleon: '카멜레온',
  turtle: '거북이',
  beaver: '비버',
  hyena: '하이에나',
  gazelle: '가젤',
  porcupine: '호저',
  lion: '사자',
};

export default function AnimalHostPage({ params }: AnimalHostPageProps) {
  const { roomId } = params;
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const { data: session } = useSession();
  const router = useRouter();
  const { enqueueSnackbar } = useCustomSnackbar();
  const sessionId = session?.user?.id ?? '';

  const { players, gameData, placeSummary, eventLog, roundResult } =
    useAppSelector((state) => state.animal);

  const [duration, setDuration] = useState<number>(
    gameData.roundDuration || 180
  );

  useEffect(() => {
    setDuration(gameData.roundDuration || 180);
  }, [gameData.roundDuration]);

  useCheckVersion(socket);
  useRedirectIfNotHost(roomId);
  useUpdateSocketId(socket, session, roomId);
  useAnimalGameData(roomId, socket, sessionId);
  useLeaveRoom(socket, dispatch);

  const placeStats = useMemo(() => {
    const foodByPlace = placeSummary.reduce(
      (acc, place) => {
        acc[place.placeId] = place.capacity ?? null;
        return acc;
      },
      {} as Record<PlaceId, number | null>
    );

    const statsByPlace = placeSummary.reduce(
      (acc, place) => {
        acc[place.placeId] = {
          herbivores: place.herbivores,
          carnivores: place.carnivores,
        };
        return acc;
      },
      {} as Record<
        PlaceId,
        { herbivores: number | null; carnivores: number | null }
      >
    );

    const riskByPlace = placeSummary.reduce(
      (acc, place) => {
        acc[place.placeId] = place.risk;
        return acc;
      },
      {} as Record<PlaceId, 'safe' | 'risky' | 'over' | 'unknown'>
    );

    return { foodByPlace, statsByPlace, riskByPlace };
  }, [placeSummary]);

  const lockedCount = players.filter(
    (player) => player.locked && player.isAlive
  ).length;

  const handleAssignRoles = () => {
    if (!socket) {
      return;
    }
    socket.emit('host_assign_roles', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '역할 배정 실패', {
          variant: 'error',
        });
      }
    });
  };

  const handleSetRoundTime = () => {
    if (!socket) {
      return;
    }
    socket.emit(
      'host_set_round_time',
      { roomId, sessionId, duration },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '시간 설정 실패', {
            variant: 'error',
          });
        }
      }
    );
  };

  const handleStartRound = () => {
    if (!socket) {
      return;
    }
    socket.emit('host_start_round', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '라운드 시작 실패', {
          variant: 'error',
        });
      }
    });
  };

  const handleEndRound = () => {
    if (!socket) {
      return;
    }
    socket.emit('host_force_end_round', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '라운드 종료 실패', {
          variant: 'error',
        });
      }
    });
  };

  const handleResetGame = () => {
    if (!socket) {
      return;
    }
    socket.emit('host_reset_game', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '새 게임 초기화 실패', {
          variant: 'error',
        });
      }
    });
  };

  const handleLeaveRoom = () => {
    if (!socket || !sessionId) {
      return;
    }
    socket.emit('leave-room', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '방 나가기에 실패했습니다.', {
          variant: 'error',
        });
        return;
      }
      router.replace('/');
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 400px at 10% -10%, rgba(14,116,144,0.15), transparent 60%), radial-gradient(800px 400px at 100% -20%, rgba(16,185,129,0.18), transparent 60%), linear-gradient(180deg, #f0fdfa 0%, #ccfbf1 50%, #e0f2fe 100%)',
        px: { xs: 2, md: 4 },
        py: 3,
      }}
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Typography variant="h4" fontWeight={700}>
            🦁 동물 능력전 · 방장
          </Typography>
          <Chip label={`ROOM ${roomId}`} sx={{ fontWeight: 600 }} />
          <Chip label={phaseLabels[gameData.phase] ?? gameData.phase} />
          <Chip label={`Round ${gameData.roundNo}/${gameData.totalRounds}`} />
          <Chip
            label={`남은 시간 ${formatTime(gameData.timeLeft)}`}
            color="primary"
          />
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleLeaveRoom}
            disabled={gameData.phase === 'running'}
          >
            나가기
          </Button>
        </Stack>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            라운드 제어
          </Typography>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems="center"
          >
            <Button variant="contained" onClick={handleAssignRoles}>
              역할 배정
            </Button>
            <TextField
              label="라운드 시간(초)"
              type="number"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              sx={{ width: 180 }}
              inputProps={{ min: 30 }}
            />
            <Button variant="outlined" onClick={handleSetRoundTime}>
              시간 적용
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleStartRound}
            >
              라운드 시작
            </Button>
            <Button variant="outlined" color="warning" onClick={handleEndRound}>
              라운드 강제 종료
            </Button>
            <Button variant="outlined" color="error" onClick={handleResetGame}>
              새 게임
            </Button>
          </Stack>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            준비 완료(잠금): {lockedCount} /{' '}
            {players.filter((p) => p.isAlive).length}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            장소 현황
          </Typography>
          <PlaceGrid
            foodByPlace={placeStats.foodByPlace}
            statsByPlace={placeStats.statsByPlace}
            riskByPlace={placeStats.riskByPlace}
          />
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            플레이어 상태
          </Typography>
          <Stack spacing={1}>
            {players.map((player) => (
              <Stack
                key={player.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
              >
                <Typography fontWeight={600}>{player.name}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={
                      player.roleId
                        ? (roleLabels[player.roleId] ?? player.roleId)
                        : '미배정'
                    }
                    size="small"
                  />
                  <Chip label={player.speciesType} size="small" />
                  <Chip
                    label={player.placeId ?? '미선택'}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={player.locked ? '잠금' : '미잠금'}
                    size="small"
                  />
                  <Chip
                    label={player.isAlive ? '생존' : '사망'}
                    size="small"
                    color={player.isAlive ? 'success' : 'error'}
                  />
                  <Chip label={`점수 ${player.score}`} size="small" />
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            능력 사용 로그
          </Typography>
          {eventLog.length === 0 ? (
            <Typography color="textSecondary">아직 기록이 없습니다.</Typography>
          ) : (
            <Stack spacing={1}>
              {eventLog.slice(-12).map((entry) => (
                <Typography key={entry.id} variant="body2">
                  {entry.message}
                </Typography>
              ))}
            </Stack>
          )}
        </Paper>

        {roundResult && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              라운드 {roundResult.roundNo} 결과
            </Typography>
            <Stack spacing={1}>
              <Typography>섭취: {roundResult.eatenIds.length}명</Typography>
              <Typography>굶주림: {roundResult.starvedIds.length}명</Typography>
              <Typography>생존: {roundResult.survivors.length}명</Typography>
            </Stack>
            {roundResult.gameEnded && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography>
                  승리자: {roundResult.winners?.length ?? 0}명
                </Typography>
                <Typography>
                  패배자: {roundResult.losers?.length ?? 0}명
                </Typography>
              </>
            )}
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
