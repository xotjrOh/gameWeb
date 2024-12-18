// 아직 만들어지지 않은 게임
// 'use client';

// import { useEffect, useState } from 'react';
// import { useAppSelector } from '@/hooks/useAppSelector';
// import Image from 'next/image';
// import {
//   Box,
//   Typography,
//   Modal,
//   Button,
//   Fade,
//   useMediaQuery,
//   useTheme,
// } from '@mui/material';
// import Confetti from 'react-confetti';
// import useWindowSize from 'react-use/lib/useWindowSize';
// import { ClientSocketType } from '@/types/socket';

// interface GameResult {
//   winners: string[];
//   losers: string[];
// }

// interface GameEndModalProps {
//   socket: ClientSocketType | null;
//   roomId: string;
// }

// export default function GameEndModal({ socket, roomId }: GameEndModalProps) {
//   const [isOpen, setIsOpen] = useState<boolean>(false);
//   const [gameResult, setGameResult] = useState<GameResult | null>(null);
//   const { statusInfo } = useAppSelector((state) => state.shuffle); // 내 말 정보를 가져옴
//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
//   const { width, height } = useWindowSize();

//   useEffect(() => {
//     if (socket) {
//       const handleGameEnd = ({ winners, losers }: GameResult) => {
//         setGameResult({ winners, losers });
//         setIsOpen(true); // 게임이 끝났을 때 모달을 엶
//       };

//       // socket.on('game-ended', handleGameEnd);

//       return () => {
//         // socket.off('game-ended', handleGameEnd);
//       };
//     }
//   }, [socket]);

//   if (!isOpen || !gameResult) return null;

//   // const isMyHorseWinner = gameResult.winners.some(
//   //   (winner) => winner.horse === statusInfo.horse
//   // );

//   return (
//     <Modal
//       open={isOpen}
//       onClose={() => setIsOpen(false)}
//       aria-labelledby="game-end-modal-title"
//       closeAfterTransition
//     >
//       <Fade in={isOpen}>
//         <Box
//           sx={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             width: '100%',
//             height: '100%',
//             bgcolor: isMyHorseWinner ? 'success.main' : 'grey.900',
//             color: isMyHorseWinner ? 'common.white' : 'grey.300',
//             display: 'flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             justifyContent: 'center',
//             p: 2,
//             textAlign: 'center',
//           }}
//         >
//           {/* 승리 시 콘페티 효과 */}
//           {isMyHorseWinner && (
//             <Confetti
//               width={width}
//               height={height}
//               numberOfPieces={200}
//               recycle={false}
//             />
//           )}

//           {/* 승리/패배 이미지 */}
//           <Box sx={{ mb: 4 }}>
//             <Image
//               src={
//                 isMyHorseWinner
//                   ? '/images/victory.webp' // 승리 이미지 경로
//                   : '/images/defeat.webp' // 패배 이미지 경로
//               }
//               alt={isMyHorseWinner ? '승리' : '패배'}
//               width={isMobile ? 150 : 200}
//               height={isMobile ? 150 : 200}
//             />
//           </Box>

//           {/* 승리/패배 메시지 */}
//           <Typography
//             id="game-end-modal-title"
//             variant={isMobile ? 'h4' : 'h3'}
//             component="h2"
//             fontWeight="bold"
//             mb={2}
//           >
//             {isMyHorseWinner ? '🎉 승리했습니다! 🎉' : '😢 패배했습니다... 😢'}
//           </Typography>

//           {/* 내 말 정보 */}
//           <Typography variant="h5" mb={4}>
//             내 말: {statusInfo.horse}
//           </Typography>

//           {/* 우승한 말들 */}
//           {gameResult.winners.length > 0 && (
//             <Box mb={2}>
//               <Typography
//                 variant="h6"
//                 fontWeight="bold"
//                 mb={1}
//                 color={isMyHorseWinner ? 'yellow' : 'error.main'}
//               >
//                 우승한 말
//               </Typography>
//               {gameResult.winners.map(({ horse, playerNames }, index) => (
//                 <Typography key={index} variant="subtitle1">
//                   {horse} ({playerNames.join(', ')})
//                 </Typography>
//               ))}
//             </Box>
//           )}

//           {/* 패배한 말들 */}
//           {gameResult.losers.length > 0 && (
//             <Box mb={4}>
//               <Typography
//                 variant="h6"
//                 fontWeight="bold"
//                 mb={1}
//                 color="grey.500"
//               >
//                 패배한 말
//               </Typography>
//               {gameResult.losers.map(({ horse, playerNames }, index) => (
//                 <Typography key={index} variant="subtitle1">
//                   {horse} ({playerNames.join(', ')})
//                 </Typography>
//               ))}
//             </Box>
//           )}

//           {/* 닫기 버튼 */}
//           <Button
//             variant="contained"
//             color={isMyHorseWinner ? 'secondary' : 'primary'}
//             onClick={() => setIsOpen(false)}
//             size="large"
//             sx={{
//               mt: 2,
//               bgcolor: isMyHorseWinner ? 'secondary.main' : 'primary.main',
//             }}
//           >
//             닫기
//           </Button>
//         </Box>
//       </Fade>
//     </Modal>
//   );
// }
