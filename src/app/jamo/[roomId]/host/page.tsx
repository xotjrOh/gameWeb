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
import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import JamoBoard from '@/components/jamo/JamoBoard';
import { playFanfare } from '@/lib/playFanfare';

interface JamoHostPageProps {
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

export default function JamoHostPage({ params }: JamoHostPageProps) {
  const { roomId } = params;
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const { data: session } = useSession();
  const router = useRouter();
  const { enqueueSnackbar } = useCustomSnackbar();
  const sessionId = session?.user?.id ?? '';

  const {
    players,
    gameData,
    board,
    ownership,
    assignments,
    draftSubmissions,
    roundHistory,
    finalResult,
    roundResult,
  } = useAppSelector((state) => state.jamo);

  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [startDuration, setStartDuration] = useState<number>(
    gameData.roundDuration || 180
  );
  const [maxRoundsInput, setMaxRoundsInput] = useState<number>(
    gameData.maxRounds || 5
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    setStartDuration(gameData.roundDuration || 180);
  }, [gameData.roundDuration]);

  useEffect(() => {
    setMaxRoundsInput(gameData.maxRounds || 5);
  }, [gameData.maxRounds]);

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

  useCheckVersion(socket);
  useRedirectIfNotHost(roomId);
  useUpdateSocketId(socket, session, roomId);
  useJamoGameData(roomId, socket, sessionId);
  useLeaveRoom(socket, dispatch);

