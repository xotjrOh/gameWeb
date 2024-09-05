'use client';

import { useEffect, useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';

export default function RoundResultModal({ socket, roomId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const resultPopupRef = useRef(null);

  useOutsideClick(resultPopupRef, () => setIsOpen(false));

  useEffect(() => {
    if (socket) {
      // 라운드 종료 시 이벤트 받기
      const setRoundResultAfterRoundEnd = ({roundResult}) => {
        setResults(roundResult); // 라운드 결과 저장
        setIsOpen(true);     // 모달 열기
      }
      socket.on('round-ended', setRoundResultAfterRoundEnd);

      return () => {
        socket.off('round-ended', setRoundResultAfterRoundEnd);
      };
    }
  }, [socket]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96" ref={resultPopupRef} >
        <h2 className="text-2xl font-bold mb-4">라운드 결과</h2>
        <div className="space-y-2">
          {results.map(({ horse, progress }, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-xl font-semibold">{horse}</span>
              <span className={`text-lg ${progress === 2 ? 'text-green-500' : 'text-blue-500'}`}>
                {progress === 2 ? '⚡ 2칸 전진! ⚡' : '🐎 1칸 전진! 🐎'}
              </span>
            </div>
          ))}
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
