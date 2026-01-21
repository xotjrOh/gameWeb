'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { JamoChatMessage } from '@/types/jamo';

interface JamoChatPanelProps {
  messages: JamoChatMessage[];
  onSend: (message: string) => void;
  disabled?: boolean;
  title?: string;
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

export default function JamoChatPanel({
  messages,
  onSend,
  disabled,
  title,
}: JamoChatPanelProps) {
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) {
      return;
    }
    onSend(trimmed);
    setInput('');
  };

  return (
    <Paper sx={{ p: 2, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title ?? '토의 채팅'}
      </Typography>
      <Box
        ref={listRef}
        sx={{
          maxHeight: 260,
          overflowY: 'auto',
          pr: 1,
          mb: 2,
        }}
      >
        {messages.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            아직 메시지가 없습니다.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {messages.map((message) => (
              <Box key={message.id}>
                <Typography variant="caption" color="textSecondary">
                  {message.playerName} · {formatTime(message.sentAt)}
                </Typography>
                <Typography variant="body2">{message.message}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
      <Stack direction="row" spacing={1}>
        <TextField
          value={input}
          onChange={(event) => setInput(event.target.value)}
          size="small"
          placeholder="메시지를 입력하세요"
          fullWidth
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
        />
        <Button variant="contained" onClick={handleSend} disabled={disabled}>
          전송
        </Button>
      </Stack>
    </Paper>
  );
}
