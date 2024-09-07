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
  const { data: session, status } = useSession();
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
        <div className="p-8 bg-pink-50 min-h-screen">
        <h1 className="text-3xl font-extrabold mb-6 text-center text-purple-700">🎮 랭크 순위</h1>

        {/* 게임 종류 선택 드롭다운 */}
        <div className="mb-6 flex justify-center items-center">
            <label className="mr-4 text-lg font-bold text-purple-700">게임 선택:</label>
            <select
            value={selectedGame}
            onChange={handleGameChange}
            className="p-3 border-2 rounded-lg bg-white text-purple-700 border-purple-300 hover:bg-purple-100 transition duration-300"
            >
            <option value="horse">🐎 경마게임</option>
            <option value="shuffle">🔀 뒤죽박죽</option>
            </select>
        </div>

        {/* 랭킹 데이터 테이블 */}
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border-collapse rounded-lg shadow-lg">
            <thead>
                <tr>
                <th className="py-4 px-6 bg-purple-200 border-b-2 border-purple-300 text-purple-700">#</th>
                <th className="py-4 px-6 bg-purple-200 border-b-2 border-purple-300 text-purple-700">플레이어</th>
                <th className="py-4 px-6 bg-purple-200 border-b-2 border-purple-300 text-purple-700">승리</th>
                </tr>
            </thead>
            <tbody>
                {rankData.map((player, index) => (
                <tr
                    key={player.rank}
                    className={`${
                    index % 2 === 0 ? 'bg-pink-100' : 'bg-white'
                    } hover:bg-purple-100 transition duration-300`}
                >
                    <td className="py-4 px-6 border-b border-purple-300 text-center text-lg font-semibold text-purple-600">
                    {player.rank}위
                    </td>
                    <td className="py-4 px-6 border-b border-purple-300 text-center text-lg">
                    {player.name}
                    </td>
                    <td className="py-4 px-6 border-b border-purple-300 text-center text-lg">
                    {player.score} 🏆
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>
    </>
  );
}
