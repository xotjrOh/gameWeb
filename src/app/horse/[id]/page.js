'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSocket from '@/hooks/useSocket';

import Tabs from '@/components/tab/Tabs';
import Tab from '@/components/tab/Tab';
import TabPanel from '@/components/tab/TabPanel';
import BettingTab from './Horse.BettingTab';
import ChipsTab from './Horse.ChipsTab';
import HorsesTab from './Horse.HorsesTab';

export default function HorseGamePage({ params }) {
  const { id } = params;
  const socket = useSocket();
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('betting'); // 기본 탭을 'betting'으로 설정

  useEffect(() => {
    if (session) {
        console.log("session");
        console.log(session);
        socket.emit('check-room', { roomId: id, sessionId: session.user.id }, (response) => {
            if (!response.isInRoom) {
                alert('잘못된 접근입니다. 대기방으로 이동합니다.');
                router.push('/');
            }
        });
    }
  }, [session]);

  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">경마게임</h1>
      </header>

      {/* 탭 네비게이션과 컨텐츠 영역 */}
      <Tabs activeTab={activeTab} onChange={handleTabChange}>
        <Tab label="베팅"    value="betting" />
        <Tab label="칩 개수" value="chips" />
        <Tab label="경주마"  value="horses" />

        <TabPanel value="betting">
          <BettingTab />
        </TabPanel>
        <TabPanel value="chips">
          <ChipsTab />
        </TabPanel>
        <TabPanel value="horses">
          <HorsesTab />
        </TabPanel>
      </Tabs>
    </div>
  );
}