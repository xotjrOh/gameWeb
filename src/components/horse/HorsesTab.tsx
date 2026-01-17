'use client';

import { memo, useMemo } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Grid2 as Grid,
} from '@mui/material';
import { usePathname } from 'next/navigation';
import useRaceEnd from '@/hooks/useRaceEnd';
import { ClientSocketType } from '@/types/socket';
import { Session } from 'next-auth';
import { HorsePlayerData } from '@/types/horse';
import { Player } from '@/types/room';

interface HorsesTabProps {
  roomId: string;
  socket: ClientSocketType | null;
  session: Session | null;
}

function HorsesTab({ roomId, socket, session }: HorsesTabProps) {
  const { players, statusInfo } = useAppSelector((state) => state.horse);
  const { positions, finishLine, rounds } = useAppSelector(
    (state) => state.horse.gameData
  );
  const { hasRaceEnded } = useRaceEnd();

  // URL을 통해 호스트 여부 판단
  const pathname = usePathname() || '';
  const isHost = pathname.includes('/host');
  const isSoloOnlyView = statusInfo.isSolo && !hasRaceEnded && !isHost;

  const sortedPositions = useMemo(() => {
    return [...positions].sort((a, b) => a.name.localeCompare(b.name));
  }, [positions]);

  const getHorsePlayers = (horseName: string) => {
    return players
      .filter(
        (player) => (player as Player & HorsePlayerData).horse === horseName
      )
      .map((player) => player.name)
      .join(', ');
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 4, md: 6 },
        mt: 2,
        borderRadius: 3,
        border: '1px solid rgba(15,23,42,0.08)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
      }}
    >
      {/* 경주마 현황 제목 */}
      <Typography
        variant="h5"
        color="primary"
        fontWeight="bold"
        mb={4}
        sx={{ ml: '6px' }}
      >
        경주마 현황
      </Typography>

      {/* 경주마 리스트 */}
      <Grid container spacing={2}>
        {sortedPositions.map((horse, index) => (
          <Grid size={{ xs: 12 }} key={index}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: 'rgba(248,250,255,0.9)',
                borderRadius: 2,
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
              }}
            >
              <Box display="flex" alignItems="center">
                {/* 말 이름 */}
                <Typography variant="h6" sx={{ mr: 2, fontWeight: 'bold' }}>
                  {horse.name}
                </Typography>

                {/* 진행 바 */}
                <Box sx={{ flexGrow: 1, position: 'relative' }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((horse.position / finishLine) * 100, 100)}
                    sx={{
                      height: 16,
                      borderRadius: 999,
                      backgroundColor: 'rgba(37,99,235,0.15)',
                      '& .MuiLinearProgress-bar': {
                        background:
                          'linear-gradient(90deg, rgba(37,99,235,0.9) 0%, rgba(14,165,233,0.9) 100%)',
                      },
                    }}
                  />
                  {/* 경주마 아이콘 */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -18,
                      left: `${Math.min(
                        (horse.position / finishLine) * 100,
                        100
                      )}%`,
                      transform: 'translateX(-50%) scaleX(-1)', // 좌우 반전
                      fontSize: 25,
                    }}
                  >
                    🏇
                  </Box>
                </Box>

                {/* 현재 위치 */}
                <Typography variant="body1" sx={{ ml: 2 }}>
                  {horse.position}칸
                </Typography>
              </Box>

              {/* 플레이어 이름 (경주 종료 또는 호스트일 경우 표시) */}
              {(hasRaceEnded || isHost) && (
                <Typography variant="body2" color="textSecondary" mt={1}>
                  {getHorsePlayers(horse.name)}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 결승선 정보 */}
      <Typography
        variant="body2"
        color="textSecondary"
        textAlign="right"
        mt={1}
        sx={{ mr: '6px' }}
      >
        결승선: {finishLine}칸
      </Typography>

      {/* 라운드별 경주마 현황 */}
      <Box mt={3}>
        <Typography
          variant="h6"
          color="primary"
          fontWeight="bold"
          mb={2}
          sx={{ ml: '6px' }}
        >
          라운드별 경주마 현황
        </Typography>
        {statusInfo.isSolo && (
          <Typography
            variant="caption"
            sx={{
              display: 'inline-block',
              color: isSoloOnlyView ? 'warning.main' : 'textSecondary',
              fontWeight: 'bold',
              ml: '6px',
              mb: 1,
            }}
          >
            여기서의 베팅된 칩 개수는 솔로 플레이어에게만 보입니다.
          </Typography>
        )}
        {rounds && rounds.length > 0 ? (
          rounds.map((round, roundIndex) => {
            // 조건에 따라 bet 필터링
            const filteredRound = round.filter((bet) => {
              if (hasRaceEnded || isHost || statusInfo.isSolo) {
                // 조건을 만족하면 모든 bet을 포함
                return true;
              } else {
                // 그렇지 않으면 progress가 0이 아닌 bet만 포함
                return bet.progress !== 0;
              }
            });

            return (
              <Box key={roundIndex} mb={3}>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  mb={1}
                  sx={{ ml: '6px' }}
                >
                  라운드 {roundIndex + 1}
                </Typography>
                <Grid container spacing={1}>
                  {filteredRound.map((bet, betIndex) => (
                    <Grid size={{ xs: 12 }} key={betIndex}>
                      <Paper
                        elevation={1}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 2,
                          border: '1px solid',
                          borderColor: 'grey.300',
                        }}
                      >
                        <Typography variant="body1" fontWeight="medium">
                          {bet.horse}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          전진: {bet.progress}
                        </Typography>
                        {(hasRaceEnded || isHost || statusInfo.isSolo) && (
                          <Typography
                            variant="body2"
                            color={
                              isSoloOnlyView ? 'warning.main' : 'textSecondary'
                            }
                          >
                            칩: {bet.chips}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          })
        ) : (
          <Typography variant="body2" color="textSecondary" textAlign="center">
            아직 베팅 기록이 없습니다.
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default memo(HorsesTab);