  const handleDistribute = () => {
    if (!socket) {
      return;
    }
    socket.emit('jamo_host_distribute', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '분배에 실패했습니다.', {
          variant: 'error',
        });
        return;
      }
      enqueueSnackbar('분배가 완료되었습니다.', { variant: 'success' });
    });
  };

  const handleResetRound = () => {
    if (!socket) {
      return;
    }
    socket.emit('jamo_reset_round', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '게임 리셋 실패', {
          variant: 'error',
        });
        return;
      }
      enqueueSnackbar('게임을 리셋했습니다.', {
        variant: 'success',
      });
    });
  };

  const handleSetMaxRounds = () => {
    if (!socket) {
      return;
    }
    const maxRounds = Number(maxRoundsInput);
    if (!Number.isInteger(maxRounds) || maxRounds < 1) {
      enqueueSnackbar('총 라운드 수를 확인해주세요.', {
        variant: 'error',
      });
      return;
    }
    socket.emit(
      'jamo_set_max_rounds',
      { roomId, sessionId, maxRounds },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '총 라운드 수 설정 실패', {
            variant: 'error',
          });
          return;
        }
        enqueueSnackbar(`총 ${maxRounds}라운드로 설정했습니다.`, {
          variant: 'success',
        });
      }
    );
  };

  const handleOpenStartDialog = () => {
    setStartDuration(gameData.roundDuration || 180);
    setStartDialogOpen(true);
  };

  const handleCloseStartDialog = () => {
    setStartDialogOpen(false);
  };

  const handleConfirmStart = () => {
    if (!socket) {
      return;
    }
    const nextDuration = Number(startDuration);
    if (!Number.isFinite(nextDuration) || nextDuration < 10) {
      enqueueSnackbar('라운드 시간을 확인해주세요.', {
        variant: 'error',
      });
      return;
    }
    socket.emit(
      'jamo_set_round_time',
      { roomId, sessionId, duration: nextDuration },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '시간 설정 실패', {
            variant: 'error',
          });
          return;
        }
        socket.emit('jamo_start_round', { roomId, sessionId }, (startRes) => {
          if (!startRes.success) {
            enqueueSnackbar(startRes.message ?? '라운드 시작 실패', {
              variant: 'error',
            });
            return;
          }
          enqueueSnackbar('라운드가 시작되었습니다.', {
            variant: 'success',
          });
          setStartDialogOpen(false);
        });
      }
    );
  };

  const handleEndRound = () => {
    if (!socket) {
      return;
    }
    socket.emit('jamo_force_end_round', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '라운드 종료 실패', {
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

  const isMaxRoundsReached = gameData.roundNo >= gameData.maxRounds;
  const canStartRound = gameData.phase !== 'discuss' && !isMaxRoundsReached;
  const startLabel =
    gameData.roundNo === 0
      ? '라운드 시작'
      : isMaxRoundsReached
        ? '최종 종료'
        : '다음 라운드';
  const submissions = useMemo(
    () =>
      Object.values(draftSubmissions ?? {}).sort(
        (a, b) => b.submittedAt - a.submittedAt
      ),
    [draftSubmissions]
  );
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
  const winnerId = roundResult?.winner?.playerId ?? null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 400px at 10% -10%, rgba(251,146,60,0.18), transparent 60%), radial-gradient(800px 400px at 100% -20%, rgba(56,189,248,0.15), transparent 60%), linear-gradient(180deg, #fff7ed 0%, #ffedd5 55%, #e0f2fe 100%)',
        px: { xs: 2, md: 4 },
        py: 3,
      }}
    >
      {showConfetti && finalResult?.winner && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={220}
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
            🔤단어게임 · 방장
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
          <Typography variant="h6" fontWeight={700} gutterBottom>
            라운드 제어
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleDistribute}
              disabled={gameData.phase === 'discuss'}
            >
              분배
            </Button>
            <TextField
              label="총 라운드"
              type="number"
              value={maxRoundsInput}
              onChange={(event) =>
                setMaxRoundsInput(Number(event.target.value))
              }
              sx={{ width: 140 }}
              inputProps={{ min: 1 }}
              disabled={gameData.phase === 'discuss'}
            />
            <Button
              variant="outlined"
              onClick={handleSetMaxRounds}
              disabled={gameData.phase === 'discuss'}
            >
              총 라운드 저장
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleResetRound}
              disabled={gameData.phase === 'discuss'}
            >
              게임 리셋
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleOpenStartDialog}
              disabled={!canStartRound}
            >
              {startLabel}
            </Button>
            <Button variant="outlined" color="warning" onClick={handleEndRound}>
              라운드 강제 종료
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <JamoBoard
            board={board}
            ownerByNumber={ownership}
            title="전체 보드"
          />
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            분배 요약
          </Typography>
          {assignments.length === 0 ? (
            <Typography color="textSecondary">
              아직 분배가 진행되지 않았습니다.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>playerId</TableCell>
                    <TableCell>닉네임</TableCell>
                    <TableCell>배정칸</TableCell>
                    <TableCell>배정 자모</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((entry) => (
                    <TableRow key={entry.playerId}>
                      <TableCell>{entry.playerId}</TableCell>
                      <TableCell>{entry.playerName}</TableCell>
                      <TableCell>{entry.numbers.join(', ') || '-'}</TableCell>
                      <TableCell>{entry.jamos.join(', ') || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            제출 현황(실시간)
          </Typography>
          {submissions.length === 0 ? (
            <Typography color="textSecondary">제출 내역이 없습니다.</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>playerId</TableCell>
                    <TableCell>닉네임</TableCell>
                    <TableCell>제출</TableCell>
                    <TableCell>파싱 번호</TableCell>
                    <TableCell>자모열</TableCell>
                    <TableCell>조합단어</TableCell>
                    <TableCell>조합성공</TableCell>
                    <TableCell>사전여부</TableCell>
                    <TableCell align="right">점수</TableCell>
                    <TableCell>제출시각</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map((entry) => (
                    <TableRow key={entry.playerId}>
                      <TableCell>{entry.playerId}</TableCell>
                      <TableCell>{entry.playerName}</TableCell>
                      <TableCell>{entry.raw}</TableCell>
                      <TableCell>{entry.numbers.join(', ') || '-'}</TableCell>
                      <TableCell>{entry.jamos.join(', ') || '-'}</TableCell>
                      <TableCell>{entry.word ?? '-'}</TableCell>
                      <TableCell>{entry.parsedOk ? 'O' : 'X'}</TableCell>
                      <TableCell>
                        {entry.parsedOk
                          ? entry.dictOk === null
                            ? '-'
                            : entry.dictOk
                              ? 'O'
                              : 'X'
                          : '-'}
                      </TableCell>
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

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            참가자 현황
          </Typography>
          <Stack spacing={1}>
            {sortedPlayers.map((player) => (
              <Stack
                key={player.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
              >
                <Typography fontWeight={600}>{player.name}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={`누적 ${player.totalScore}`} size="small" />
                  <Chip label={`성공 ${player.successCount}`} size="small" />
                  <Chip label={`제출 ${player.submissionCount}`} size="small" />
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Paper>

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
            roundHistory.map((history, index) => (
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
                      제한시간 {history.durationSec}초
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
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {history.successes.length === 0 ? (
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
                          {history.successes.map((entry, entryIndex) => (
                            <TableRow
                              key={entry.id}
                              sx={{
                                backgroundColor:
                                  entry.playerId === history.winner?.playerId
                                    ? 'rgba(34,197,94,0.15)'
                                    : undefined,
                              }}
                            >
                              <TableCell>{entryIndex + 1}</TableCell>
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
                </AccordionDetails>
              </Accordion>
            ))
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
        open={startDialogOpen}
        onClose={handleCloseStartDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>라운드 시간 설정</DialogTitle>
        <DialogContent>
          <TextField
            label="라운드 시간(초)"
            type="number"
            value={startDuration}
            onChange={(event) => setStartDuration(Number(event.target.value))}
            fullWidth
            inputProps={{ min: 10 }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStartDialog}>취소</Button>
          <Button variant="contained" onClick={handleConfirmStart}>
            시작
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
