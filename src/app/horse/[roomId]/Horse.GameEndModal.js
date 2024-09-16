'use client';

import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import Image from 'next/image';
import useOutsideClick from '@/hooks/useOutsideClick';
import './GameEnd.css'; // 모달에 대한 애니메이션을 추가한 css 파일

export default function GameEndModal({ socket, roomId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const { statusInfo } = useSelector((state) => state.horse.gameData); // 내 말 정보를 가져옴
  const resultPopupRef = useRef(null);

  useOutsideClick(resultPopupRef, () => setIsOpen(false));

  useEffect(() => {
    if (socket) {
      const handleGameEnd = ({ winners, losers }) => {
        setGameResult({ winners, losers });
        setIsOpen(true); // 게임이 끝났을 때 모달을 엶
      };

      socket.on('game-ended', handleGameEnd);

      return () => {
        socket.off('game-ended', handleGameEnd);
      };
    }
  }, [socket]);

  if (!isOpen || !gameResult) return null;

  const isMyHorseWinner = gameResult.winners.some(winner => winner.horse === statusInfo.horse);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-80 md:w-96 text-center" ref={resultPopupRef}>
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-blue-600">🎮 게임 종료 🎮</h2>

        {/* 우승자 표시 */}
        {gameResult.winners.length > 0 && (
          <div className="mb-4 winner-section">
            <h3 className="text-xl md:text-2xl font-bold text-green-600">🎉 우승한 말 🎉</h3>
            {gameResult.winners.map(({ horse, playerNames }, index) => (
              <div key={index} className="mb-2">
                <span className="text-lg md:text-xl font-semibold">
                  {horse} ({playerNames.join(', ')})
                </span>
              </div>
            ))}
            <div className="winner-animation">
              <Image src="/images/trophy.webp" alt="우승 트로피" width={96} height={96} className="mx-auto" />
            </div>
          </div>
        )}

        {/* 패배자 표시 */}
        {gameResult.losers.length > 0 && (
          <div className="mb-4 loser-section">
            <h3 className="text-xl md:text-2xl font-bold text-red-600">😢 패배한 말 😢</h3>
            {gameResult.losers.map(({ horse, playerNames }, index) => (
              <div key={index} className="mb-2">
                <span className="text-lg md:text-xl font-semibold">
                  {horse} ({playerNames.join(', ')})
                </span>
              </div>
            ))}
            <div className="loser-animation">
              <Image src="/images/teardrop.webp" alt="패배 눈물" width={96} height={96} className="mx-auto" />
            </div>
          </div>
        )}

        {/* 내 말 우승/패배 확인 */}
        {isMyHorseWinner ? (
          <div className="my-winner-message text-blue-600 text-lg md:text-xl font-bold">
            🎉 내 말 {statusInfo.horse}가 우승했습니다! 🎉
          </div>
        ) : (
          <div className="my-loser-message text-gray-500 text-lg md:text-xl">
            내 말 {statusInfo.horse}는 아쉽게도 패배했습니다...
          </div>
        )}

        {/* 닫기 버튼 */}
        <button
          onClick={() => setIsOpen(false)}
          className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg text-base md:text-lg w-full hover:bg-blue-600 transition"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
