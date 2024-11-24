import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { updateAnswer } from '@/store/shuffleSlice';
import { Session } from 'next-auth';
import { ClientSocketType } from '@/types/socket';

interface AnswerTabProps {
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

export default function AnswerTab({ roomId, socket, session }: AnswerTabProps) {
  const dispatch = useAppDispatch();
  const { gameData, statusInfo } = useAppSelector((state) => state.shuffle);
  const [answer, setAnswer] = useState<string[]>([]);

  const handleSubmit = () => {
    // 정답 제출 액션 디스패치
    dispatch(updateAnswer(answer));
  };

  // 드래그 앤 드롭 또는 입력을 통해 answer 상태를 업데이트하는 로직 구현
  // ...

  return (
    <Box>
      <Typography variant="h6">클립의 원래 순서를 맞춰보세요</Typography>
      {/* 순서 입력 UI */}
      {/* ... */}
      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={statusInfo.isAnswerSubmitted}
      >
        제출하기
      </Button>
    </Box>
  );
}
