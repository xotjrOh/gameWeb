'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Header from '@/components/header/Header';

// 동적 import로 탭 컴포넌트들을 로드
const OverviewTab = dynamic(() => import('./Rule.OverviewTab'));
const StatusInfoTab = dynamic(() => import('./Rule.StatusInfoTab'));
const BettingTab = dynamic(() => import('./Rule.BettingTab'));
const VoteTab = dynamic(() => import('./Rule.VoteTab'));
const ChipsTab = dynamic(() => import('./Rule.ChipsTab'));
const HorsesTab = dynamic(() => import('./Rule.HorsesTab'));

export default function GameRulePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: session, status } = useSession();

  const tabs = [
    { key: 'overview', label: '게임 개요' },
    { key: 'statusInfo', label: '역할 분배' },
    { key: 'betting', label: '베팅탭 설명' },
    { key: 'vote', label: '예측탭 설명' },
    { key: 'chips', label: '칩 개수 탭 설명' },
    { key: 'horses', label: '경주마 탭 설명' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'statusInfo':
        return <StatusInfoTab />;
      case 'betting':
        return <BettingTab />;
      case 'vote':
        return <VoteTab />;
      case 'chips':
        return <ChipsTab />;
      case 'horses':
        return <HorsesTab />;
      default:
        return null;
    }
  };

  return (
    <>
      <Header session={session} />
      <div className="px-4 py-4 md:py-8 bg-gradient-to-br from-blue-100 to-purple-200 min-h-screen">
        <div className="text-center mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 yeogieottae-font">🏇 경마게임 룰 설명 🏇</h1>
          <p className="text-sm md:text-xl">경마게임의 모든 규칙을 쉽게 이해하세요!</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-1 md:mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 md:px-4 md:py-2 rounded-lg text-white font-semibold text-xs md:text-base ${
                activeTab === tab.key ? 'bg-blue-500' : 'bg-gray-400 hover:bg-blue-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-sm md:text-base">{renderTabContent()}</div>
      </div>
    </>
  );
}
