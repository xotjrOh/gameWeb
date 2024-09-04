'use client';

import { useSelector } from 'react-redux';

export default function HorsesTab({ roomId, socket, session }) {
  console.log("horse 페이지");
  const { positions, finishLine } = useSelector((state) => state.horse.gameData);
  console.log("positions : ", positions, finishLine);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">경주마 현황</h2>
      <div className="space-y-4">
        {positions.map((horse, index) => (
          <div key={index} className="flex items-center">
            <span className="mr-4 text-lg font-semibold">{horse.name}</span>
            <div className="flex-1 relative bg-gray-200 rounded h-6">
              {/* 트랙 표시 */}
              <div className="absolute inset-0 flex items-center">
                <span
                  className="block h-full bg-blue-500 rounded"
                  style={{ width: `${(horse.position / finishLine) * 100}%` }}
                ></span>
              </div>
              {/* 경주마 위치 */}
              <div
                className="absolute -top-1.5 -left-1.5"
                style={{ left: `${(horse.position / finishLine) * 100}%` }}
              >
                🏇
              </div>
            </div>
            <span className="ml-4 text-lg">{horse.position}칸</span>
          </div>
        ))}
      </div>
      <p className="text-center mt-4 text-sm text-gray-500">골인점: {finishLine}칸</p>
    </div>
  );
}
