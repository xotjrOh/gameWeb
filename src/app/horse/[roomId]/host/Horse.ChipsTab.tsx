'use client';

import { useEffect, memo } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { setPlayers } from '@/store/horseSlice';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { ClientSocketType } from '@/types/socket';
import { Session } from 'next-auth';
import { Player } from '@/types/room';
import { HorsePlayerData } from '@/types/horse';

interface ChipsTabProps {
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

function ChipsTab({ roomId, socket, session }: ChipsTabProps) {
  const dispatch = useAppDispatch();
  const { players } = useAppSelector((state) => state.horse);

  useEffect(() => {
    if (socket) {
      // 'round-ended' 이벤트를 수신하여 칩 개수 업데이트
      const updatePlayersAfterRoundEnd = ({
        players,
      }: {
        players: (Player & HorsePlayerData)[];
      }) => {
        dispatch(setPlayers(players));
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
        {players.map((player: Player & HorsePlayerData, index) => {
          const getChipDiffStyles = (chipDiff: number) => {
            if (chipDiff > 0) {
              return { color: 'error.main', arrow: '▲' }; // 양수
            } else if (chipDiff < 0) {
              return { color: 'primary.main', arrow: '▼' }; // 음수
            } else {
              return { color: 'text.primary', arrow: '' }; // 변화 없음
            }
          };
          const { color, arrow } = getChipDiffStyles(player.chipDiff);

          return (
            <Box key={index} sx={{ py: 1 }}>
              <Typography variant="body1">
                {player.dummyName}: {player.chips.toString().padStart(2, '0')}개
                {player.chipDiff !== 0 && (
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ ml: 1, color: color }}
                  >
                    ({arrow}
                    {Math.abs(player.chipDiff)})
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ ml: 1, color: 'text.secondary' }}
                >
                  ({player.horse}, {player.name}
                  {player.isSolo ? ', 솔로' : ''}){/* , {player.socketId} */}
                </Typography>
              </Typography>
              {index < players.length - 1 && <Divider />}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export default memo(ChipsTab);
