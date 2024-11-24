// 미완성 게임이라 주석
// 'use client';

// import { useEffect, useState } from 'react';
// import useRaceEnd from '@/hooks/useRaceEnd';
// import { useAppSelector } from '@/hooks/useAppSelector';
// import {
//   Box,
//   Typography,
//   Modal,
//   Button,
//   Paper,
//   Stack,
//   useMediaQuery,
//   useTheme,
// } from '@mui/material';
// import { keyframes } from '@mui/system';
// import { ClientSocketType } from '@/types/socket';

// // @log(results, hasRaceEnded, statusInfo, positions)
// export default function RoundResultModal({ socket, roomId }) {
//   const [isOpen, setIsOpen] = useState<boolean>(false);
//   const [results, setResults] = useState([]);
//   const { hasRaceEnded } = useRaceEnd();
//   const { statusInfo } = useAppSelector((state) => state.horse);
//   const { positions } = useAppSelector((state) => state.horse.gameData);
//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

//   useEffect(() => {
//     if (socket) {
//       const setRoundResultAfterRoundEnd = ({ roundResult }) => {
//         if (!hasRaceEnded) {
//           setResults(roundResult);
//           setIsOpen(true);
//         }
//       };

//       socket.on('round-ended', setRoundResultAfterRoundEnd);

//       return () => {
//         socket.off('round-ended', setRoundResultAfterRoundEnd);
//       };
//     }
//   }, [socket, hasRaceEnded]);

//   if (!isOpen) return null;

//   const getPlayerSuccess = (horse) => {
//     const lastBet =
//       statusInfo?.voteHistory?.[statusInfo.voteHistory.length - 1] || 'X'; // host는 X라고 기본값 사용
//     return (
//       lastBet === horse &&
//       results.find((result) => result.horse === horse && result.progress === 2)
//     );
//   };

//   // 말 움직임 애니메이션 정의
//   const moveHorseFast = keyframes`
//     0% { left: 0%; }
//     100% { left: 90%; }
//   `;

//   const moveHorseSlow = keyframes`
//     0% { left: 0%; }
//     100% { left: 45%; }
//   `;

//   return (
//     <Modal
//       open={isOpen}
//       onClose={() => setIsOpen(false)}
//       aria-labelledby="round-result-modal-title"
//       aria-describedby="round-result-modal-description"
//     >
//       <Box
//         sx={{
//           position: 'absolute',
//           top: '50%',
//           left: '50%',
//           transform: 'translate(-50%, -50%)',
//           width: isMobile ? '90%' : 480,
//           bgcolor: 'background.paper',
//           borderRadius: 2,
//           boxShadow: 24,
//           p: { xs: 4, md: 6 },
//         }}
//       >
//         <Typography
//           id="round-result-modal-title"
//           variant="h5"
//           component="h2"
//           fontWeight="bold"
//           color="primary"
//           mb={4}
//           textAlign="center"
//         >
//           라운드 결과
//         </Typography>
//         <Stack spacing={4}>
//           {results
//             .filter(({ progress }) => progress !== 0)
//             .map(({ horse, progress }, index) => {
//               const isSuccess = getPlayerSuccess(horse);
//               const horsePosition =
//                 positions.find((pos) => pos.name === horse)?.position || 0;

//               return (
//                 <Paper
//                   key={index}
//                   elevation={1}
//                   sx={{
//                     display: 'flex',
//                     flexDirection: 'column',
//                     alignItems: 'center',
//                     p: { xs: 2, md: 3 },
//                     borderRadius: 2,
//                     boxShadow: 2,
//                     border: 1,
//                     borderColor: isSuccess ? 'border.success' : 'grey.300',
//                     backgroundColor: isSuccess
//                       ? 'background.success'
//                       : 'background.paper',
//                   }}
//                 >
//                   <Typography
//                     variant="h6"
//                     fontWeight="bold"
//                     color={isSuccess ? 'success.dark' : 'text.primary'}
//                     sx={{ textAlign: 'center' }}
//                   >
//                     {horse} {`(${horsePosition - progress} → ${horsePosition})`}{' '}
//                     {isSuccess ? '🎉' : ''}
//                   </Typography>
//                   {/* 트랙 */}
//                   <Box
//                     sx={{
//                       position: 'relative',
//                       width: '100%',
//                       height: 40,
//                       border: 1,
//                       borderColor: 'border.success',
//                       borderRadius: '20px', // 끝부분을 더 둥글게 변경
//                       overflow: 'hidden',
//                       my: 2,
//                       backgroundImage: 'url(/images/grass.webp)', // 트랙 배경 이미지
//                       backgroundSize: 'cover',
//                       backgroundPosition: 'center',
//                     }}
//                   >
//                     {/* 말 아이콘 */}
//                     <Box
//                       sx={{
//                         position: 'absolute',
//                         top: 0,
//                         left: 0,
//                         fontSize: '1.5rem', // 말 크기 축소
//                         zIndex: 1,
//                         transform: 'scaleX(-1)',
//                         animation: `${
//                           progress === 2 ? moveHorseFast : moveHorseSlow
//                         } 1s linear forwards`, // 애니메이션 시간 및 forwards 추가
//                       }}
//                     >
//                       🏇
//                     </Box>
//                   </Box>
//                   {/* 트랙 칸 표시 */}
//                   <Box
//                     sx={{
//                       display: 'flex',
//                       justifyContent: 'space-between',
//                       width: '100%',
//                       px: 2,
//                       mt: 1,
//                     }}
//                   >
//                     <Typography variant="body2" color="textSecondary">
//                       {horsePosition - progress}칸
//                     </Typography>
//                     <Typography variant="body2" color="textSecondary">
//                       {horsePosition - progress + 1}칸
//                     </Typography>
//                     <Typography variant="body2" color="textSecondary">
//                       {horsePosition - progress + 2}칸
//                     </Typography>
//                   </Box>
//                   {isSuccess && (
//                     <Typography
//                       variant="body1"
//                       color="success.dark"
//                       fontWeight="bold"
//                       mt={2}
//                     >
//                       축하합니다! 예측에 성공했습니다!
//                     </Typography>
//                   )}
//                 </Paper>
//               );
//             })}
//           {results.length === 0 && (
//             <Box textAlign="center" py={{ xs: 4, md: 6 }}>
//               <Typography variant="h6" fontWeight="bold" color="error" mb={4}>
//                 😢 아무도 베팅하지 않았습니다 😢
//               </Typography>
//               <Typography variant="body1" color="textSecondary">
//                 다음 라운드에는 꼭 베팅하세요!
//               </Typography>
//             </Box>
//           )}
//         </Stack>
//         <Button
//           onClick={() => setIsOpen(false)}
//           variant="contained"
//           color="primary"
//           fullWidth
//           sx={{ mt: 4 }}
//         >
//           닫기
//         </Button>
//       </Box>
//     </Modal>
//   );
// }
