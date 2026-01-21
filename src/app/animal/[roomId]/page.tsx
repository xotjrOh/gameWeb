'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Chip,
  Divider,
  FormControl,
  MenuItem,
  Select,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/components/provider/SocketProvider';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import useAnimalGameData from '@/hooks/useAnimalGameData';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import PlaceGrid from '@/components/animal/PlaceGrid';
import { DEFAULT_PLACES, PlaceId } from '@/lib/animalPlaces';

interface AnimalGamePageProps {
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

const createReqId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function AnimalGamePage({ params }: AnimalGamePageProps) {
  const { roomId } = params;
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const { data: session } = useSession();
  const { enqueueSnackbar } = useCustomSnackbar();
  const sessionId = session?.user?.id ?? '';

  const {
    players,
    you,
    roleCard,
    gameData,
    placeSummary,
    intel,
    eventLog,
    roundResult,
  } = useAppSelector((state) => state.animal);

  useCheckVersion(socket);
  useRedirectIfInvalidRoom(roomId);
  useUpdateSocketId(socket, session, roomId);
  useAnimalGameData(roomId, socket, sessionId);
  useLeaveRoom(socket, dispatch);

  const [abilityTargets, setAbilityTargets] = useState<Record<string, string>>(
    {}
  );

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

  const isCarnivore = you?.speciesType === 'carnivore';
  const canSelectPlace =
    Boolean(you?.isAlive) && gameData.phase === 'ready' && !you?.locked;

  const handleSelectPlace = (placeId: PlaceId) => {
    if (!socket || !sessionId) {
      return;
    }
    socket.emit(
      'player_select_place',
      { roomId, sessionId, placeId },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '장소 선택에 실패했습니다.', {
            variant: 'error',
          });
        }
      }
    );
  };

  const handleLockToggle = (locked: boolean) => {
    if (!socket || !sessionId) {
      return;
    }
    socket.emit(
      'player_lock_place',
      { roomId, sessionId, locked },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '잠금 변경에 실패했습니다.', {
            variant: 'error',
          });
        }
      }
    );
  };

  const handleEat = (targetId: string) => {
    if (!socket || !sessionId) {
      return;
    }
    socket.emit(
      'carnivore_eat',
      { roomId, sessionId, targetPlayerId: targetId, reqId: createReqId() },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '사냥에 실패했습니다.', {
            variant: 'error',
          });
        }
      }
    );
  };

  const handleUseAbility = (
    abilityId: string,
    target?: { playerId?: string; placeId?: PlaceId }
  ) => {
    if (!socket || !sessionId) {
      return;
    }
    socket.emit(
      'player_use_ability',
      { roomId, sessionId, abilityId, target, reqId: createReqId() },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '능력 사용에 실패했습니다.', {
            variant: 'error',
          });
        }
      }
    );
  };

  const preyCandidates = useMemo(() => {
    if (!you?.placeId) {
      return [];
    }
    return players.filter(
      (player) =>
        player.isAlive &&
        player.speciesType !== 'carnivore' &&
        player.placeId &&
        player.placeId === you.placeId
    );
  }, [players, you?.placeId]);

  const abilityItems = roleCard?.abilities ?? [];
  const placeOptions = DEFAULT_PLACES;
  const playerOptions = players.filter(
    (player) => player.id !== you?.id && player.isAlive
  );
  const pendingTargetName = you?.pendingEatTargetId
    ? (players.find((player) => player.id === you.pendingEatTargetId)?.name ??
      you.pendingEatTargetId)
    : null;

  const canUseAbility = (abilityId: string) => {
    if (!you || !roleCard) {
      return false;
    }
    const ability = roleCard.abilities.find((item) => item.id === abilityId);
    if (!ability) {
      return false;
    }
    if (!you.isAlive) {
      return false;
    }
    if (!ability.allowedPhases.includes(gameData.phase)) {
      return false;
    }
    if (you.abilityState.usedThisRound) {
      return false;
    }
    const cooldown = you.abilityState.cooldowns[abilityId] ?? 0;
    if (cooldown > 0) {
      return false;
    }
    if (ability.usesPerGame) {
      const remaining = you.abilityState.remainingUses[abilityId] ?? 0;
      return remaining > 0;
    }
    return true;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 400px at 10% -10%, rgba(34,197,94,0.18), transparent 60%), radial-gradient(800px 400px at 100% -20%, rgba(59,130,246,0.12), transparent 60%), linear-gradient(180deg, #f0fdf4 0%, #dcfce7 55%, #dbeafe 100%)',
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
            🦁 동물 능력전
          </Typography>
          <Chip label={`ROOM ${roomId}`} sx={{ fontWeight: 600 }} />
          <Chip label={phaseLabels[gameData.phase] ?? gameData.phase} />
          <Chip label={`Round ${gameData.roundNo}/${gameData.totalRounds}`} />
          <Chip
            label={`남은 시간 ${formatTime(gameData.timeLeft)}`}
            color="primary"
          />
        </Stack>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            장소 선택
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            준비 단계에서만 이동이 가능하며, 잠그면 해당 라운드에 고정됩니다.
          </Typography>
          <PlaceGrid
            foodByPlace={placeStats.foodByPlace}
            statsByPlace={placeStats.statsByPlace}
            riskByPlace={placeStats.riskByPlace}
            selectedPlaceId={you?.placeId ?? undefined}
            onSelect={canSelectPlace ? handleSelectPlace : undefined}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={() => handleLockToggle(true)}
              disabled={
                !you?.placeId || !you?.isAlive || gameData.phase !== 'ready'
              }
            >
              잠금
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleLockToggle(false)}
              disabled={
                !you?.placeId || !you?.isAlive || gameData.phase !== 'ready'
              }
            >
              잠금 해제
            </Button>
            <Chip
              label={you?.locked ? '잠금됨' : '미잠금'}
              color={you?.locked ? 'success' : 'default'}
              variant="outlined"
            />
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper sx={{ p: 2, flex: 1, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              내 역할 카드
            </Typography>
            {!roleCard ? (
              <Typography color="textSecondary">
                역할 배정 대기 중입니다.
              </Typography>
            ) : (
              <Stack spacing={1}>
                <Typography fontWeight={700}>{roleCard.name}</Typography>
                <Typography color="textSecondary">
                  {roleCard.summary}
                </Typography>
                <Typography>종족: {roleCard.speciesType}</Typography>
                {roleCard.winHint && (
                  <Typography variant="body2" color="textSecondary">
                    목표 힌트: {roleCard.winHint}
                  </Typography>
                )}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2, flex: 1, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              내 상태
            </Typography>
            <Stack spacing={1}>
              <Typography>생존: {you?.isAlive ? '생존' : '사망'}</Typography>
              <Typography>장소: {you?.placeId ?? '미선택'}</Typography>
              <Typography>점수: {you?.score ?? 0}</Typography>
              <Typography>
                이번 라운드 사용 여부:{' '}
                {you?.abilityState.usedThisRound ? '사용함' : '미사용'}
              </Typography>
              {pendingTargetName && (
                <Chip label={`사냥 대상: ${pendingTargetName}`} size="small" />
              )}
            </Stack>
          </Paper>
        </Stack>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            능력 사용
          </Typography>
          {abilityItems.length === 0 ? (
            <Typography color="textSecondary">능력이 없습니다.</Typography>
          ) : (
            <Stack spacing={2}>
              {abilityItems.map((ability) => {
                const cooldown = you?.abilityState.cooldowns[ability.id] ?? 0;
                const remaining =
                  ability.usesPerGame !== undefined
                    ? (you?.abilityState.remainingUses[ability.id] ?? 0)
                    : null;
                const targetValue = abilityTargets[ability.id] ?? '';
                const needsTarget =
                  ability.targetType === 'place' ||
                  ability.targetType === 'player';
                const canUse =
                  canUseAbility(ability.id) &&
                  (!needsTarget || Boolean(targetValue));

                return (
                  <Paper
                    key={ability.id}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2 }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={700}>{ability.name}</Typography>
                        {cooldown > 0 && (
                          <Chip label={`쿨다운 ${cooldown}R`} size="small" />
                        )}
                        {remaining !== null && (
                          <Chip label={`남은 횟수 ${remaining}`} size="small" />
                        )}
                      </Stack>
                      <Typography variant="body2" color="textSecondary">
                        {ability.description}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        사용 페이즈: {ability.allowedPhases.join(', ')}
                      </Typography>
                      {ability.targetType === 'place' && (
                        <FormControl size="small" sx={{ maxWidth: 220 }}>
                          <Select
                            value={targetValue}
                            onChange={(event) =>
                              setAbilityTargets((prev) => ({
                                ...prev,
                                [ability.id]: event.target.value as string,
                              }))
                            }
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>장소 선택</em>
                            </MenuItem>
                            {placeOptions.map((place) => (
                              <MenuItem key={place.id} value={place.id}>
                                {place.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      {ability.targetType === 'player' && (
                        <FormControl size="small" sx={{ maxWidth: 220 }}>
                          <Select
                            value={targetValue}
                            onChange={(event) =>
                              setAbilityTargets((prev) => ({
                                ...prev,
                                [ability.id]: event.target.value as string,
                              }))
                            }
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>플레이어 선택</em>
                            </MenuItem>
                            {playerOptions.map((player) => (
                              <MenuItem key={player.id} value={player.id}>
                                {player.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!canUse}
                        onClick={() =>
                          handleUseAbility(
                            ability.id,
                            ability.targetType === 'place'
                              ? { placeId: targetValue as PlaceId }
                              : ability.targetType === 'player'
                                ? { playerId: targetValue }
                                : undefined
                          )
                        }
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        능력 사용
                      </Button>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Paper>

        {intel.length > 0 && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              획득한 정보
            </Typography>
            <Stack spacing={1}>
              {intel.map((entry) => (
                <Typography key={entry.id} variant="body2">
                  {entry.message}
                </Typography>
              ))}
            </Stack>
          </Paper>
        )}

        {isCarnivore && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              사냥 대상
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              같은 장소의 초식/잡식만 대상으로 선택할 수 있습니다. 사냥은 라운드
              종료 시 서버가 판정합니다.
            </Typography>
            <Stack spacing={1}>
              {preyCandidates.length === 0 && (
                <Typography color="textSecondary">
                  현재 장소에 사냥 가능한 대상이 없습니다.
                </Typography>
              )}
              {preyCandidates.map((target) => (
                <Stack
                  key={target.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography>{target.name}</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleEat(target.id)}
                    disabled={!you?.isAlive || gameData.phase !== 'running'}
                  >
                    사냥 지정
                  </Button>
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            이벤트 로그
          </Typography>
          {eventLog.length === 0 ? (
            <Typography color="textSecondary">아직 기록이 없습니다.</Typography>
          ) : (
            <Stack spacing={1}>
              {eventLog.slice(-8).map((entry) => (
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
              </>
            )}
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
