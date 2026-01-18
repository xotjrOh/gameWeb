import React, { useMemo, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Chip,
  Stack,
  Typography,
  Button,
  TextField,
} from '@mui/material';
import { useAppSelector } from '@/hooks/useAppSelector';
import { ClientSocketType } from '@/types/socket';
import { Session } from 'next-auth';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

interface ParticipantsTabProps {
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

export default function ParticipantsTab({
  roomId,
  socket,
  session,
}: ParticipantsTabProps) {
  const players = useAppSelector((state) => state.shuffle.players) ?? [];
  const gameData = useAppSelector((state) => state.shuffle.gameData);
  const lastRoundResults = useAppSelector(
    (state) => state.shuffle.lastRoundResults
  );
  const { enqueueSnackbar } = useCustomSnackbar();
  const [isEnding, setIsEnding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [roundLimitInput, setRoundLimitInput] = useState<number>(
    gameData?.rankingRoundsTotal ?? 0
  );

  const roundScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    (lastRoundResults ?? []).forEach((result) => {
      map.set(result.id, result.roundScore);
    });
    return map;
  }, [lastRoundResults]);

  const submittedCount = useMemo(
    () => players.filter((player) => player.isAnswerSubmitted).length,
    [players]
  );

  const canEndRound =
    gameData?.currentPhase === 'answering' &&
    (gameData?.clips?.length ?? 0) > 0;
  const canStartNewGame = gameData?.currentPhase !== 'answering';

  const canSetRoundLimit =
    (gameData?.roundIndex ?? 0) === 0 &&
    gameData?.currentPhase === 'waiting' &&
    !gameData?.rankingLocked;

  const gainedPlayers = useMemo(
    () => (lastRoundResults ?? []).filter((result) => result.roundScore > 0),
    [lastRoundResults]
  );

  const handleEndRound = () => {
    if (!socket || !session?.user?.id) {
      enqueueSnackbar('소켓 또는 세션 정보가 없습니다.', { variant: 'error' });
      return;
    }
    if (!window.confirm('라운드를 종료하고 점수를 확정할까요?')) {
      return;
    }
    setIsEnding(true);
    socket.emit(
      'shuffle-end-round',
      { roomId, sessionId: session.user.id },
      (response) => {
        setIsEnding(false);
        if (!response.success) {
          enqueueSnackbar(response.message ?? '라운드 종료에 실패했습니다.', {
            variant: 'error',
          });
        }
      }
    );
  };

