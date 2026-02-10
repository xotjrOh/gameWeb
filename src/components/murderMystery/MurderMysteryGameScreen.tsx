'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/components/provider/SocketProvider';
import useCheckVersion from '@/hooks/useCheckVersion';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import useMurderMysteryGameData from '@/hooks/useMurderMysteryGameData';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { MurderMysteryPhase } from '@/types/murderMystery';

interface MurderMysteryGameScreenProps {
  roomId: string;
  isHostView: boolean;
}

const phaseLabelMap: Record<MurderMysteryPhase, string> = {
  LOBBY: '대기',
  INTRO: '오프닝',
  ROUND1_DISCUSS: '1R 토론',
  ROUND1_INVESTIGATE: '1R 조사',
  ROUND2_DISCUSS: '2R 토론',
  ROUND2_INVESTIGATE: '2R 조사',
  FINAL_VOTE: '최종 투표',
  ENDBOOK: '엔딩북',
};

export default function MurderMysteryGameScreen({
  roomId,
  isHostView,
}: MurderMysteryGameScreenProps) {
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const { data: session } = useSession();
  const router = useRouter();
  const { enqueueSnackbar } = useCustomSnackbar();
  const sessionId = session?.user?.id ?? '';
  const [selectedCardByRequestId, setSelectedCardByRequestId] = useState<
    Record<string, string>
  >({});

  useCheckVersion(socket);
  useUpdateSocketId(socket, session, roomId);
  useLeaveRoom(socket, dispatch);
  useRedirectIfNotHost(roomId, isHostView);
  useRedirectIfInvalidRoom(roomId, !isHostView);

  const { snapshot, latestAnnouncement, latestPartReveal } =
    useMurderMysteryGameData(roomId, socket, sessionId);

  useEffect(() => {
    if (!latestPartReveal) {
      return;
    }
    enqueueSnackbar(`파츠 공개: ${latestPartReveal.part.name}`, {
      variant: 'info',
    });
  }, [latestPartReveal, enqueueSnackbar]);

  useEffect(() => {
    if (!latestAnnouncement) {
      return;
    }
    if (
      latestAnnouncement.type === 'INTRO' ||
      latestAnnouncement.type === 'ENDBOOK'
    ) {
      enqueueSnackbar(
        `${latestAnnouncement.type} 낭독문이 전체 표시되었습니다.`,
        {
          variant: 'success',
        }
      );
    }
  }, [latestAnnouncement, enqueueSnackbar]);

  const emitWithAck = <T extends object>(
    eventName: string,
    payload: T,
    successMessage?: string
  ) => {
    if (!socket) {
      return;
    }
    const looseSocket = socket as unknown as {
      emit: (
        event: string,
        data: unknown,
        callback: (response: { success: boolean; message?: string }) => void
      ) => void;
    };
    looseSocket.emit(
      eventName,
      payload,
      (response: { success: boolean; message?: string }) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '요청 처리에 실패했습니다.', {
            variant: 'error',
          });
          return;
        }
        if (successMessage) {
          enqueueSnackbar(successMessage, { variant: 'success' });
        }
      }
    );
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

  const handleSubmitInvestigation = (targetId: string) => {
    emitWithAck(
      'mm_submit_investigation',
      {
        roomId,
        sessionId,
        targetId,
      },
      '조사를 완료했습니다.'
    );
  };

  const handleSubmitVote = (suspectPlayerId: string) => {
    emitWithAck(
      'mm_submit_vote',
      {
        roomId,
        sessionId,
        suspectPlayerId,
      },
      '최종 투표를 제출했습니다.'
    );
  };

  const handleResolvePending = (requestId: string, cardId?: string) => {
    emitWithAck(
      'mm_host_resolve_investigation',
      {
        roomId,
        sessionId,
        requestId,
        cardId: cardId || undefined,
      },
      '조사 결과 카드를 배포했습니다.'
    );
  };

  const latestAnnouncements = useMemo(
    () => [...(snapshot?.announcements ?? [])].slice(-6).reverse(),
    [snapshot?.announcements]
  );

  if (!snapshot) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Typography>머더미스터리 상태를 불러오는 중입니다.</Typography>
      </Box>
    );
  }

  const {
    scenario,
    phase,
    players,
    roleSheet,
    myCards,
    partsBoard,
    investigation,
    finalVote,
    endbook,
    hostControls,
  } = snapshot;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 400px at 10% -10%, rgba(180,83,9,0.2), transparent 60%), radial-gradient(900px 420px at 100% -20%, rgba(14,116,144,0.17), transparent 60%), linear-gradient(180deg, #fff7ed 0%, #ffedd5 52%, #e0f2fe 100%)',
        px: { xs: 2, md: 4 },
        py: 3,
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={1.5}
        >
          <Typography variant="h4" fontWeight={800}>
            🕵️ {scenario.roomDisplayName}
          </Typography>
          <Chip label={`ROOM ${roomId}`} />
          <Chip
            color="primary"
            label={`${phaseLabelMap[phase]} (${phase})`}
            sx={{ fontWeight: 700 }}
          />
          <Button variant="outlined" color="inherit" onClick={handleLeaveRoom}>
            나가기
          </Button>
        </Stack>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            시나리오
          </Typography>
          <Typography color="textSecondary">{scenario.title}</Typography>
        </Paper>

        {isHostView && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              GM 제어
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              {phase === 'LOBBY' ? (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() =>
                    emitWithAck(
                      'mm_host_start_game',
                      { roomId, sessionId },
                      '게임을 시작했습니다.'
                    )
                  }
                >
                  게임 시작
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() =>
                    emitWithAck(
                      'mm_host_next_phase',
                      { roomId, sessionId },
                      '다음 단계로 이동했습니다.'
                    )
                  }
                  disabled={phase === 'FINAL_VOTE' || phase === 'ENDBOOK'}
                >
                  다음 단계
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={() =>
                  emitWithAck('mm_host_broadcast_intro', { roomId, sessionId })
                }
                disabled={phase !== 'INTRO'}
              >
                INTRO 전체 표시
              </Button>
              <Button
                variant="outlined"
                onClick={() =>
                  emitWithAck('mm_host_finalize_vote', { roomId, sessionId })
                }
                disabled={phase !== 'FINAL_VOTE'}
              >
                최종 투표 집계
              </Button>
              <Button
                variant="outlined"
                onClick={() =>
                  emitWithAck('mm_host_broadcast_endbook', {
                    roomId,
                    sessionId,
                  })
                }
                disabled={phase !== 'ENDBOOK'}
              >
                ENDBOOK 전체 표시
              </Button>
              <Button
                variant="text"
                color="inherit"
                onClick={() =>
                  emitWithAck(
                    'mm_host_reset_game',
                    { roomId, sessionId },
                    '게임을 LOBBY 상태로 초기화했습니다.'
                  )
                }
              >
                게임 리셋
              </Button>
            </Stack>
          </Paper>
        )}

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            참가자 상태
          </Typography>
          <Stack spacing={1}>
            {players.map((player) => (
              <Stack
                key={player.id}
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                sx={{
                  p: 1.2,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.55)',
                }}
              >
                <Typography fontWeight={700}>
                  {player.name}{' '}
                  <Typography component="span">
                    ({player.displayName})
                  </Typography>
                </Typography>
                <Chip label={player.statusText} size="small" />
              </Stack>
            ))}
          </Stack>
        </Paper>

        {!isHostView && roleSheet && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              내 역할 시트
            </Typography>
            <Typography fontWeight={700}>{roleSheet.displayName}</Typography>
            <Typography sx={{ mt: 1 }}>{roleSheet.publicText}</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography color="textSecondary">
              {roleSheet.secretText}
            </Typography>
          </Paper>
        )}

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            파츠 보드 (전체 공개)
          </Typography>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            flexWrap="wrap"
          >
            {partsBoard.parts.map((part) => {
              const revealed = partsBoard.revealedPartIds.includes(part.id);
              return (
                <Card
                  key={part.id}
                  variant="outlined"
                  sx={{
                    width: { xs: '100%', md: 230 },
                    backgroundColor: revealed
                      ? 'rgba(187,247,208,0.5)'
                      : 'rgba(241,245,249,0.8)',
                  }}
                >
                  <CardContent>
                    <Typography fontWeight={700}>{part.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      출처: {part.source}
                    </Typography>
                    <Typography variant="body2">{part.note}</Typography>
                    <Chip
                      size="small"
                      label={revealed ? '공개됨' : '미공개'}
                      color={revealed ? 'success' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            조사 단계
          </Typography>
          {investigation.round ? (
            <Stack spacing={1}>
              <Typography>
                라운드 {investigation.round} 조사 / 배포모드:{' '}
                {investigation.deliveryMode}
              </Typography>
              {!isHostView && (
                <Typography color="textSecondary">
                  현재 라운드 조사 사용 여부:{' '}
                  {investigation.used ? '사용함' : '미사용'}
                </Typography>
              )}
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                flexWrap="wrap"
              >
                {investigation.targets.map((target) => (
                  <Button
                    key={target.id}
                    variant="contained"
                    color="inherit"
                    disabled={isHostView || investigation.used}
                    onClick={() => handleSubmitInvestigation(target.id)}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {target.label}
                  </Button>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Typography color="textSecondary">
              현재는 조사 단계가 아닙니다.
            </Typography>
          )}
        </Paper>

        {isHostView &&
          hostControls &&
          hostControls.pendingInvestigations.length > 0 && (
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                조사 결과 수동 배포
              </Typography>
              <Stack spacing={1.5}>
                {hostControls.pendingInvestigations.map((pending) => (
                  <Stack
                    key={pending.requestId}
                    spacing={1}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <Typography>
                      {pending.playerName} / 라운드 {pending.round} /{' '}
                      {pending.targetLabel}
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                      <FormControl fullWidth size="small">
                        <InputLabel id={`pending-card-${pending.requestId}`}>
                          카드 선택
                        </InputLabel>
                        <Select
                          labelId={`pending-card-${pending.requestId}`}
                          value={
                            selectedCardByRequestId[pending.requestId] ?? ''
                          }
                          label="카드 선택"
                          onChange={(event) =>
                            setSelectedCardByRequestId((prev) => ({
                              ...prev,
                              [pending.requestId]: String(event.target.value),
                            }))
                          }
                        >
                          {pending.cardOptions.map((card) => (
                            <MenuItem key={card.id} value={card.id}>
                              {card.title}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        onClick={() =>
                          handleResolvePending(
                            pending.requestId,
                            selectedCardByRequestId[pending.requestId]
                          )
                        }
                      >
                        배포
                      </Button>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            조사 결과 카드
          </Typography>
          {!isHostView && myCards.length === 0 ? (
            <Typography color="textSecondary">
              아직 배정된 조사 카드가 없습니다.
            </Typography>
          ) : !isHostView ? (
            <Stack spacing={1}>
              {myCards.map((card) => (
                <Card key={card.id} variant="outlined">
                  <CardContent>
                    <Typography fontWeight={700}>{card.title}</Typography>
                    <Typography>{card.text}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Stack spacing={1}>
              {Object.entries(hostControls?.cardsByPlayerId ?? {}).map(
                ([playerId, cards]) => {
                  const player = players.find((entry) => entry.id === playerId);
                  return (
                    <Paper key={playerId} variant="outlined" sx={{ p: 1.2 }}>
                      <Typography fontWeight={700}>
                        {player?.name ?? playerId}
                      </Typography>
                      {cards.length === 0 ? (
                        <Typography color="textSecondary" variant="body2">
                          카드 없음
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {cards.map((card) => (
                            <Chip key={card.id} label={card.title} />
                          ))}
                        </Stack>
                      )}
                    </Paper>
                  );
                }
              )}
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            FINAL VOTE
          </Typography>
          <Typography>{finalVote.question}</Typography>
          <Typography color="textSecondary" sx={{ mt: 0.5 }}>
            제출: {finalVote.submittedVoters}/{finalVote.totalVoters}
          </Typography>
          {!isHostView && phase === 'FINAL_VOTE' && (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              sx={{ mt: 1 }}
            >
              {players.map((player) => (
                <Button
                  key={player.id}
                  variant={
                    finalVote.yourVote === player.id ? 'contained' : 'outlined'
                  }
                  onClick={() => handleSubmitVote(player.id)}
                >
                  {player.displayName}
                </Button>
              ))}
            </Stack>
          )}
          {finalVote.result && (
            <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5 }}>
              <Typography fontWeight={700}>
                집계 결과: {finalVote.result.matched ? '정답' : '오답'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                최고 지목 대상:{' '}
                {finalVote.result.suspectPlayerId ?? '동률 또는 없음'}
              </Typography>
            </Paper>
          )}
        </Paper>

        {endbook && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              ENDBOOK
            </Typography>
            <Stack spacing={1}>
              <Typography>{endbook.common}</Typography>
              <Typography>{endbook.variant}</Typography>
              <Typography fontWeight={700}>{endbook.closingLine}</Typography>
            </Stack>
          </Paper>
        )}

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            방송/진행 로그
          </Typography>
          {latestAnnouncements.length === 0 ? (
            <Typography color="textSecondary">아직 로그가 없습니다.</Typography>
          ) : (
            <Stack spacing={1}>
              {latestAnnouncements.map((announcement) => (
                <Paper key={announcement.id} variant="outlined" sx={{ p: 1.2 }}>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(announcement.at).toLocaleTimeString('ko-KR')} /{' '}
                    {announcement.type}
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                    {announcement.text}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
