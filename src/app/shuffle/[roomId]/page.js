'use client';

import { useState } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import {
  Box,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  Badge,
} from '@mui/material';
import VideoPlayerTab from '@/components/shuffle/VideoPlayerTab';
import AnswerTab from '@/components/shuffle/AnswerTab';
import ParticipantsTab from '@/components/shuffle/ParticipantsTab';
import GameStatusButton from '@/components/shuffle/GameStatusButton';
import RoundResultModal from '@/components/shuffle/RoundResultModal';
import GameEndModal from '@/components/shuffle/GameEndModal';
import TabPanel from '@/components/shuffle/TabPanel';

import TimerDisplay from '@/components/TimerDisplay';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
import { useSocket } from '@/components/provider/SocketProvider';
import { useSession } from 'next-auth/react';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useShuffleGameData from '@/hooks/useShuffleGameData';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import Image from 'next/image';

export default function ShuffleGamePage({ params }) {
  const dispatch = useAppDispatch();
  const { roomId } = params;
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState(0);
  const { data: session } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redux 상태에서 statusInfo 가져오기
  const { statusInfo } = useAppSelector((state) => state.shuffle);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useCheckVersion(socket);
  useRedirectIfInvalidRoom(roomId);
  useUpdateSocketId(socket, session, roomId);
  useShuffleGameData(roomId, socket, session?.user?.id);
  useLeaveRoom(socket, dispatch);

  // 탭 정보 배열 정의
  const tabs = [
    { label: '영상 재생', showIcon: false },
    { label: '정답 제출', showIcon: statusInfo && !statusInfo.answerSubmitted },
    { label: '참가자 목록' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #ebf4ff, #c3dafe)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 상단 네비게이션 바 */}
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ backgroundColor: 'transparent' }}
      >
        <Toolbar variant="dense">
          {/* 로고 좌측 배치 */}
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
          {/* 아이콘 우측 배치 */}
          <TimerDisplay roomId={roomId} socket={socket} dispatch={dispatch} />
          <GameStatusButton roomId={roomId} socket={socket} session={session} />
        </Toolbar>
      </AppBar>

      {/* 탭 네비게이션과 컨텐츠 영역 */}
      <Box sx={{ flexGrow: 1 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          TabIndicatorProps={{ style: { display: 'none' } }}
          sx={{ minHeight: '48px' }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                tab.showIcon ? (
                  <Badge
                    variant="dot"
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        right: -6,
                        top: 3,
                        minWidth: 6,
                        height: 6,
                        borderRadius: '50%',
                      },
                    }}
                  >
                    {tab.label}
                  </Badge>
                ) : (
                  tab.label
                )
              }
              id={`tab-${index}`}
              aria-controls={`tabpanel-${index}`}
              sx={{
                minHeight: 'auto',
                py: 1,
                '&.Mui-selected': {
                  fontWeight: 'bold',
                  color: theme.palette.primary.main,
                },
              }}
            />
          ))}
        </Tabs>

        {/* 모든 탭 컨텐츠를 렌더링하고, 활성화된 탭만 보이도록 처리 */}
        <Box sx={{ p: 2 }}>
          <TabPanel value={activeTab} index={0}>
            <VideoPlayerTab roomId={roomId} socket={socket} session={session} />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <AnswerTab roomId={roomId} socket={socket} session={session} />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <ParticipantsTab
              roomId={roomId}
              socket={socket}
              session={session}
            />
          </TabPanel>
        </Box>
      </Box>

      <RoundResultModal roomId={roomId} socket={socket} />
      <GameEndModal roomId={roomId} socket={socket} />
    </Box>
  );
}
