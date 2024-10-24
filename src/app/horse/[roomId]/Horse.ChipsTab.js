'use client';

import { useEffect, useState, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updatePlayers, updateMemo } from '@/store/horseSlice';
import useRaceEnd from '@/hooks/useRaceEnd';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import {
  Box,
  Typography,
  Paper,
  InputBase,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';

function ChipsTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const { players, statusInfo } = useSelector((state) => state.horse.gameData);
  const { hasRaceEnded } = useRaceEnd();
  const [memoState, setMemoState] = useState(statusInfo?.memo || []);
  const [debounceTimeouts, setDebounceTimeouts] = useState({});
  const { enqueueSnackbar } = useCustomSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (socket) {
      const updatePlayersAfterRoundEnd = ({ players }) => {
        dispatch(updatePlayers(players));
      };
      socket.on('round-ended', updatePlayersAfterRoundEnd);

      return () => {
        socket.off('round-ended', updatePlayersAfterRoundEnd);
      };
    }
  }, [socket?.id, dispatch]);

  // 새로고침 시 memo 값 할당
  useEffect(() => {
    setMemoState(statusInfo?.memo || []);
  }, [statusInfo?.memo]);

  const handleMemoChange = (index, newMemo) => {
    if (newMemo.length > 16) {
      return enqueueSnackbar('메모는 최대 16자까지 입력할 수 있습니다.', { variant: 'error' });
    }

    const updatedMemo = [...memoState];
    updatedMemo[index] = newMemo;
    setMemoState(updatedMemo);

    if (debounceTimeouts[index]) {
      clearTimeout(debounceTimeouts[index]);
    }

    const timeoutId = setTimeout(() => {
      socket.emit('horse-update-memo', { roomId, index, memo: newMemo, sessionId: session.user.id }, (response) => {
        if (response.success) {
          dispatch(updateMemo({ index, memo: newMemo }));
        } else {
          enqueueSnackbar(response.message || '메모 저장에 실패했습니다.', { variant: 'error' });
        }
      });
    }, 600);

    setDebounceTimeouts((prev) => ({
      ...prev,
      [index]: timeoutId,
    }));
  };

  // 포커스를 잃었을 때 바로 서버에 업데이트 요청
  const handleBlur = (index) => {
    const newMemo = memoState[index];
    socket.emit('horse-update-memo', { roomId, index, memo: newMemo, sessionId: session.user.id }, (response) => {
      if (response.success) {
        clearTimeout(debounceTimeouts[index]);
        dispatch(updateMemo({ index, memo: newMemo }));
      } else {
        enqueueSnackbar(response.message || '메모 저장에 실패했습니다.', { variant: 'error' });
      }
    });
  };

  return (
    <Paper elevation={3} sx={{ p: { xs: 4, md: 6 }, mt: 2 }}>
      {/* 헤더 */}
      <Box display="flex" alignItems="baseline" mb={2}>
        <Typography variant="h5" color="primary" fontWeight="bold">
          칩 개수
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
          (각 메모는 16글자 제한)
        </Typography>
      </Box>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        플레이어 정보를 메모해 두면 기억하기 편리합니다.
      </Typography>

      {/* 플레이어 목록 */}
      <Box sx={{ mt: 2 }}>
        {players.map((player, index) => {
          const getChipDiffStyles = (chipDiff) => {
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
            <Box key={index}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row', // 반응형 레이아웃 적용
                  alignItems: isMobile ? 'flex-start' : 'center',
                  py: 2,
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'nowrap', mr: isMobile ? 0 : 2 }}>
                    {player.dummyName}: {player.chips.toString().padStart(2, '0')}개
                    {/* 칩 변화량 표시 */}
                    {player.chipDiff !== 0 && (
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ ml: 1, color: color }}
                      >
                        ({arrow}{Math.abs(player.chipDiff)})
                      </Typography>
                    )}
                    {hasRaceEnded && (
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ ml: 1, color: 'text.secondary' }}
                      >
                        ({player.horse}, {player.name}
                        {player.isSolo ? ', 솔로' : ''})
                      </Typography>
                    )}
                  </Typography>
                </Box>
                <InputBase
                  value={memoState[index] || ''}
                  onChange={(e) => handleMemoChange(index, e.target.value)}
                  onBlur={() => handleBlur(index)}
                  placeholder="플레이어 정보 메모"
                  inputProps={{ maxLength: 16 }}
                  sx={{
                    border: '1px solid',
                    borderColor: 'grey.400',
                    p: 1,
                    mt: isMobile ? 1 : 0,
                    width: '100%',
                    borderRadius: 1,
                    fontSize: '1rem',
                  }}
                />
              </Box>
              {index < players.length - 1 && <Divider />}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export default memo(ChipsTab);
