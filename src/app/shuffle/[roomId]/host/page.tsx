'use client';

import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import {
  Box,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
  Typography,
  Paper,
} from '@mui/material';
import VideoPlayerTab from '@/components/shuffle/VideoPlayerTab';
import ParticipantsTab from '@/components/shuffle/ParticipantsTab';

import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import { useSocket } from '@/components/provider/SocketProvider';
import { useSession } from 'next-auth/react';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useShuffleGameData from '@/hooks/useShuffleGameData';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import Image from 'next/image';

interface ShuffleGamePageProps {
  params: {
    roomId: string;
  };
}

export default function ShuffleGamePage({ params }: ShuffleGamePageProps) {
  const dispatch = useAppDispatch();
  const { roomId } = params;
  const { socket } = useSocket();
  const { data: session } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const sessionId = session?.user?.id ?? '';

  useCheckVersion(socket);
  useRedirectIfNotHost(roomId);
  useUpdateSocketId(socket, session, roomId);
  useShuffleGameData(roomId, socket, sessionId);
  useLeaveRoom(socket, dispatch);

  const didAutoResetRef = useRef(false);
  useEffect(() => {
    if (!socket || !session?.user?.id || didAutoResetRef.current) {
      return;
    }
    didAutoResetRef.current = true;
    socket.emit(
      'shuffle-reset-round',
      { roomId, sessionId: session.user.id },
      () => {}
    );
  }, [socket?.id, session?.user?.id, roomId]);

  useEffect(() => {
    if (!socket || !session?.user?.id) return;
    const intervalId = setInterval(() => {
      socket.emit(
        'shuffle-get-game-data',
        { roomId, sessionId: session.user.id },
        () => {}
      );
    }, 2000);
    return () => clearInterval(intervalId);
  }, [socket?.id, session?.user?.id, roomId]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #ebf4ff, #c3dafe)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ backgroundColor: 'transparent' }}
      >
        <Toolbar variant="dense">
          <Box display="flex" alignItems="center">
            <Image
              src="/images/shuffleLogo.webp"
              alt="뒤죽박죽 게임 로고"
              width={isMobile ? 48 : 56}
              height={isMobile ? 48 : 56}
              priority
              style={{ maxHeight: '100%', height: 'auto' }}
            />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            방장 화면
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          p: 2,
          display: { xs: 'block', md: 'grid' },
          gridTemplateColumns: { md: '2fr 1fr' },
          gap: 2,
        }}
      >
        <Box sx={{ minHeight: 0 }}>
          <VideoPlayerTab roomId={roomId} socket={socket} session={session} />
        </Box>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            height: 'fit-content',
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.9)',
          }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            참가자 목록
          </Typography>
          <ParticipantsTab roomId={roomId} socket={socket} session={session} />
        </Paper>
      </Box>
    </Box>
  );
}
