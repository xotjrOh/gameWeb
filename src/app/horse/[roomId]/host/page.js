'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  Badge,
  Typography,
} from '@mui/material';
import BettingTab from './Horse.BettingTab';
import VoteTab from './Horse.VoteTab';
import ChipsTab from './Horse.ChipsTab';
import HorsesTab from '@/components/horse/HorsesTab';
import MyStatusButton from '@/components/horse/MyStatusButton';
import TimerDisplay from '@/components/TimerDisplay';
import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import { useSocket } from '@/components/provider/SocketProvider';
import { useSession } from 'next-auth/react';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useHorseGameData from '@/hooks/useHorseGameData';
import RoundResultModal from '@/components/horse/RoundResultModal';
import GameEndModal from '@/components/horse/GameEndModal';
import useCheckVersion from '@/hooks/useCheckVersion';
import TabPanel from '@/components/horse/TabPanel';
import Image from 'next/image';

export default function HorseGamePage({ params }) {
  const dispatch = useDispatch();
  const { roomId } = params;
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState(0);
  const { data: session } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redux 상태에서 statusInfo 가져오기
  const { statusInfo } = useSelector((state) => state.horse.gameData);
  const { rooms } = useSelector((state) => state.room);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useCheckVersion(socket);
  useRedirectIfNotHost(roomId);
  useUpdateSocketId(socket, session, roomId);
  useHorseGameData(roomId, socket, session?.user?.id);
  // useLeaveRoom(socket, dispatch);

  // 탭 정보 배열 정의
  const tabs = [
    { label: '베팅', showIcon: statusInfo && !statusInfo.isBetLocked },
    { label: '예측', showIcon: statusInfo && !statusInfo.isVoteLocked },
    { label: '칩 개수' },
    { label: '경주마' },
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
              src="/images/horseLogo.webp"
              alt="경마게임 로고"
              width={isMobile ? 48 : 56}
              height={isMobile ? 48 : 56}
              priority
              style={{ maxHeight: '100%', height: 'auto' }}
            />
          </Box>
          <Box sx={{ flexGrow: 1, display: 'flex',  justifyContent:"center" }}>
            <Typography variant="body1">
              {rooms?.[roomId]?.players?.length}명
            </Typography>
          </Box>
          {/* 아이콘 우측 배치 */}

          <TimerDisplay roomId={roomId} socket={socket} dispatch={dispatch} />
          <MyStatusButton roomId={roomId} socket={socket} session={session} />
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
            <BettingTab roomId={roomId} socket={socket} session={session} />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <VoteTab roomId={roomId} socket={socket} session={session} />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <ChipsTab roomId={roomId} socket={socket} session={session} />
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            <HorsesTab roomId={roomId} socket={socket} session={session} />
          </TabPanel>
        </Box>
      </Box>

      <RoundResultModal roomId={roomId} socket={socket} />
      <GameEndModal roomId={roomId} socket={socket} />
    </Box>
  );
}
