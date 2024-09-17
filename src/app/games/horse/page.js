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
    { key: 'overview',    label: '게임 개요',       icon: '🎮' },
    { key: 'statusInfo',  label: '내 상태 보기',    icon: '👥' },
    { key: 'betting',     label: '베팅탭 설명',     icon: '💰' },
    { key: 'vote',        label: '예측탭 설명',     icon: '🔮' },
    { key: 'chips',       label: '칩 개수 탭 설명', icon: '🎫' },
    { key: 'horses',      label: '경주마 탭 설명',  icon: '🏇' },
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-800 mb-4">🏇 경마게임 룰 설명 🏇</h1>
            <p className="text-lg md:text-2xl text-gray-600">경마게임의 모든 규칙을 쉽게 이해하세요!</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full font-semibold text-base transition-colors duration-300 ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-indigo-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">{renderTabContent()}</div>
        </div>
      </div>
    </>
  );
}
