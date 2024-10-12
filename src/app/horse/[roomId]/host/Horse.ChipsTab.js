'use client';

import { useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updatePlayers } from '@/store/horseSlice';
import {
  Box,
  Typography,
  Paper,
  Divider,
} from '@mui/material';

function ChipsTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const { players } = useSelector((state) => state.horse.gameData);

  useEffect(() => {
    if (socket) {
      // 'round-ended' 이벤트를 수신하여 칩 개수 업데이트
      const updatePlayersAfterRoundEnd = ({ players }) => {
        dispatch(updatePlayers(players));
      };
      socket.on('round-ended', updatePlayersAfterRoundEnd);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        socket.off('round-ended', updatePlayersAfterRoundEnd);
      };
    }
  }, [socket?.id, dispatch]);

  return (
    <Paper elevation={3} sx={{ p: { xs: 4, md: 6 }, mt: 2 }}>
      <Typography variant="h5" color="primary" fontWeight="bold">
        칩 개수
      </Typography>
      {/* 플레이어 목록 */}
      <Box sx={{ mt: 2 }}>
        {players.map((player, index) => (
          <Box key={index} sx={{ py: 1 }}>
            <Typography variant="body1">
              {player.dummyName}: {player.chips.toString().padStart(2, '0')}개
              <Typography variant="caption" component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                ({player.horse}, {player.name}{player.isSolo ? ', 솔로' : ''}, {player.socketId})
              </Typography>
            </Typography>
            {index < players.length - 1 && <Divider />}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default memo(ChipsTab);
