'use client';

import { useState, SyntheticEvent } from 'react';
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
  Paper,
  Chip,
} from '@mui/material';
import BettingTab from './Horse.BettingTab';
import VoteTab from './Horse.VoteTab';
import ChipsTab from './Horse.ChipsTab';
import HorsesTab from '@/components/horse/HorsesTab';
import MyStatusButton from '@/components/horse/MyStatusButton';
import TimerDisplay from '@/components/TimerDisplay';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
import { useSocket } from '@/components/provider/SocketProvider';
import { useSession } from 'next-auth/react';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useHorseGameData from '@/hooks/useHorseGameData';
import RoundResultModal from '@/components/horse/RoundResultModal';
import GameEndModal from '@/components/horse/GameEndModal';
import useCheckVersion from '@/hooks/useCheckVersion';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import TabPanel from '@/components/horse/TabPanel';
import Image from 'next/image';

interface HorseGamePageProps {
  params: {
    roomId: string;
  };
}

export default function HorseGamePage({ params }: HorseGamePageProps) {
  const dispatch = useAppDispatch();
  const { roomId } = params;
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<number>(0);
  const { data: session } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const sessionId = session?.user?.id ?? '';
  // Redux 상태에서 statusInfo 가져오기
  const { statusInfo } = useAppSelector((state) => state.horse);

  const handleTabChange = (event: SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  useCheckVersion(socket);
  useRedirectIfInvalidRoom(roomId);
  useUpdateSocketId(socket, session, roomId);
  useHorseGameData(roomId, socket, sessionId);
  useLeaveRoom(socket, dispatch);

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
        backgroundImage:
          'radial-gradient(1200px 400px at 0% -10%, rgba(59,130,246,0.18), transparent 60%), radial-gradient(800px 400px at 100% -20%, rgba(16,185,129,0.12), transparent 60%), linear-gradient(180deg, #eef5ff 0%, #dbeafe 45%, #c7d2fe 100%)',
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
        <Toolbar
          variant="dense"
          sx={{
            px: { xs: 1.5, md: 3 },
            py: 1,
          }}
        >
          {/* 로고 좌측 배치 */}
          <Box display="flex" alignItems="center" gap={1.5}>
            <Image
              src="/images/horseLogo.webp"
              alt="경마게임 로고"
              width={isMobile ? 48 : 56}
              height={isMobile ? 48 : 56}
              priority
              style={{ maxHeight: '100%', height: 'auto' }}
            />
            <Chip
              size="small"
              label={`ROOM ${roomId}`}
              sx={{
                borderRadius: 999,
                fontWeight: 600,
                backgroundColor: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(15,23,42,0.12)',
              }}
            />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {/* 아이콘 우측 배치 */}
          <Box
            sx={{
              px: 1.2,
              py: 0.25,
              borderRadius: 999,
              backgroundColor: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.2)',
              display: 'flex',
              alignItems: 'center',
              mr: 1,
            }}
          >
            <TimerDisplay roomId={roomId} socket={socket} dispatch={dispatch} />
          </Box>
          <MyStatusButton roomId={roomId} socket={socket} session={session} />
        </Toolbar>
      </AppBar>

      {/* 탭 네비게이션과 컨텐츠 영역 */}
      <Box sx={{ flexGrow: 1, px: { xs: 1.5, md: 3 }, pb: 3 }}>
        <Paper
          elevation={0}
          sx={{
            mt: 1,
            p: 0.5,
            borderRadius: 999,
            border: '1px solid rgba(15,23,42,0.08)',
            backgroundColor: 'rgba(255,255,255,0.75)',
            boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            TabIndicatorProps={{ style: { display: 'none' } }}
            sx={{
              minHeight: '44px',
              '& .MuiTabs-flexContainer': {
                gap: 1,
              },
              '& .MuiTab-root': {
                minHeight: '40px',
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 600,
                color: 'text.secondary',
                backgroundColor: 'rgba(15,23,42,0.04)',
                border: '1px solid transparent',
              },
              '& .MuiTab-root.Mui-selected': {
                color: theme.palette.primary.main,
                backgroundColor: 'common.white',
                borderColor: 'rgba(15,23,42,0.08)',
                boxShadow: '0 6px 16px rgba(15,23,42,0.12)',
              },
            }}
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
              />
            ))}
          </Tabs>
        </Paper>

        {/* 모든 탭 컨텐츠를 렌더링하고, 활성화된 탭만 보이도록 처리 */}
        <Box sx={{ pt: 2 }}>
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

      <RoundResultModal roomId={roomId} socket={socket} dispatch={dispatch} />
      <GameEndModal roomId={roomId} socket={socket} />
    </Box>
  );
}
