'use client';

import { useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';

export default function MyStatusButton({ roomId, socket, session }) {
  const [showStatus, setShowStatus] = useState(false);
  const popupRef = useRef(null);

  useOutsideClick(popupRef, () => setShowStatus(false));

  return (
    <div className="relative z-50">
      <button
        onClick={() => setShowStatus(true)}
        className="bg-indigo-500 text-white py-2 px-3 rounded text-xs md:text-sm lg:text-lg transition-transform duration-300 hover:scale-105"
      >
        내 상태 보기
      </button>

      {showStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4">
          <div ref={popupRef} className="bg-white p-4 md:p-6 rounded-lg shadow-lg text-center transition-transform duration-300">
            <h3 className="text-lg md:text-2xl font-bold mb-1 text-indigo-700">내 상태</h3>
            <p className="text-sm md:text-base">익명 이름: 호스트</p>
            <p className="text-sm md:text-base">내 경주마: 없음</p>
            <p className="text-sm md:text-base">남은 칩 개수: 20</p>
            <button
              onClick={() => setShowStatus(false)}
              className="mt-4 bg-indigo-500 text-white py-2 px-3 rounded text-xs md:text-sm lg:text-lg transition-transform duration-300 hover:scale-105"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
