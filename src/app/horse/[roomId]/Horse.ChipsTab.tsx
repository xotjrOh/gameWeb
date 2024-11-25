'use client';

import { useEffect, useState, memo } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { setPlayers, updateMemo } from '@/store/horseSlice';
import useRaceEnd from '@/hooks/useRaceEnd';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import {
  Box,
  Typography,
  Paper,
  InputBase,
  useMediaQuery,
  useTheme,
} from '@mui/material';
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
  const { players, statusInfo } = useAppSelector((state) => state.horse);
  const { hasRaceEnded } = useRaceEnd();
  const [memoState, setMemoState] = useState<string[]>(statusInfo?.memo || []);
  const [debounceTimeouts, setDebounceTimeouts] = useState<
    Record<number, NodeJS.Timeout>
  >({});
  const { enqueueSnackbar } = useCustomSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (socket) {
      const updatePlayersAfterRoundEnd = ({
        players,
      }: {
        players: (Player & HorsePlayerData)[];
      }) => {
        dispatch(setPlayers(players));
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

  const handleMemoChange = (index: number, newMemo: string) => {
    if (newMemo.length > 16) {
      return enqueueSnackbar('메모는 최대 16자까지 입력할 수 있습니다.', {
        variant: 'error',
      });
    }
    if (!socket) {
      // socket 미연결
      enqueueSnackbar('연결이 되지 않았습니다. 새로고침해주세요', {
        variant: 'error',
      });
      return;
    }
    if (!session) {
      // session 미연결
      enqueueSnackbar('로그인이 확인되지 않습니다.', {
        variant: 'error',
      });
      return;
    }

    const updatedMemo = [...memoState];
    updatedMemo[index] = newMemo;
    setMemoState(updatedMemo);

    if (debounceTimeouts[index]) {
      clearTimeout(debounceTimeouts[index]);
    }

    const timeoutId = setTimeout(() => {
      socket.emit(
        'horse-update-memo',
        { roomId, index, memo: newMemo, sessionId: session.user.id },
        (response) => {
          if (response.success) {
            dispatch(updateMemo({ index, memo: newMemo }));
          } else {
            enqueueSnackbar(response.message || '메모 저장에 실패했습니다.', {
              variant: 'error',
            });
          }
        }
      );
    }, 600);

    setDebounceTimeouts((prev) => ({
      ...prev,
      [index]: timeoutId,
    }));
  };

  // 포커스를 잃었을 때 바로 서버에 업데이트 요청
  const handleBlur = (index: number) => {
    const newMemo = memoState[index];
    if (!socket) {
      // socket 미연결
      enqueueSnackbar('연결이 되지 않았습니다. 새로고침해주세요', {
        variant: 'error',
      });
      return;
    }
    if (!session) {
      // session 미연결
      enqueueSnackbar('로그인이 확인되지 않습니다.', {
        variant: 'error',
      });
      return;
    }
    socket.emit(
      'horse-update-memo',
      { roomId, index, memo: newMemo, sessionId: session.user.id },
      (response) => {
        if (response.success) {
          clearTimeout(debounceTimeouts[index]);
          dispatch(updateMemo({ index, memo: newMemo }));
        } else {
          enqueueSnackbar(response.message || '메모 저장에 실패했습니다.', {
            variant: 'error',
          });
        }
      }
    );
  };

  return (
    <Paper elevation={3} sx={{ p: { xs: 4, md: 6 }, mt: 2 }}>
      {/* 헤더 */}
      <Box display="flex" alignItems="baseline" mb={2}>
        <Typography
          variant="h5"
          color="primary"
          fontWeight="bold"
          sx={{ ml: '6px' }}
        >
          칩 개수
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
          (각 메모는 16글자 제한)
        </Typography>
      </Box>
      <Typography
        variant="body2"
        color="textSecondary"
        sx={{ ml: '6px', mr: '6px', mt: 1 }}
      >
        플레이어 정보를 메모하면 기억하기 편합니다.
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
            <Box key={index}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row', // 반응형 레이아웃 적용
                  alignItems: isMobile ? 'flex-start' : 'center',
                  py: 1,
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      whiteSpace: 'nowrap',
                      ml: '6px',
                      mr: isMobile ? 0 : 2,
                    }}
                  >
                    {player.dummyName}:{' '}
                    {player.chips.toString().padStart(2, '0')}개
                    {/* 칩 변화량 표시 */}
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
                    mt: isMobile ? 0.5 : 0,
                    width: '100%',
                    borderRadius: 1,
                    fontSize: '1rem',
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export default memo(ChipsTab);
