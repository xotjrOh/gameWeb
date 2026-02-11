'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
  Stack,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';
import { useSocket } from '@/components/provider/SocketProvider';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import useJamoGameData from '@/hooks/useJamoGameData';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import JamoBoard from '@/components/jamo/JamoBoard';
import JamoMemoGrid from '@/components/jamo/JamoMemoGrid';
import { playFanfare } from '@/lib/playFanfare';

interface JamoGamePageProps {
  params: {
    roomId: string;
  };
}

const phaseLabels: Record<string, string> = {
  waiting: '대기',
  discuss: '진행',
  ended: '종료',
};

const formatTime = (timeLeft: number) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.max(0, timeLeft % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export default function JamoGamePage({ params }: JamoGamePageProps) {
  const { roomId } = params;
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const { data: session } = useSession();
  const router = useRouter();
  const { enqueueSnackbar } = useCustomSnackbar();
  const sessionId = session?.user?.id ?? '';

  const {
    you,
    players,
    gameData,
    board,
    roundHistory,
    finalResult,
    roundResult,
    draftSubmittedAt,
  } = useAppSelector((state) => state.jamo);

  useCheckVersion(socket);
  useRedirectIfInvalidRoom(roomId);
  useUpdateSocketId(socket, session, roomId);
  useJamoGameData(roomId, socket, sessionId);
  useLeaveRoom(socket, dispatch);

  const [numbersInput, setNumbersInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    setIsSubmitting(false);
  }, [gameData.roundNo, gameData.phase]);

  useEffect(() => {
    setNumbersInput('');
  }, [gameData.roundNo]);

  useEffect(() => {
    if (!finalResult?.winner) {
      setShowConfetti(false);
      return;
    }
    setShowConfetti(true);
    playFanfare();
    const timer = window.setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [finalResult?.decidedAt, finalResult?.winner?.playerId]);

  useEffect(() => {
    if (roundResult) {
      setResultDialogOpen(true);
    }
  }, [roundResult?.roundNo]);

  const storageKey = useMemo(() => {
    if (!sessionId) {
      return '';
    }
    return `jamoMemo:${roomId}:${sessionId}:${gameData.roundNo}`;
  }, [roomId, sessionId, gameData.roundNo]);

  const [memo, setMemo] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!storageKey) {
      return;
    }
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        setMemo(JSON.parse(raw));
      } catch (error) {
        setMemo({});
      }
    } else {
      setMemo({});
    }
  }, [storageKey]);

  const handleMemoChange = (num: number, value: string) => {
    setMemo((prev) => {
      const next = { ...prev, [num]: value };
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!socket || !sessionId || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    socket.emit(
      'jamo_submit_draft',
      { roomId, sessionId, raw: numbersInput },
      (response) => {
        setIsSubmitting(false);
        if (!response.success) {
          enqueueSnackbar('제출 저장에 실패했습니다.', {
            variant: 'error',
          });
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

  const submitLabel = draftSubmittedAt ? '제출 변경' : '제출';
  const canSubmit =
    gameData.phase === 'discuss' &&
    numbersInput.trim().length > 0 &&
    !isSubmitting;
  const winnerId = roundResult?.winner?.playerId ?? null;
  const sortedPlayers = useMemo(
    () =>
      [...players].sort((a, b) => {
        if ((b.totalScore ?? 0) !== (a.totalScore ?? 0)) {
          return (b.totalScore ?? 0) - (a.totalScore ?? 0);
        }
        if ((b.successCount ?? 0) !== (a.successCount ?? 0)) {
          return (b.successCount ?? 0) - (a.successCount ?? 0);
        }
        return a.id.localeCompare(b.id);
      }),
    [players]
  );
  const mySuccess = roundResult?.successes.find(
    (entry) => entry.playerId === you?.id
  );
  const myDelta = roundResult?.perPlayerDelta?.[you?.id ?? ''];
  const hasSubmitted = Boolean(draftSubmittedAt);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 400px at 10% -10%, rgba(251,146,60,0.18), transparent 60%), radial-gradient(800px 400px at 100% -20%, rgba(59,130,246,0.12), transparent 60%), linear-gradient(180deg, #fff7ed 0%, #ffedd5 55%, #e0f2fe 100%)',
        px: { xs: 2, md: 4 },
        py: 3,
      }}
    >
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={200}
          recycle={false}
        />
      )}
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Typography variant="h4" fontWeight={700}>
            🔤단어게임
          </Typography>
          <Chip label={`ROOM ${roomId}`} sx={{ fontWeight: 600 }} />
          <Chip label={phaseLabels[gameData.phase] ?? gameData.phase} />
          <Chip label={`라운드 ${gameData.roundNo}/${gameData.maxRounds}`} />
          <Chip
            label={`남은 시간 ${formatTime(gameData.timeLeft)}`}
            color="primary"
          />
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleLeaveRoom}
            disabled={gameData.phase === 'discuss'}
          >
            나가기
          </Button>
        </Stack>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <JamoBoard board={board} title="내 보드" />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            배정받은 칸만 자모가 표시되며, 나머지는 추측해서 제출합니다.
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            누적 스코어보드
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>순위</TableCell>
                  <TableCell>플레이어</TableCell>
                  <TableCell align="right">누적 점수</TableCell>
                  <TableCell align="right">성공 라운드</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedPlayers.map((player, index) => (
                  <TableRow key={player.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell align="right">{player.totalScore}</TableCell>
                    <TableCell align="right">{player.successCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper sx={{ p: 2, borderRadius: 3, flex: 1 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              정답 제출
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                value={numbersInput}
                onChange={(event) => setNumbersInput(event.target.value)}
                placeholder="예: 1,3,11,7,19"
                size="small"
                disabled={gameData.phase !== 'discuss' || isSubmitting}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {submitLabel}
                </Button>
                {draftSubmittedAt && (
                  <Chip
                    label={`저장됨 ${formatTimestamp(draftSubmittedAt)}`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Stack>
              <Typography variant="caption" color="textSecondary">
                라운드 종료 전까지 제출을 변경할 수 있으며, 정답/오답 피드백은
                제공되지 않습니다.
              </Typography>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 3, flex: 1 }}>
            <JamoMemoGrid memo={memo} onChange={handleMemoChange} />
          </Paper>
        </Stack>

        {roundResult && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              라운드 {roundResult.roundNo} 결과
            </Typography>
            <Stack spacing={1}>
              <Typography>성공자 수: {roundResult.successCount}명</Typography>
              <Typography>
                우승:{' '}
                {roundResult.winner
                  ? `${roundResult.winner.playerName} (${roundResult.winner.score}점)`
                  : '없음'}
              </Typography>
              <Typography>
                내 점수 변화:{' '}
                {myDelta
                  ? myDelta.success
                    ? `+${myDelta.gainedScore}`
                    : '+0'
                  : '+0'}
              </Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              성공 순위표
            </Typography>
            {roundResult.successes.length === 0 ? (
              <Typography color="textSecondary">
                성공 기록이 없습니다.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>순위</TableCell>
                      <TableCell>플레이어</TableCell>
                      <TableCell>단어</TableCell>
                      <TableCell align="right">점수</TableCell>
                      <TableCell>제출시각</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roundResult.successes.map((entry, index) => (
                      <TableRow
                        key={entry.id}
                        sx={{
                          backgroundColor:
                            entry.playerId === winnerId
                              ? 'rgba(34,197,94,0.15)'
                              : undefined,
                        }}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{entry.playerName}</TableCell>
                        <TableCell>{entry.word}</TableCell>
                        <TableCell align="right">{entry.score}</TableCell>
                        <TableCell>
                          {formatTimestamp(entry.submittedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            라운드 히스토리
          </Typography>
          {roundHistory.length === 0 ? (
            <Typography color="textSecondary">
              아직 종료된 라운드가 없습니다.
            </Typography>
          ) : (
            roundHistory.map((history, index) => {
              const delta = history.perPlayerDelta?.[you?.id ?? ''];
              return (
                <Accordion
                  key={`${history.roundNo}-${history.finalizedAt}`}
                  defaultExpanded={index === roundHistory.length - 1}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                      <Typography fontWeight={700}>
                        라운드 {history.roundNo}
                      </Typography>
                      <Typography variant="body2">
                        성공자 {history.successCount}명
                      </Typography>
                      <Typography variant="body2">
                        우승:{' '}
                        {history.winner
                          ? `${history.winner.playerName} (${history.winner.score}점)`
                          : '없음'}
                      </Typography>
                      <Typography variant="body2">
                        내 변화:{' '}
                        {delta?.success ? `+${delta.gainedScore}` : '+0'}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="textSecondary">
                      제한시간 {history.durationSec}초
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </Paper>

        {finalResult && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              최종 결과
            </Typography>
            <Typography sx={{ mb: 1 }}>
              우승:{' '}
              {finalResult.winner
                ? `${finalResult.winner.playerName} (누적 ${finalResult.winner.totalScore}점)`
                : '없음'}
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>순위</TableCell>
                    <TableCell>플레이어</TableCell>
                    <TableCell align="right">누적 점수</TableCell>
                    <TableCell align="right">성공 라운드</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {finalResult.standings.map((entry, index) => (
                    <TableRow
                      key={entry.playerId}
                      sx={{
                        backgroundColor:
                          entry.playerId === finalResult.winner?.playerId
                            ? 'rgba(251,191,36,0.2)'
                            : undefined,
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{entry.playerName}</TableCell>
                      <TableCell align="right">{entry.totalScore}</TableCell>
                      <TableCell align="right">{entry.successCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Stack>

      <Dialog
        open={resultDialogOpen}
        onClose={() => setResultDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{mySuccess ? '🎉 성공!' : '아쉽게 실패'}</DialogTitle>
        <DialogContent>
          {mySuccess ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Typography>단어: {mySuccess.word}</Typography>
              <Typography>획득: +{mySuccess.score}점</Typography>
            </Stack>
          ) : (
            <Typography sx={{ mt: 1 }}>
              {hasSubmitted
                ? '이번 라운드 제출은 성공하지 못했습니다.'
                : '이번 라운드에 제출하지 않았습니다.'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultDialogOpen(false)}>확인</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
