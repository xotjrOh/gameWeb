'use client';

import { useEffect, useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import useRaceEnd from '@/hooks/useRaceEnd';
import { useSelector } from 'react-redux';

export default function RoundResultModal({ socket, roomId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const { hasRaceEnded } = useRaceEnd();
  const resultPopupRef = useRef(null);
  const { statusInfo, rounds, positions } = useSelector((state) => state.horse.gameData);

  useOutsideClick(resultPopupRef, () => setIsOpen(false));

  useEffect(() => {
    if (socket) {
      const setRoundResultAfterRoundEnd = ({ roundResult }) => {
        if (!hasRaceEnded) {
          setResults(roundResult);
          setIsOpen(true);
        }
      };

      socket.on('round-ended', setRoundResultAfterRoundEnd);

      return () => {
        socket.off('round-ended', setRoundResultAfterRoundEnd);
      };
    }
  }, [socket, hasRaceEnded]);

  if (!isOpen) return null;

  const getPlayerSuccess = (horse) => {
    const lastBet = statusInfo?.voteHistory?.[statusInfo.voteHistory.length - 1];
    return (
      lastBet === horse &&
      results.find((result) => result.horse === horse && result.progress === 2)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="bg-white p-4 md:p-6 rounded-lg shadow-lg w-80 md:w-96"
        ref={resultPopupRef}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-blue-600">
          라운드 결과
        </h2>
        <div className="space-y-4">
          {results
            .filter(({ progress }) => progress !== 0)
            .map(({ horse, progress }, index) => {
              const isSuccess = getPlayerSuccess(horse);
              const horsePosition = positions.find(pos => pos.name === horse)?.position || 0;

              return (
                <div
                  key={index}
                  className={`flex flex-col items-center justify-between ${
                    isSuccess ? 'bg-green-100 border-green-500' : ''
                  } 
                  p-2 md:p-3 rounded-lg shadow-md border`}
                >
                  <span
                    className={`text-lg md:text-xl font-semibold ${
                      isSuccess ? 'text-green-700' : ''
                    }`}
                  >
                    {horse} {isSuccess ? '🎉' : ''}
                  </span>
                  {/* 트랙 */}
                  <div className="relative w-full h-10 border border-track rounded-track overflow-hidden my-2 bg-racetrack bg-cover bg-center">
                    <div
                      className={`absolute top-0 left-0 text-2xl z-1 transform scale-x-[-1] ${
                        progress === 2
                          ? 'animate-moveHorseFast'
                          : 'animate-moveHorseSlow'
                      }`}
                    >
                      🏇
                    </div>
                  </div>
                  {/* 트랙 칸 표시를 아래로 이동 */}
                  <div className="flex justify-between w-full px-2 mt-1">
                    <span className="text-sm text-gray-500">{horsePosition - progress}칸</span>
                    <span className="text-sm text-gray-500">{horsePosition - progress + 1}칸</span>
                    <span className="text-sm text-gray-500">{horsePosition - progress + 2}칸</span>
                  </div>
                  {isSuccess && (
                    <p className="text-green-700 font-semibold mt-2">
                      축하합니다! 예측에 성공했습니다!
                    </p>
                  )}
                </div>
              );
            })}
          {results.length === 0 && (
            <div className="text-center py-4 md:py-6">
              <h2 className="text-xl md:text-2xl font-bold text-red-500 mb-4">
                😢 아무도 베팅하지 않았습니다 😢
              </h2>
              <p className="text-gray-600 text-sm md:text-base">
                다음 라운드에는 꼭 베팅하세요!
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="mt-4 bg-blue-500 text-white py-2 px-4 rounded w-full text-base md:text-lg hover:bg-blue-600 transition"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
