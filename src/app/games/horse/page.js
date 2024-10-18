'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Header from '@/components/header/Header';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Paper,
  Fade,
  useMediaQuery,
  useTheme,
} from '@mui/material';

// 동적 import로 탭 컴포넌트들을 로드 (코드 스플리팅 유지)
const OverviewTab = dynamic(() => import('./Rule.OverviewTab'));
const StatusInfoTab = dynamic(() => import('./Rule.StatusInfoTab'));
const BettingTab = dynamic(() => import('./Rule.BettingTab'));
const VoteTab = dynamic(() => import('./Rule.VoteTab'));
const ChipsTab = dynamic(() => import('./Rule.ChipsTab'));
const HorsesTab = dynamic(() => import('./Rule.HorsesTab'));

export default function GameRulePage() {
  const { data: session } = useSession();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const theme = useTheme();

  // 반응형 디자인을 위한 미디어 쿼리
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // 모바일
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 태블릿
  // const isMdUp = useMediaQuery(theme.breakpoints.up('md')); // 데스크톱 이상

  const tabs = [
    { label: '🎮 게임 개요', component: <OverviewTab /> },
    { label: '👥 내 상태 보기', component: <StatusInfoTab /> },
    { label: '💰 베팅탭 설명', component: <BettingTab /> },
    { label: '🔮 예측탭 설명', component: <VoteTab /> },
    { label: '🎫 칩 개수 탭 설명', component: <ChipsTab /> },
    { label: '🏇 경주마 탭 설명', component: <HorsesTab /> },
  ];

  const handleTabChange = (event, selectedTabIndex) => {
    setActiveTabIndex(selectedTabIndex);
  };

  const renderTabContent = () => {
    return tabs[activeTabIndex].component;
  };

  return (
    <>
      <Header session={session} />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'background.default', // 배경 그라데이션
          py: 4, // 상하 패딩 줄이기
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start', // 내용이 위로 정렬되도록 설정
        }}
      >
        <Container maxWidth="md">
          {/* 제목 및 설명 */}
          <Box sx={{ textAlign: 'center', mb: isXs ? 1 : isSm ? 2 : 3 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                color: theme.palette.primary.main,  // primary 색상 사용
                fontSize: isXs ? '1.5rem' : isSm ? '2rem' : '2.5rem',
              }}
            >
              🏇 경마게임 룰 설명 🏇
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: theme.palette.text.primary,  // text.primary 색상 사용
                fontSize: isXs ? '1rem' : isSm ? '1.25rem' : '1.5rem',
              }}
            >
              경마게임의 모든 규칙을 쉽게 이해하세요!
            </Typography>
          </Box>

          {/* 탭 전환 */}
          <Box sx={{ position: 'relative', borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTabIndex}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile 
              textColor="primary"
              indicatorColor="primary"
              aria-label="게임 룰 탭"
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={index}
                  label={tab.label}
                  id={`tab-${index}`}
                  aria-controls={`tabpanel-${index}`}
                />
              ))}
            </Tabs>
          </Box>

          {/* 탭 내용 */}
          <Fade in={true} timeout={500}>
            <Paper
              elevation={3}
              sx={{
                padding: 3,
                minHeight: '400px', // 레이아웃 쉬프트 방지
              }}
            >
              {renderTabContent()}
            </Paper>
          </Fade>
        </Container>
      </Box>
    </>
  );
}
