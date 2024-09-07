'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';

import Tabs from '@/components/tab/Tabs';
import Tab from '@/components/tab/Tab';
import TabPanel from '@/components/tab/TabPanel';
import BettingTab from './Horse.BettingTab';
import VoteTab from './Horse.VoteTab';
import ChipsTab from './Horse.ChipsTab';
import HorsesTab from './Horse.HorsesTab';
import MyStatusButton from './Horse.MyStatusButton';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
import { useSocket } from '@/components/provider/SocketProvider';
import { useSession } from 'next-auth/react';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useGameData from '@/hooks/useGameData';
import RoundResultModal from './Horse.RoundResultModal';
import GameEndModal from './Horse.GameEndModal';
import useCheckVersion from '@/hooks/useCheckVersion';
import useTimeLeft from '@/hooks/useTimeLeft';

export default function HorseGamePage({ params }) {
  const dispatch = useDispatch();
  const { roomId } = params;
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('betting'); // 기본 탭을 'betting'으로 설정
  const { data: session, status } = useSession();
  const { timeLeft } = useTimeLeft(roomId, socket, dispatch);
  
  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  useCheckVersion(socket);
  useRedirectIfInvalidRoom(roomId);
  useUpdateSocketId(socket, session, roomId);
  useGameData(roomId, socket, session?.user?.id);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-center">
          🐎 경마게임 🐎
        </h1>
        <p className="text-lg">남은 시간: {Math.floor(timeLeft / 60)}:{timeLeft % 60}</p>
        <MyStatusButton roomId={roomId} socket={socket} session={session} />
      </header>

      {/* 탭 네비게이션과 컨텐츠 영역 */}
      <Tabs activeTab={activeTab} onChange={handleTabChange}>
        <Tab label="베팅"    value="betting" />
        <Tab label="예측"    value="vote" />
        <Tab label="칩 개수" value="chips" />
        <Tab label="경주마"  value="horses" />

        <TabPanel value="betting">
          <BettingTab roomId={roomId} socket={socket} session={session} timeLeft={timeLeft} />
        </TabPanel>
        <TabPanel value="vote">
          <VoteTab roomId={roomId} socket={socket} session={session} timeLeft={timeLeft} />
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