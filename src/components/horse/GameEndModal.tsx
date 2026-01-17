'use client';

import { useEffect, useState } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import Image from 'next/image';
import {
  Box,
  Typography,
  Modal,
  Button,
  Fade,
  useMediaQuery,
  useTheme,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';
import { ClientSocketType } from '@/types/socket';

interface GameResult {
  winners: { horse: string; playerNames: string[] }[];
  losers: { horse: string; playerNames: string[] }[];
}

interface GameEndModalProps {
  socket: ClientSocketType | null;
  roomId: string;
}

export default function GameEndModal({ socket, roomId }: GameEndModalProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const { statusInfo } = useAppSelector((state) => state.horse); // 내 말 정보를 가져옴
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (socket) {
      const handleGameEnd = ({ winners, losers }: GameResult) => {
        setGameResult({ winners, losers });
        setIsOpen(true); // 게임이 끝났을 때 모달을 엶
      };

      socket.on('game-ended', handleGameEnd);

      return () => {
        socket.off('game-ended', handleGameEnd);
      };
    }
  }, [socket]);

  if (!isOpen || !gameResult) return null;

  const isMyHorseWinner = gameResult.winners.some(
    (winner) => winner.horse === statusInfo.horse
  );
  const isMyHorseLoser = gameResult.losers.some(
    (loser) => loser.horse === statusInfo.horse
  );

  const titleText = isMyHorseWinner
    ? '🎉 대역전 승리!'
    : isMyHorseLoser
      ? '😮 결승선 통과…'
      : '😢 아쉽게 패배';
  const subtitleText = isMyHorseWinner
    ? '정보 공유와 예측이 제대로 맞아떨어졌어요.'
    : isMyHorseLoser
      ? '이 게임은 결승선 통과 말이 꼴등이에요.'
      : '다음 판에는 판세가 언제든 뒤집힐 수 있어요.';

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      aria-labelledby="game-end-modal-title"
      closeAfterTransition
    >
      <Fade in={isOpen}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: isMyHorseWinner
              ? 'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.35), transparent 50%), radial-gradient(circle at 80% 0%, rgba(14,165,233,0.25), transparent 50%), linear-gradient(180deg, #0f172a 0%, #111827 100%)'
              : 'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.25), transparent 50%), radial-gradient(circle at 80% 0%, rgba(239,68,68,0.18), transparent 50%), linear-gradient(180deg, #0b1020 0%, #111827 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            textAlign: 'center',
          }}
        >
          {/* 승리 시 콘페티 효과 */}
          {isMyHorseWinner && (
            <Confetti
              width={width}
              height={height}
              numberOfPieces={200}
              recycle={false}
            />
          )}

          <Paper
            elevation={0}
            sx={{
              width: isMobile ? '92%' : 520,
              borderRadius: 4,
              p: { xs: 3, md: 4 },
              backgroundColor: 'rgba(255,255,255,0.96)',
              color: 'text.primary',
              boxShadow: '0 24px 60px rgba(15,23,42,0.35)',
            }}
          >
            <Stack spacing={2} alignItems="center">
              <Chip
                label="경기 종료"
                size="small"
                sx={{
                  fontWeight: 700,
                  borderRadius: 999,
                  backgroundColor: 'rgba(37,99,235,0.12)',
                  border: '1px solid rgba(37,99,235,0.2)',
                }}
              />

              {/* 승리/패배 이미지 */}
              <Box>
                <Image
                  src={
                    isMyHorseWinner
                      ? '/images/victory.webp'
                      : '/images/defeat.webp'
                  }
                  alt={isMyHorseWinner ? '승리' : '패배'}
                  width={isMobile ? 120 : 150}
                  height={isMobile ? 120 : 150}
                />
              </Box>

              {/* 승리/패배 메시지 */}
              <Typography
                id="game-end-modal-title"
                variant={isMobile ? 'h5' : 'h4'}
                component="h2"
                fontWeight={800}
                textAlign="center"
              >
                {titleText}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
              >
                {subtitleText}
              </Typography>

              {/* 내 말 정보 */}
              <Box
                sx={{
                  px: 2,
                  py: 0.6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(15,23,42,0.06)',
                  border: '1px solid rgba(15,23,42,0.08)',
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  내 말: {statusInfo.horse}
                </Typography>
              </Box>

              <Box sx={{ width: '100%' }}>
                {/* 우승한 말들 */}
                {gameResult.winners.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle1" fontWeight={700} mb={1}>
                      🏆 우승 팀
                    </Typography>
                    <Stack spacing={1}>
                      {gameResult.winners.map(
                        ({ horse, playerNames }, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              px: 2,
                              py: 1,
                              borderRadius: 2,
                              border: '1px solid rgba(16,185,129,0.25)',
                              backgroundColor: 'rgba(16,185,129,0.12)',
                            }}
                          >
                            <Typography fontWeight={700}>{horse}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {playerNames.join(', ')}
                            </Typography>
                          </Box>
                        )
                      )}
                    </Stack>
                  </Box>
                )}

                {/* 결승선 통과 말들 (꼴등) */}
                {gameResult.losers.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} mb={1}>
                      🧲 결승선 통과(꼴등)
                    </Typography>
                    <Stack spacing={1}>
                      {gameResult.losers.map(
                        ({ horse, playerNames }, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              px: 2,
                              py: 1,
                              borderRadius: 2,
                              border: '1px solid rgba(239,68,68,0.25)',
                              backgroundColor: 'rgba(239,68,68,0.08)',
                            }}
                          >
                            <Typography fontWeight={700}>{horse}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {playerNames.join(', ')}
                            </Typography>
                          </Box>
                        )
                      )}
                    </Stack>
                  </Box>
                )}
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center' }}
              >
                다음 판은 대화로 정보가 모이는 순간이 승부처예요.
              </Typography>

              {/* 닫기 버튼 */}
              <Button
                variant="contained"
                onClick={() => setIsOpen(false)}
                size="large"
                sx={{
                  mt: 1,
                  width: '100%',
                  height: 44,
                  borderRadius: 999,
                  fontWeight: 700,
                  textTransform: 'none',
                  backgroundColor: isMyHorseWinner
                    ? 'success.main'
                    : 'primary.main',
                  boxShadow: isMyHorseWinner
                    ? '0 10px 24px rgba(16,185,129,0.35)'
                    : '0 10px 24px rgba(37,99,235,0.35)',
                }}
              >
                다음 판 준비하기
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Fade>
    </Modal>
  );
}
