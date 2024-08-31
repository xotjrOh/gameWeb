'use client';

import { useState } from 'react';

import Tabs from '@/components/tab/Tabs';
import Tab from '@/components/tab/Tab';
import TabPanel from '@/components/tab/TabPanel';
import BettingTab from './Horse.BettingTab';
import ChipsTab from './Horse.ChipsTab';
import HorsesTab from './Horse.HorsesTab';
import MyStatusButton from './Horse.MyStatusButton';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';

export default function HorseGamePage({ params }) {
  const { roomId } = params;
  const [activeTab, setActiveTab] = useState('betting'); // 기본 탭을 'betting'으로 설정
  
  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  useRedirectIfInvalidRoom(roomId);
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-center">
          🐎 경마게임 🐎
        </h1>
        <MyStatusButton />
      </header>

      {/* 탭 네비게이션과 컨텐츠 영역 */}
      <Tabs activeTab={activeTab} onChange={handleTabChange}>
        <Tab label="베팅"    value="betting" />
        <Tab label="칩 개수" value="chips" />
        <Tab label="경주마"  value="horses" />

        <TabPanel value="betting">
          <BettingTab roomId={roomId}/>
        </TabPanel>
        <TabPanel value="chips">
          <ChipsTab roomId={roomId}/>
        </TabPanel>
        <TabPanel value="horses">
          <HorsesTab roomId={roomId}/>
        </TabPanel>
      </Tabs>
    </div>
  );
}