'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Tabs from '@/components/tab/Tabs';
import Tab from '@/components/tab/Tab';
import TabPanel from '@/components/tab/TabPanel';
import TimerDisplay from '@/components/TimerDisplay';
import MyStatusButton from '@/components/horse/MyStatusButton';
import BettingTab from './Horse.BettingTab';
import VoteTab from './Horse.VoteTab';
import ChipsTab from './Horse.ChipsTab';
import HorsesTab from '@/components/horse/HorsesTab';
import RoundResultModal from './Horse.RoundResultModal';
import GameEndModal from './Horse.GameEndModal';
import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import { useSocket } from '@/components/provider/SocketProvider';
import { useSession } from 'next-auth/react';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useGameData from '@/hooks/useGameData';
import useCheckVersion from '@/hooks/useCheckVersion';

export default function HorseGamePage({ params }) {
  const dispatch = useDispatch();
  const { roomId } = params;
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('betting');
  const { data: session, status } = useSession();
  const { rooms } = useSelector((state) => state.room);

  useCheckVersion(socket);
  useRedirectIfNotHost(roomId);
  useUpdateSocketId(socket, session, roomId);
  useGameData(roomId, socket, session?.user?.id);

  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-indigo-100 flex flex-col">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white shadow-lg p-4 flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-indigo-600 text-center">
          🐎 경마게임 🐎
        </h1>
        <TimerDisplay roomId={roomId} socket={socket} dispatch={dispatch} />
        <div className="flex">
          <h1 className="mr-4 text-base md:text-lg">{rooms?.[roomId]?.players?.length}명 </h1>
          <MyStatusButton roomId={roomId} socket={socket} session={session} />
        </div>
      </header>

      {/* 탭 네비게이션과 컨텐츠 영역 */}
      <Tabs activeTab={activeTab} onChange={handleTabChange}>
        <Tab label="베팅" value="betting" />
        <Tab label="예측" value="vote" />
        <Tab label="칩 개수" value="chips" />
        <Tab label="경주마" value="horses" />

        <TabPanel value="betting">
          <BettingTab roomId={roomId} socket={socket} session={session} />
        </TabPanel>
        <TabPanel value="vote">
          <VoteTab roomId={roomId} socket={socket} session={session} />
        </TabPanel>
        <TabPanel value="chips">
          <ChipsTab roomId={roomId} socket={socket} session={session} />
        </TabPanel>
        <TabPanel value="horses">
          <HorsesTab roomId={roomId} socket={socket} session={session} />
        </TabPanel>
      </Tabs>

      <RoundResultModal roomId={roomId} socket={socket} />
      <GameEndModal roomId={roomId} socket={socket} />
    </div>
  );
}
