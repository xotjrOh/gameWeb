'use client';

import { useEffect, useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import useRaceEnd from '@/hooks/useRaceEnd';
import './../RoundEnd.css';
import { useSelector } from 'react-redux';

export default function RoundResultModal({ socket, roomId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const { hasRaceEnded } = useRaceEnd();
  const resultPopupRef = useRef(null);
  const { statusInfo } = useSelector((state) => state.horse.gameData); // Redux에서 상태 정보 가져오기

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
    const lastBet = statusInfo?.voteHistory?.[statusInfo.voteHistory.length - 1]; // 마지막 베팅 정보
    return lastBet === horse && results.find(result => result.horse === horse && result.progress === 2); // 성공한 말
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg w-80 md:w-96" ref={resultPopupRef}>
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-blue-600">라운드 결과</h2>
        <div className="space-y-4">
          {results
            .filter(({ progress }) => progress !== 0)
            .map(({ horse, progress }, index) => {
              const isSuccess = getPlayerSuccess(horse);  // 성공 여부 확인
              return (
                <div
                  key={index}
                  className={`flex flex-col items-center justify-between ${isSuccess ? 'bg-green-100 border-green-500' : ''} 
                  p-2 md:p-3 rounded-lg shadow-md border`}
                >
                  <span className={`text-lg md:text-xl font-semibold ${isSuccess ? 'text-green-700' : ''}`}>
                    {horse} {isSuccess ? '🎉' : ''}
                  </span>
                  <div className="track bg-racetrack h-6 md:h-8">
                    <div
                      className="horse-emoji"
                      style={{
                        animationName: progress === 2 ? 'moveHorseFast' : 'moveHorseSlow',
                        animationDuration: '1s',
                      }}
                    >
                      🏇
                    </div>
                  </div>
                  {isSuccess && (
                    <p className="text-green-700 font-semibold mt-2 text-sm md:text-base">
                      축하합니다! 예측에 성공했습니다!
                    </p>
                  )}
                </div>
              );
            })}
          {results.length === 0 && (
            <div className="text-center py-4 md:py-6">
              <h2 className="text-xl md:text-2xl font-bold text-red-500 mb-2 md:mb-4">😢 아무도 😢</h2>
              <h2 className="text-xl md:text-2xl font-bold text-red-500 mb-2 md:mb-4">베팅하지 않았습니다!</h2>
              <p className="text-gray-600 text-sm md:text-base">다음 라운드에는 꼭 베팅하세요!</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="mt-4 bg-blue-500 text-white py-2 px-3 md:px-4 rounded-lg w-full text-base md:text-lg hover:bg-blue-600 transition"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
