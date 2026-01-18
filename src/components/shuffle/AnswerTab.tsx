import { useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Paper,
  IconButton,
  Chip,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { updateAnswer } from '@/store/shuffleSlice';
import { Session } from 'next-auth';
import { ClientSocketType } from '@/types/socket';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

interface AnswerTabProps {
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

export default function AnswerTab({ roomId, socket, session }: AnswerTabProps) {
  const dispatch = useAppDispatch();
  const { gameData, statusInfo } = useAppSelector((state) => state.shuffle);
  const { enqueueSnackbar } = useCustomSnackbar();
  const sessionId = session?.user?.id ?? '';
  const clipCount =
    (gameData?.clips?.length ?? 0) || (gameData?.correctOrder?.length ?? 0);
  const baseLetters = useMemo(
    () =>
      Array.from({ length: clipCount }, (_, i) => String.fromCharCode(65 + i)),
    [clipCount]
  );
  const roundKey = useMemo(
    () => (gameData?.correctOrder ? gameData.correctOrder.join(',') : ''),
    [gameData?.correctOrder]
  );
  const [order, setOrder] = useState<string[]>(baseLetters);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setOrder(baseLetters);
    setIsSubmitted(false);
  }, [baseLetters.join(','), roundKey]);

  const reorder = (list: string[], from: number, to: number) => {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const handleSubmit = () => {
    if (!socket || !sessionId) {
      enqueueSnackbar('소켓 연결 또는 세션 정보가 없습니다.', {
        variant: 'error',
      });
      return;
    }
    if (order.length === 0) {
      enqueueSnackbar('방장이 문제를 준비 중입니다.', {
        variant: 'info',
      });
      return;
    }
    socket.emit(
      'shuffle-submit-answer',
      { roomId, sessionId, answer: order },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '제출에 실패했습니다.', {
            variant: 'error',
          });
          return;
        }
        setIsSubmitted(true);
      }
    );
    // 로컬에도 기록(추후 결과 화면 등에서 활용 가능)
    dispatch(updateAnswer(order));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    setHoverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setHoverIndex(null);
      return;
    }
    setOrder((prev) => reorder(prev, dragIndex, index));
    setIsSubmitted(false);
    setDragIndex(null);
    setHoverIndex(null);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= order.length) return;
    setOrder((prev) => reorder(prev, index, nextIndex));
    setIsSubmitted(false);
  };

  // 드래그 앤 드롭 또는 입력을 통해 answer 상태를 업데이트하는 로직 구현
  // ...

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 720,
        mx: 'auto',
      }}
    >
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Typography variant="h5" fontWeight={800}>
            정답 순서를 맞춰보세요
          </Typography>
          <Chip
            label={`내 승점 ${statusInfo?.score ?? 0}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {clipCount > 0
            ? `이번 문제는 ${clipCount}조각입니다. 드래그로 순서를 바꿔주세요.`
            : '방장이 문제를 준비 중입니다.'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          순서를 수정하면 제출 상태가 해제됩니다.
        </Typography>
      </Stack>

      {order.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            borderStyle: 'dashed',
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          문제를 불러오는 중입니다…
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {order.map((letter, index) => (
            <Paper
              key={`${letter}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setHoverIndex(null);
              }}
              sx={{
                px: 2,
                py: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                border:
                  hoverIndex === index
                    ? '2px solid #1976d2'
                    : '1px solid rgba(0,0,0,0.12)',
                backgroundColor:
                  dragIndex === index ? 'rgba(25,118,210,0.08)' : '#fff',
                cursor: 'grab',
              }}
            >
              <DragIndicatorIcon color="disabled" />
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ minWidth: 32, textAlign: 'center' }}
              >
                {letter}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton
                size="small"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                aria-label="move-left"
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => moveItem(index, 1)}
                disabled={index === order.length - 1}
                aria-label="move-right"
              >
                <ArrowForwardIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Stack>
      )}

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={order.length === 0 || !socket || !sessionId}
          size="large"
        >
          제출하기
        </Button>
        {isSubmitted && (
          <Chip
            icon={<CheckCircleIcon />}
            label="제출 완료"
            color="success"
            variant="outlined"
          />
        )}
      </Stack>
    </Box>
  );
}