  const handleSetRoundLimit = () => {
    if (!socket || !session?.user?.id) {
      enqueueSnackbar('소켓 또는 세션 정보가 없습니다.', { variant: 'error' });
      return;
    }
    if (!Number.isInteger(roundLimitInput) || roundLimitInput < 1) {
      enqueueSnackbar('라운드 수는 1 이상의 정수여야 합니다.', {
        variant: 'error',
      });
      return;
    }
    socket.emit(
      'shuffle-set-round-limit',
      { roomId, sessionId: session.user.id, totalRounds: roundLimitInput },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '설정에 실패했습니다.', {
            variant: 'error',
          });
          return;
        }
        enqueueSnackbar('랭킹 라운드 수가 설정되었습니다.', {
          variant: 'success',
        });
      }
    );
  };

  const handleNewGame = () => {
    if (!socket || !session?.user?.id) {
      enqueueSnackbar('소켓 또는 세션 정보가 없습니다.', { variant: 'error' });
      return;
    }
    if (
      !window.confirm(
        '새 게임을 시작할까요?\n라운드/점수/우승 기록이 모두 초기화됩니다.'
      )
    ) {
      return;
    }
    setIsResetting(true);
    socket.emit(
      'shuffle-new-game',
      { roomId, sessionId: session.user.id },
      (response) => {
        setIsResetting(false);
        if (!response.success) {
          enqueueSnackbar(response.message ?? '새 게임 시작에 실패했습니다.', {
            variant: 'error',
          });
          return;
        }
        enqueueSnackbar('새 게임이 시작되었습니다. 라운드 수를 설정해주세요.', {
          variant: 'success',
        });
      }
    );
  };

  React.useEffect(() => {
    setRoundLimitInput(gameData?.rankingRoundsTotal ?? 0);
  }, [gameData?.rankingRoundsTotal]);

  return (
    <Box>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Typography variant="subtitle1" fontWeight={800}>
            라운드 컨트롤
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              color="primary"
              onClick={handleNewGame}
              disabled={isResetting || !canStartNewGame}
            >
              새 게임
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleEndRound}
              disabled={isEnding || !canEndRound}
            >
              라운드 종료
            </Button>
          </Stack>
        </Stack>
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            랭킹 라운드 설정
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="number"
              size="small"
              label="랭킹 라운드 수"
              value={roundLimitInput}
              onChange={(event) => {
                const value = Number(event.target.value);
                setRoundLimitInput(Number.isFinite(value) ? value : 0);
              }}
              sx={{ maxWidth: 160 }}
              disabled={!canSetRoundLimit}
            />
            <Button
              variant="outlined"
              onClick={handleSetRoundLimit}
              disabled={!canSetRoundLimit}
            >
              적용
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            현재 라운드 {gameData?.roundIndex ?? 0} /{' '}
            {(gameData?.rankingRoundsTotal ?? 0) || '미설정'}
          </Typography>
          {(gameData?.rankingRoundsTotal ?? 0) === 0 && (
            <Typography variant="caption" color="text.secondary">
              게임 시작 전에 랭킹 라운드 수를 설정해주세요.
            </Typography>
          )}
          {gameData?.rankingLocked && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label="우승자" color="success" size="small" />
              {(gameData?.rankingWinners ?? []).length > 0 ? (
                (gameData?.rankingWinners ?? []).map((name) => (
                  <Chip key={name} label={name} size="small" />
                ))
              ) : (
                <Chip label="없음" size="small" />
              )}
            </Stack>
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            label={`득점자 ${gainedPlayers.length}/${players.length}`}
            color={gainedPlayers.length ? 'success' : 'default'}
            variant="outlined"
            size="small"
          />
          <Chip
            label={`제출 ${submittedCount}/${players.length}`}
            color={submittedCount === players.length ? 'primary' : 'default'}
            variant="outlined"
            size="small"
          />
          {gainedPlayers.length > 0 ? (
            gainedPlayers.map((player) => (
              <Chip
                key={player.id}
                label={`${player.name} +${player.roundScore}`}
                color="success"
                size="small"
              />
            ))
          ) : (
            <Typography variant="caption" color="text.secondary">
              아직 라운드 결과가 없습니다.
            </Typography>
          )}
        </Stack>
      </Stack>
      <List>
        {players.map((player) => (
          <ListItem
            key={player.id}
            sx={{
              mb: 1,
              borderRadius: 1,
              backgroundColor:
                (roundScoreMap.get(player.id) ?? 0) > 0
                  ? 'rgba(76, 175, 80, 0.12)'
                  : player.isAnswerSubmitted
                    ? 'rgba(25, 118, 210, 0.08)'
                    : 'transparent',
            }}
            secondaryAction={
              <Stack direction="row" spacing={1} alignItems="center">
                {roundScoreMap.has(player.id) && (
                  <Chip
                    label={`+${roundScoreMap.get(player.id) ?? 0}`}
                    color={
                      (roundScoreMap.get(player.id) ?? 0) > 0
                        ? 'success'
                        : 'default'
                    }
                    variant="outlined"
                    size="small"
                  />
                )}
                <Chip
                  label={`승점 ${player.score ?? 0}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Stack>
            }
          >
            <Avatar>{player.name.charAt(0)}</Avatar>
            <ListItemText
              primary={player.name}
              secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={player.isAnswerSubmitted ? '제출 완료' : '미제출'}
                    color={player.isAnswerSubmitted ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
