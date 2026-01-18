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
          <Button
            variant="contained"
            color="error"
            onClick={handleEndRound}
            disabled={isEnding || !canEndRound}
          >
            라운드 종료
          </Button>
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
