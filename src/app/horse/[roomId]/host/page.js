'use client';

import { useState } from 'react';

import Tabs from '@/components/tab/Tabs';
import Tab from '@/components/tab/Tab';
import TabPanel from '@/components/tab/TabPanel';
import BettingTab from './Horse.BettingTab';
import ChipsTab from './Horse.ChipsTab';
import HorsesTab from './Horse.HorsesTab';
import MyStatusButton from './Horse.MyStatusButton';
import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import { useSocket } from '@/components/provider/SocketProvider';
import { useSession } from 'next-auth/react';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useGameData from '@/hooks/useGameData';

export default function HorseGamePage({ params }) {
  console.log("메인 root 페이지");
  const { roomId } = params;
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('betting'); // 기본 탭을 'betting'으로 설정
  const { data: session, status } = useSession();
  
  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  useRedirectIfNotHost(roomId);
  useUpdateSocketId(socket, session, roomId);
  useGameData(roomId, socket);
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-center">
          🐎 경마게임 🐎 호스트방
        </h1>
        <MyStatusButton roomId={roomId} socket={socket} session={session} />
      </header>

      {/* 탭 네비게이션과 컨텐츠 영역 */}
      <Tabs activeTab={activeTab} onChange={handleTabChange}>
        <Tab label="베팅"    value="betting" />
        <Tab label="칩 개수" value="chips" />
        <Tab label="경주마"  value="horses" />

        <TabPanel value="betting">
          <BettingTab roomId={roomId} socket={socket} session={session} />
        </TabPanel>
        <TabPanel value="chips">
          <ChipsTab roomId={roomId} socket={socket} session={session} />
        </TabPanel>
        <TabPanel value="horses">
          <HorsesTab roomId={roomId} socket={socket} session={session} />
        </TabPanel>
      </Tabs>
    </div>
  );
}