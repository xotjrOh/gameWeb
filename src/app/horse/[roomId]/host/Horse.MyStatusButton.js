'use client';

import { useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';

export default function MyStatusButton({ roomId, socket, session }) {
  const [showStatus, setShowStatus] = useState(false);
  const popupRef = useRef(null);

  useOutsideClick(popupRef, () => setShowStatus(false));

  return (
    <div className="relative">
      <button
        onClick={() => setShowStatus(true)}
        className="bg-blue-500 text-white py-2 px-4 rounded"
      >
        내 상태 보기
      </button>

      {showStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div ref={popupRef} className="bg-white p-6 rounded shadow-lg text-center">
            <h3 className="text-lg font-bold">내 상태</h3>
            <p>익명 이름: player3</p>
            <p>내 경주마: F</p>
            <p>남은 칩 개수: 17</p>
            <button
              onClick={() => setShowStatus(false)}
              className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
