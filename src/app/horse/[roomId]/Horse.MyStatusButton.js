'use client';

import { useState, useRef, useEffect } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useSelector, useDispatch } from 'react-redux';
import { updateStatusInfo } from '@/store/horseSlice';

export default function MyStatusButton({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [showStatus, setShowStatus] = useState(false);
  const popupRef = useRef(null);
  const { statusInfo } = useSelector((state) => state.horse.gameData);

  useOutsideClick(popupRef, () => setShowStatus(false));

  useEffect(() => {
    if (socket) {
      socket.on('status-update', (data) => {
        dispatch(updateStatusInfo(data));
      });

      return () => {
          socket.off('status-update');
      };
    }
  }, [roomId, socket?.id, session, dispatch]);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setShowStatus(true)}
        className="bg-blue-500 text-white py-2 px-3 rounded text-xs md:text-sm lg:text-lg"
      >
        내 상태 보기
      </button>

      {showStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4">
          <div ref={popupRef} className="bg-white p-4 md:p-6 rounded shadow-lg text-center">
            <h3 className="text-lg md:text-2xl font-bold mb-1">내 상태</h3>
            <p className="text-sm md:text-base">익명 이름: {statusInfo?.dummyName}</p>
            <p className="text-sm md:text-base">내 경주마: {statusInfo?.horse}</p>
            <p className="text-sm md:text-base">남은 칩 개수: {statusInfo?.chips}</p>
            {statusInfo?.isSolo && (
              <p className="text-xs md:text-sm text-gray-600 mt-2">
                Tip: 당신 혼자만 팀원이 없습니다.<br/>
                팀원이 없는걸 숨기고 베팅 정보를 모아<br/>
                &apos;예측&apos;에 성공하면 게임이 쉬워집니다.
              </p>
            )}
            <button
              onClick={() => setShowStatus(false)}
              className="mt-4 bg-blue-500 text-white py-2 px-3 rounded text-xs md:text-sm lg:text-lg"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
