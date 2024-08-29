'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSocket from '@/hooks/useSocket';
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">경마게임</h1>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="bg-white shadow p-4 flex justify-around">
        <button 
          className={`text-lg font-semibold ${activeTab === 'betting' ? 'text-blue-500' : ''}`} 
          onClick={() => setActiveTab('betting')}
        >
          베팅
        </button>
        <button 
          className={`text-lg font-semibold ${activeTab === 'chips' ? 'text-blue-500' : ''}`} 
          onClick={() => setActiveTab('chips')}
        >
          칩 개수
        </button>
        <button 
          className={`text-lg font-semibold ${activeTab === 'horses' ? 'text-blue-500' : ''}`} 
          onClick={() => setActiveTab('horses')}
        >
          경주마
        </button>
      </nav>

      {/* 컨텐츠 영역 */}
      <main className="flex-1 p-4">
        {activeTab === 'betting' && <BettingTab />}
        {activeTab === 'chips' && <ChipsTab />}
        {activeTab === 'horses' && <HorsesTab />}
      </main>
    </div>
  );
}