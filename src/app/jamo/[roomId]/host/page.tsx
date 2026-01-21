'use client';

import { useEffect, useState } from 'react';
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
import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import JamoBoard from '@/components/jamo/JamoBoard';
import JamoChatPanel from '@/components/jamo/JamoChatPanel';

interface JamoHostPageProps {
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

export default function JamoHostPage({ params }: JamoHostPageProps) {
  const { roomId } = params;
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const { data: session } = useSession();
  const router = useRouter();
  const { enqueueSnackbar } = useCustomSnackbar();
  const sessionId = session?.user?.id ?? '';

  const { players, gameData, board, chatLog, roundResult } = useAppSelector(
    (state) => state.jamo
  );

  const startLabel =
    gameData.phase === 'result' ? '다음 라운드' : '라운드 시작';

  const [duration, setDuration] = useState<number>(
    gameData.roundDuration || 180
  );

  useEffect(() => {
    setDuration(gameData.roundDuration || 180);
  }, [gameData.roundDuration]);

  useCheckVersion(socket);
  useRedirectIfNotHost(roomId);
  useUpdateSocketId(socket, session, roomId);
  useJamoGameData(roomId, socket, sessionId);
  useLeaveRoom(socket, dispatch);

  const handleSetRoundTime = () => {
    if (!socket) {
      return;
    }
    socket.emit(
      'jamo_set_round_time',
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
    socket.emit('jamo_start_round', { roomId, sessionId }, (response) => {
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
    socket.emit('jamo_force_end_round', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '라운드 종료 실패', {
          variant: 'error',
        });
      }
    });
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
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Typography variant="h4" fontWeight={700}>
            🔤 자모 토의 단어게임 · 방장
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
          <Typography variant="h6" fontWeight={700} gutterBottom>
            라운드 제어
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="라운드 시간(초)"
              type="number"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              sx={{ width: 180 }}
              inputProps={{ min: 10 }}
            />
            <Button variant="outlined" onClick={handleSetRoundTime}>
              시간 적용
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleStartRound}
              disabled={gameData.phase === 'discuss'}
            >
              {startLabel}
            </Button>
            <Button variant="outlined" color="warning" onClick={handleEndRound}>
              라운드 강제 종료
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <JamoBoard board={board} title="전체 보드" />
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            참가자 현황
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
                <Stack direction="row" spacing={1}>
                  <Chip label={`점수 ${player.score}`} size="small" />
                  <Chip label={`성공 ${player.successCount}`} size="small" />
                  <Chip label={`제출 ${player.submissionCount}`} size="small" />
                </Stack>
              </Stack>
            ))}
          </Stack>
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
