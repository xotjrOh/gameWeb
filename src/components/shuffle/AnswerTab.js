import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { updateAnswer } from '@/store/shuffleSlice';

export default function AnswerTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const { gameData, statusInfo } = useSelector((state) => state.shuffle);
  const [answer, setAnswer] = useState([]);

  const handleSubmit = () => {
    // 정답 제출 액션 디스패치
    dispatch(updateAnswer(socket, roomId, session.user.id, answer));
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
        disabled={statusInfo.answerSubmitted}
      >
        제출하기
      </Button>
    </Box>
  );
}
