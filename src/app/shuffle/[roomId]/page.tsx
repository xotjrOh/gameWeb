'use client';

import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import {
  Box,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
  Typography,
} from '@mui/material';
import AnswerTab from '@/components/shuffle/AnswerTab';

import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
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
  useRedirectIfInvalidRoom(roomId);
  useUpdateSocketId(socket, session, roomId);
  useShuffleGameData(roomId, socket, sessionId);
  useLeaveRoom(socket, dispatch);

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
            정답 제출
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, p: 2 }}>
        <AnswerTab roomId={roomId} socket={socket} session={session} />
      </Box>
    </Box>
  );
}
