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
import useJamoGameData from '@/hooks/useJamoGameData';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import JamoBoard from '@/components/jamo/JamoBoard';
import JamoMemoGrid from '@/components/jamo/JamoMemoGrid';
import JamoChatPanel from '@/components/jamo/JamoChatPanel';

interface JamoGamePageProps {
  params: {
    roomId: string;
  };
}

const phaseLabels: Record<string, string> = {
  waiting: '대기',
  discuss: '토의',
  result: '결과',
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
    players,
    you,
    gameData,
    board,
    successLog,
    chatLog,
    roundResult,
    submissionLimit,
  } = useAppSelector((state) => state.jamo);

  useCheckVersion(socket);
  useRedirectIfInvalidRoom(roomId);
  useUpdateSocketId(socket, session, roomId);
  useJamoGameData(roomId, socket, sessionId);
  useLeaveRoom(socket, dispatch);

  const [numbersInput, setNumbersInput] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'fail'>(
    'idle'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSubmitStatus('idle');
    setIsSubmitting(false);
  }, [gameData.roundNo, gameData.phase]);

  useEffect(() => {
    setNumbersInput('');
  }, [gameData.roundNo]);

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
      'jamo_submit_numbers',
      { roomId, sessionId, numbers: numbersInput },
      (response) => {
        setIsSubmitting(false);
        if (!response.success) {
          setSubmitStatus('fail');
          return;
        }
        setSubmitStatus('success');
        setNumbersInput('');
      }
    );
  };

  const handleSendChat = (message: string) => {
    if (!socket || !sessionId) {
      return;
    }
    socket.emit(
      'jamo_send_chat',
      { roomId, sessionId, message },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '메시지 전송 실패', {
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

  const mySuccesses = successLog.filter((entry) => entry.playerId === you?.id);
  const remainingSubmits = submissionLimit - (you?.submissionCount ?? 0);

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
          <Chip label={`Round ${gameData.roundNo}`} />
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
            공개된 칸만 자모가 보입니다. 나머지는 추측해서 제출할 수 있습니다.
          </Typography>
        </Paper>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper sx={{ p: 2, borderRadius: 3, flex: 1 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              정답 제출
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                value={numbersInput}
                onChange={(event) => {
                  setNumbersInput(event.target.value);
                  if (submitStatus !== 'idle') {
                    setSubmitStatus('idle');
                  }
                }}
                placeholder="예: 1,3,11,7,19"
                size="small"
                disabled={
                  gameData.phase !== 'discuss' ||
                  isSubmitting ||
                  remainingSubmits <= 0
                }
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={
                    gameData.phase !== 'discuss' ||
                    isSubmitting ||
                    remainingSubmits <= 0 ||
                    numbersInput.trim().length === 0
                  }
                >
                  제출
                </Button>
                <Chip
                  label={`남은 제출 ${Math.max(0, remainingSubmits)}회`}
                  size="small"
                  color={remainingSubmits <= 3 ? 'warning' : 'default'}
                />
                {submitStatus !== 'idle' && (
                  <Chip
                    label={submitStatus === 'success' ? '성공' : '실패'}
                    color={submitStatus === 'success' ? 'success' : 'default'}
                    size="small"
                  />
                )}
              </Stack>
              <Typography variant="caption" color="textSecondary">
                중복 번호는 불가하며, 성공/실패만 표시됩니다.
              </Typography>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 3, flex: 1 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              내 성공 목록
            </Typography>
            {mySuccesses.length === 0 ? (
              <Typography color="textSecondary">
                아직 성공 기록이 없습니다.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {mySuccesses.map((entry) => (
                  <Paper key={entry.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography fontWeight={600}>{entry.word}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      점수 {entry.score} · 번호 {entry.numbers.join(', ')}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      제출 {formatTimestamp(entry.submittedAt)}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            참가자 점수
          </Typography>
          <Stack spacing={1}>
            {players.map((player) => (
              <Stack
                key={player.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography fontWeight={600}>{player.name}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={`점수 ${player.score}`} size="small" />
                  <Chip label={`성공 ${player.successCount}`} size="small" />
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <JamoMemoGrid memo={memo} onChange={handleMemoChange} />
        </Paper>

        <JamoChatPanel messages={chatLog} onSend={handleSendChat} />

        {roundResult && (
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              라운드 {roundResult.roundNo} 결과
            </Typography>
            <Stack spacing={1}>
              <Typography>
                성공자 수: {roundResult.successPlayerCount}명
              </Typography>
              <Typography>
                우승:{' '}
                {roundResult.winner
                  ? `${roundResult.winner.playerName} (${roundResult.winner.score}점)`
                  : '없음'}
              </Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={600}>
              전체 성공 목록
            </Typography>
            {roundResult.successes.length === 0 ? (
              <Typography color="textSecondary">
                성공 기록이 없습니다.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {roundResult.successes.map((entry) => (
                  <Paper key={entry.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography fontWeight={600}>
                      {entry.playerName} · {entry.word}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      점수 {entry.score} · 번호 {entry.numbers.join(', ')}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      제출 {formatTimestamp(entry.submittedAt)}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
