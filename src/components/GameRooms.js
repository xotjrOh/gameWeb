'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { setIsLoading } from '@/store/loadingSlice';
import { useSocket } from '@/components/provider/SocketProvider';
import { 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Stack, 
  Avatar, 
  Tooltip, 
  Grid2 as Grid
} from '@mui/material';
import RoomModal from '@/components/RoomModal';
import NicknameModal from '@/components/NicknameModal';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLoadingReset from '@/hooks/useLoadingReset';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import PeopleIcon from '@mui/icons-material/People'; // 사람 아이콘

const gameTypeMap = {
  horse: '🏇 경마게임',
  shuffle: '🔀 뒤죽박죽',
};

export default function GameRooms({ session }) {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const { rooms } = useSelector((state) => state.room);
  const { enqueueSnackbar } = useCustomSnackbar();

  useCheckVersion(socket);
  useLoadingReset(socket, dispatch);

  const closeModal = () => {
    // socket.disconnect();
    // socket.connect();
    setShowModal(false);
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setShowNicknameModal(true);
  };

  const handleNicknameSubmit = (nickname) => {
    setShowNicknameModal(false);
    if (selectedRoom) {
      joinRoom(selectedRoom.roomId, selectedRoom.gameType, nickname);
    }
  };

  const joinRoom = (roomId, gameType, nickname) => {
    if (!socket || !socket.connected) {
      return enqueueSnackbar('서버와 연결이 되어 있지 않습니다. 잠시 후 다시 시도해주세요.', { variant: 'error' });
    }

    dispatch(setIsLoading(true));
    socket?.emit(
      'join-room',
      { roomId, userName: nickname, sessionId: session.user.id },
      (response) => {
        if (!response.success) {
          enqueueSnackbar(response.message, { variant: 'error' });
        } else {
          if (response.host) router.replace(`/${gameType}/${roomId}/host`);
          else router.replace(`/${gameType}/${roomId}`);
        }
        dispatch(setIsLoading(false));
      }
    );
  };

  const waitingRooms = Object.values(rooms).filter((room) => room.status === '대기중');
  const playingRooms = Object.values(rooms).filter((room) => room.status === '게임중');

  // 게임 타입에 따른 아이콘 매핑
  const gameTypeIconMap = {
    horse: '🐎', // 말 이모지
    shuffle: '🔀', // 뒤죽박죽 이모지
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexGrow: 1, // 남은 공간을 채움
        p: 4,
        bgcolor: 'background.default',
        minHeight: '0', // 100vh 제거
      }}
    >
      <Typography variant="h4" component="h1" color="primary" sx={{ fontWeight: 'bold', mb: 4 }}>
        🎮 게임 대기실
      </Typography>

      {/* 방 만들기 버튼 */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => setShowModal(true)}
        sx={{
          mb: 4,
          px: 4,
          py: 2,
          borderRadius: '50px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.3s',
          '&:hover': {
            transform: 'scale(1.05)',
            bgcolor: 'primary.dark',
          },
        }}
      >
        방 만들기
      </Button>

      {/* 방 목록 */}
      <Box sx={{ width: '100%', maxWidth: '1000px' }}>
        {Object.values(rooms).length === 0 ? (
          <Typography variant="body1" color="textSecondary" align="center">
            현재 생성된 방이 없습니다.
          </Typography>
        ) : (
          <>
            {/* 대기 중인 방들 */}
            {waitingRooms.map((room) => (
              <Card
                key={room.roomId}
                onClick={() => handleRoomClick(room)}
                sx={{
                  p: 2,
                  mb: 4,
                  width: '100%',
                  cursor: 'pointer',
                  boxShadow: 3,
                  bgcolor: '#e3f2fd',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-5px)',
                    bgcolor: '#bbdefb',
                  },
                  transition: 'all 0.3s ease-in-out',
                  borderRadius: '12px',
                }}
              >
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    {/* 좌측 정보 */}
                    <Grid size={{ xs: 12, sm: 8, md: 9 }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {gameTypeIconMap[room.gameType]}
                        </Avatar>
                        <Tooltip title={room.roomName} arrow>
                          <Typography
                            variant="h6"
                            color="textPrimary"
                            sx={{
                              fontWeight: 'bold',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: { xs: '100%', sm: '300px' },
                            }}
                          >
                            {room.roomName}
                          </Typography>
                        </Tooltip>
                      </Stack>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        {gameTypeMap[room.gameType]}
                      </Typography>
                    </Grid>

                    {/* 우측 상태 및 인원수 */}
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                      <Stack direction="column" alignItems="flex-end">
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                          <PeopleIcon fontSize="small" />
                          <Typography variant="body2" color="secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {room.players.length} / {room.maxPlayers} 명
                          </Typography>
                        </Stack>
                        <Typography
                          sx={{
                            px: 2,
                            py: 1,
                            borderRadius: '8px',
                            bgcolor: room.status === '대기중' ? 'info.main' : 'error.main',
                            color: 'white',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            maxWidth: '100px',
                          }}
                        >
                          {room.status}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            {/* 진행 중인 방들 */}
            {playingRooms.map((room) => (
              <Card
                key={room.roomId}
                onClick={() => handleRoomClick(room)}
                sx={{
                  p: 2,
                  mb: 4,
                  width: '100%',
                  cursor: 'pointer',
                  boxShadow: 3,
                  bgcolor: '#ffebee', // 진행 중인 방은 연한 빨간색 배경
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-5px)',
                    bgcolor: '#ffcdd2', // 호버 시 더 진한 빨간색 배경
                  },
                  transition: 'all 0.3s ease-in-out',
                  borderRadius: '12px',
                }}
              >
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    {/* 좌측 정보 */}
                    <Grid size={{ xs: 12, sm: 8, md: 9 }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'error.main' }}>
                          {gameTypeIconMap[room.gameType]}
                        </Avatar>
                        <Tooltip title={room.roomName} arrow>
                          <Typography
                            variant="h6"
                            color="textPrimary"
                            sx={{
                              fontWeight: 'bold',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: { xs: '100%', sm: '300px' },
                            }}
                          >
                            {room.roomName}
                          </Typography>
                        </Tooltip>
                      </Stack>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        {gameTypeMap[room.gameType]}
                      </Typography>
                    </Grid>

                    {/* 우측 상태 및 인원수 */}
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                      <Stack direction="column" alignItems="flex-end">
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                          <PeopleIcon fontSize="small" />
                          <Typography variant="body2" color="secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {room.players.length} / {room.maxPlayers} 명
                          </Typography>
                        </Stack>
                        <Typography
                          sx={{
                            px: 2,
                            py: 1,
                            borderRadius: '8px',
                            bgcolor: room.status === '대기중' ? 'info.main' : 'error.main',
                            color: 'white',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            maxWidth: '100px',
                          }}
                        >
                          {room.status}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </Box>

      {showModal && (
        <RoomModal
          closeModal={closeModal}
          socket={socket}
          router={router}
          dispatch={dispatch}
          session={session}
        />
      )}

      {/* 닉네임 입력 모달 */}
      {showNicknameModal && (
        <NicknameModal
          isOpen={showNicknameModal}
          onClose={() => setShowNicknameModal(false)}
          onSubmit={handleNicknameSubmit}
        />
      )}
    </Box>
  );
}
