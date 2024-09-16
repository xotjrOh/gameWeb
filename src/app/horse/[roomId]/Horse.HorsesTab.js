'use client';

import { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import useRaceEnd from '@/hooks/useRaceEnd';

function HorsesTab({ roomId, socket, session }) {
  const { positions, finishLine, rounds, players } = useSelector((state) => state.horse.gameData);
  const { hasRaceEnded } = useRaceEnd();

  const sortedPositions = useMemo(() => {
    return [...positions].sort((a, b) => a.name.localeCompare(b.name));
  }, [positions]);

  const getHorsePlayers = (horseName) => {
    return players
      .filter((player) => player.horse === horseName)
      .map((player) => player.name)
      .join(', ');
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg">
      <h2 className="text-xl md:text-2xl font-bold text-indigo-600 mb-4">경주마 현황</h2>
      <div className="space-y-4">
        {sortedPositions.map((horse, index) => (
          <div key={index} className="bg-indigo-50 p-4 rounded-lg shadow-md">
            <div className="flex items-center">
              <span className="mr-4 text-lg md:text-xl font-semibold">{horse.name}</span>
              <div className="flex-1 relative bg-gray-200 rounded h-4 md:h-6">
                <div className="absolute inset-0 flex items-center">
                  <span
                    className="block h-full bg-blue-500 rounded"
                    style={{ width: `${Math.min((horse.position / finishLine) * 100, 100)}%` }}
                  ></span>
                </div>
                <div
                  className="absolute -top-1 -left-1"
                  style={{ left: `${Math.min((horse.position / finishLine) * 100, 100)}%`, transform: 'scaleX(-1)' }}
                >
                  🏇
                </div>
              </div>
              <span className="ml-4 text-sm md:text-lg">{horse.position}칸</span>
            </div>
            {hasRaceEnded && (
              <span className="text-xs md:text-sm text-gray-500">{getHorsePlayers(horse.name)}</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-center mt-4 text-xs md:text-sm text-gray-500">결승선: {finishLine}칸</p>

      {/* 라운드별 경주마 현황 */}
      <div className="mt-6">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-indigo-600">라운드별 경주마 현황</h3>
        {rounds && rounds.length > 0 ? (
          rounds.map((round, roundIndex) => (
            <div key={roundIndex} className="mb-6">
              <h4 className="text-md md:text-lg font-semibold mb-2">라운드 {roundIndex + 1}</h4>
              <div className="space-y-2">
                {round.map((bet, betIndex) => (
                  <div key={betIndex} className="flex justify-between items-center p-2 md:p-3 bg-white rounded-lg shadow-md border border-gray-300">
                    <span className="text-sm md:text-lg font-medium">{bet.horse}</span>
                    <span className="text-gray-600 text-xs md:text-sm">전진: {bet.progress}</span>
                    {hasRaceEnded && <span className="text-xs md:text-sm text-gray-700">칩: {bet.chips}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 text-xs md:text-sm">아직 베팅 기록이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export default memo(HorsesTab);
