'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';

const mockRankData = {
  horse: [
    { rank: 1, name: '오태석', score: 13 },
    { rank: 2, name: '방준성', score: 1 },
    { rank: 3, name: '안민우', score: 0 },
    { rank: 4, name: '이승현', score: 0 },
    { rank: 5, name: '김주희', score: 0 },
  ],
  shuffle: [
    { rank: 1, name: '안민우', score: 0 },
    { rank: 2, name: '방준성', score: 0 },
    { rank: 3, name: '오태석', score: 0 },
    { rank: 4, name: '이승현', score: 0 },
    { rank: 5, name: '이다솜', score: 0 },
  ],
};

export default function RankingPage() {
  const { data: session } = useSession();
  const [selectedGame, setSelectedGame] = useState('horse');
  const [rankData, setRankData] = useState(mockRankData[selectedGame]);

  const handleGameChange = (e) => {
    const game = e.target.value;
    setSelectedGame(game);
    setRankData(mockRankData[game]);
  };

  return (
    <>
      <Header session={session} />
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-extrabold mb-8 text-center text-indigo-700">
            🏆 랭킹 순위
          </h1>

          {/* 게임 종류 선택 드롭다운 */}
          <div className="mb-8 flex justify-center items-center">
            <label className="mr-4 text-lg font-semibold text-gray-700">
              게임 선택:
            </label>
            <select
              value={selectedGame}
              onChange={handleGameChange}
              className="py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="horse">🐎 경마게임</option>
              <option value="shuffle">🔀 뒤죽박죽</option>
            </select>
          </div>

          {/* 랭킹 데이터 카드 형식으로 표시 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rankData.map((player) => {
              let cardClass =
                'bg-white rounded-lg p-6 flex items-center space-x-4 shadow-md hover:shadow-xl transition-shadow duration-300';
              let rankTextClass = 'text-3xl font-bold';
              let nameTextClass = 'text-xl font-semibold text-gray-800';
              let scoreTextClass = 'text-xl flex items-center text-yellow-500';
              let medal = '';

              if (player.rank === 1) {
                rankTextClass += ' text-indigo-700';
                medal = '🥇';
              } else if (player.rank === 2) {
                rankTextClass += ' text-indigo-600';
                medal = '🥈';
              } else if (player.rank === 3) {
                rankTextClass += ' text-indigo-500';
                medal = '🥉';
              } else {
                rankTextClass += ' text-indigo-400';
              }

              return (
                <div key={player.rank} className={cardClass}>
                  <div className={rankTextClass}>
                    {medal || `${player.rank}위`}
                  </div>
                  <div className="flex-1">
                    <h2 className={nameTextClass}>{player.name}</h2>
                  </div>
                  <div className={scoreTextClass}>
                    {player.score} <span className="ml-1">🏆</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
