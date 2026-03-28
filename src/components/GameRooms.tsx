'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
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
  Grid2 as Grid,
} from '@mui/material';
import RoomModal from '@/components/RoomModal';
import NicknameModal from '@/components/NicknameModal';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLoadingReset from '@/hooks/useLoadingReset';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import PeopleIcon from '@mui/icons-material/People'; // 사람 아이콘
import AddIcon from '@mui/icons-material/Add';
import { Session } from 'next-auth';
import { GameType, Room } from '@/types/room';
import { CommonResponse } from '@/types/socket';

interface GameRoomsProps {
  session: Session | null;
}

const gameTypeMap: Record<GameType, string> = {
  horse: '🏇 경마게임',
  shuffle: '🔀 뒤죽박죽',
  animal: '🦁 동물 능력전',
  jamo: '🔤 단어게임',
  murder_mystery: '🕵️ 머더미스터리',
};

const DEBUG = process.env.NEXT_PUBLIC_SOCKET_DEBUG === '1';
const SOCKET_ACK_DEBUG = process.env.NEXT_PUBLIC_SOCKET_ACK_DEBUG === '1';

// 배포후 작동여부 테스트용
// @log(rooms)
export default function GameRooms({ session }: GameRoomsProps) {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showNicknameModal, setShowNicknameModal] = useState<boolean>(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const { rooms } = useAppSelector((state) => state.room);
  const { enqueueSnackbar } = useCustomSnackbar();

  useCheckVersion(socket);
  useLoadingReset(socket, dispatch);

  const closeModal = () => {
    // socket.disconnect();
    // socket.connect();
    setShowModal(false);
  };

  const handleRoomClick = (room: Room) => {
    if (!socket || !socket.connected) {
      return enqueueSnackbar(
        '서버와 연결이 되어 있지 않습니다. 잠시 후 다시 시도해주세요.',
        { variant: 'error' }
      );
    }
    if (!session) {
      // socket 미연결
      enqueueSnackbar('로그인이 확인되지 않습니다.', {
        variant: 'error',
      });
      return;
    }
    // 서버에 방 참여 가능 여부를 확인
    socket.emit(
      'check-can-join-room',
      { roomId: room.roomId, sessionId: session.user.id },
      (response) => {
        if (!response.success) {
          return enqueueSnackbar(response.message, { variant: 'error' });
        }
        // 정상 처리
        if (!response.reEnter) {
          setSelectedRoom(room);
          setShowNicknameModal(true);
          return;
        }
        // 이미 접속중인 경우
        if (response.host)
          router.replace(`/${room.gameType}/${room.roomId}/host`);
        else router.replace(`/${room.gameType}/${room.roomId}`);
      }
    );
  };

  const handleNicknameSubmit = (nickname: string) => {
    setShowNicknameModal(false);
    if (selectedRoom) {
      joinRoom(selectedRoom.roomId, selectedRoom.gameType, nickname);
    }
  };

  // 새로 접속하는 경우에만 호출
  const joinRoom = (roomId: string, gameType: GameType, nickname: string) => {
    if (!socket || !socket.connected) {
      return enqueueSnackbar(
        '서버와 연결이 되어 있지 않습니다. 잠시 후 다시 시도해주세요.',
        { variant: 'error' }
      );
    }
    if (!session) {
      // socket 미연결
      enqueueSnackbar('로그인이 확인되지 않습니다.', {
        variant: 'error',
      });
      return;
    }

    dispatch(setIsLoading(true));
    const joinStartedAt = DEBUG ? Date.now() : 0;
    if (DEBUG) {
      console.log(
        `[socket-debug][client] join-room start roomId=${roomId} socketId=${socket.id}`
      );
    }
    let pendingLogTimer: ReturnType<typeof setTimeout> | null = null;
    if (DEBUG) {
      pendingLogTimer = setTimeout(() => {
        console.log(
          `[socket-debug][client] join-room pending roomId=${roomId} dt=${
            Date.now() - joinStartedAt
          }ms`
        );
      }, 3000);
    }

    const payload = {
      roomId,
      userName: nickname,
      sessionId: session.user.id,
    };

    const emitJoinRoom = (
      ack: (timeoutErr: Error | null, response?: CommonResponse) => void
    ) => {
      if (SOCKET_ACK_DEBUG) {
        socket
          .timeout(3000)
          .emit('join-room', payload, (timeoutErr, response) => {
            ack(timeoutErr ?? null, response);
          });
        return;
      }
      socket.emit('join-room', payload, (response) => {
        ack(null, response);
      });
    };

    emitJoinRoom((timeoutErr, response) => {
      if (pendingLogTimer) {
        clearTimeout(pendingLogTimer);
      }
      dispatch(setIsLoading(false));

      if (DEBUG || SOCKET_ACK_DEBUG) {
        console.log(
          `[socket-debug][client] join-room ack err=${Boolean(
            timeoutErr
          )} success=${response?.success ?? false} dt=${
            joinStartedAt ? Date.now() - joinStartedAt : 0
          }ms msg=${response?.message ?? ''}`
        );
      }

      if (timeoutErr) {
        enqueueSnackbar(
          '서버 응답이 지연되었습니다. 잠시 후 다시 시도해주세요.',
          { variant: 'error' }
        );
        return;
      }

      if (!response || !response.success) {
        return enqueueSnackbar(response?.message ?? '입장에 실패했습니다.', {
          variant: 'error',
        });
      }

      router.replace(`/${gameType}/${roomId}`);
    });
  };

  const waitingRooms = Object.values(rooms).filter(
    (room) => room.status === '대기중'
  );
  const playingRooms = Object.values(rooms).filter(
    (room) => room.status === '게임중'
  );

  // 게임 타입에 따른 아이콘 매핑
  const gameTypeIconMap: Record<GameType, string> = {
    horse: '🐎', // 말 이모지
    shuffle: '🔀', // 뒤죽박죽 이모지
    animal: '🦁', // 동물 능력전 이모지
    jamo: '🔤', // 자모 게임 이모지
    murder_mystery: '🕵️',
  };

  const getRoomGameTypeLabel = (room: Room) => {
    if (room.gameType !== 'murder_mystery') {
      return gameTypeMap[room.gameType];
    }
    const scenarioLabel =
      room.gameData.scenarioRoomDisplayName || '머더미스터리 시나리오';
    return `${gameTypeMap.murder_mystery} · ${scenarioLabel}`;
  };

  const getMurderMysteryCapacityRuleLabel = (room: Room) => {
    if (room.gameType !== 'murder_mystery') {
      return null;
    }
    return room.gameData.hostParticipatesAsPlayer
      ? '정원 기준: 방장 포함'
      : '정원 기준: 방장 제외';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 4,
        bgcolor: 'background.default',
        minHeight: '0', // 100vh 제거
      }}
    >
      {/* 대기방 텍스트와 아이콘 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
          paddingLeft: '16px', // 좌상단 배치
          marginBottom: '16px', // 적당한 여백
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            fontFamily: '"yeogieottae", sans-serif',
            color: '#333333', // 귀여운 느낌의 파스텔 색상
          }}
        >
          대기방
        </Typography>
      </Box>

      {/* 방 만들기 버튼 */}
      <Button
        variant="contained"
        color="secondary"
        onClick={() => setShowModal(true)}
        size="large"
        startIcon={<AddIcon />} // 아이콘 추가
        sx={{
          borderRadius: '50px',
          padding: '1rem 2rem',
          backgroundColor: '#6c5ce7', // 깔끔한 색상
          boxShadow: '0px 10px 30px rgba(108, 92, 231, 0.3)', // 3D 효과
          '&:hover': {
            backgroundColor: '#5a4bdb',
            boxShadow: '0px 15px 40px rgba(108, 92, 231, 0.5)', // Hover 시 강조
          },
          position: 'fixed',
          bottom: '2rem', // 화면 하단에 고정
          right: '2rem',
        }}
      >
        방 만들기
      </Button>

      {/* 방 목록 */}
      <Box sx={{ width: '100%' }}>
        {Object.values(rooms).length === 0 ? (
          <Typography variant="body1" color="textSecondary" sx={{ ml: 2 }}>
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
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mt: 1 }}
                      >
                        {getRoomGameTypeLabel(room)}
                      </Typography>
                      {room.gameType === 'murder_mystery' ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.3 }}
                        >
                          {getMurderMysteryCapacityRuleLabel(room)}
                        </Typography>
                      ) : null}
                    </Grid>

                    {/* 우측 상태 및 인원수 */}
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                      <Stack direction="column" alignItems="flex-end">
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                          sx={{ mb: 1 }}
                        >
                          <PeopleIcon fontSize="small" />
                          <Typography
                            variant="body2"
                            color="secondary"
                            sx={{ whiteSpace: 'nowrap', pr: '6px' }}
                          >
                            {room.players.length} / {room.maxPlayers}
                            {room.gameType === 'murder_mystery'
                              ? ` (${room.gameData.hostParticipatesAsPlayer ? '포함' : '제외'})`
                              : ''}
                          </Typography>
                        </Stack>
                        <Typography
                          sx={{
                            px: 2,
                            py: 1,
                            borderRadius: '8px',
                            bgcolor:
                              room.status === '대기중'
                                ? 'info.main'
                                : 'error.main',
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
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ mt: 1 }}
                      >
                        {getRoomGameTypeLabel(room)}
                      </Typography>
                      {room.gameType === 'murder_mystery' ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.3 }}
                        >
                          {getMurderMysteryCapacityRuleLabel(room)}
                        </Typography>
                      ) : null}
                    </Grid>

                    {/* 우측 상태 및 인원수 */}
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                      <Stack direction="column" alignItems="flex-end">
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                          sx={{ mb: 1 }}
                        >
                          <PeopleIcon fontSize="small" />
                          <Typography
                            variant="body2"
                            color="secondary"
                            sx={{ whiteSpace: 'nowrap' }}
                          >
                            {room.players.length} / {room.maxPlayers} 명
                            {room.gameType === 'murder_mystery'
                              ? ` (${room.gameData.hostParticipatesAsPlayer ? '포함' : '제외'})`
                              : ''}
                          </Typography>
                        </Stack>
                        <Typography
                          sx={{
                            px: 2,
                            py: 1,
                            borderRadius: '8px',
                            bgcolor:
                              room.status === '대기중'
                                ? 'info.main'
                                : 'error.main',
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
