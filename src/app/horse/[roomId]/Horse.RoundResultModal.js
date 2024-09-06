'use client';

import { useEffect, useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import useRaceEnd from '@/hooks/useRaceEnd';
import './RoundEnd.css'

export default function RoundResultModal({ socket, roomId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const { hasRaceEnded } = useRaceEnd();
  const resultPopupRef = useRef(null);

  useOutsideClick(resultPopupRef, () => setIsOpen(false));

  useEffect(() => {
    if (socket) {
      const setRoundResultAfterRoundEnd = ({ roundResult }) => {
        if (!hasRaceEnded) {
            setResults(roundResult);
            console.log("round result ", roundResult);
            setIsOpen(true);
        }
      };

      socket.on('round-ended', setRoundResultAfterRoundEnd);

      return () => {
        socket.off('round-ended', setRoundResultAfterRoundEnd);
      };
    }
  }, [socket]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96" ref={resultPopupRef}>
        <h2 className="text-2xl font-bold mb-4">라운드 결과</h2>
        <div className="space-y-4">
          {results.map(({ horse, progress }, index) => (
            <div key={index} className="flex flex-col items-center justify-between">
              <span className="text-xl font-semibold">{horse}</span>
              <div className="track bg-racetrack"> {/* 배경 이미지가 있는 트랙 */}
                <div
                  className="horse-emoji"
                  style={{
                    animationName: progress === 2 ? 'moveHorseFast' : 'moveHorseSlow',
                    animationDuration: '1s',  // 1초로 설정
                  }}
                >
                  🏇
                </div>
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-center py-6">
                <h2 className="text-2xl font-bold text-red-500 mb-4">😢 아무도 😢</h2>
                <h2 className="text-2xl font-bold text-red-500 mb-4">베팅하지 않았어요! </h2>
                <p className="text-gray-600">이렇게나 흥미진진한 라운드에 </p>
                <p className="text-gray-600">아무도 베팅을 하지 않다니... 너무 아쉽네요!</p>
                <p className="text-gray-600 mt-2">다음 라운드는 꼭 베팅해 주세요! <br/>
                🐎 말들도 기대하고 있어요 🐎</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="mt-4 bg-blue-500 text-white py-2 px-4 rounded w-full"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
