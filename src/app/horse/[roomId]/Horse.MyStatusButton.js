'use client';

import { useState, useRef, useEffect } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useSelector, useDispatch } from 'react-redux';
import { setChip } from '@/store/chipSlice';

export default function MyStatusButton({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [showStatus, setShowStatus] = useState(false);
  const [statusInfo, setStatusInfo] = useState({ dummyName: '할당되지않음', horse: '할당되지않음', isSolo: false });
  const popupRef = useRef(null);
  const { chip } = useSelector((state) => state.chip);

  useOutsideClick(popupRef, () => setShowStatus(false));

  useEffect(() => {
    socket.on('status-update', (data) => {
        setStatusInfo(data);
    });

    return () => {
        socket.off('status-update');
    };
  }, [roomId, socket, session]);

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
            <p>익명 이름: {statusInfo.dummyName}</p>
            <p>내 경주마: {statusInfo.horse}</p>
            <p>남은 칩 개수: {chip}</p>
            {statusInfo.isSolo && <p>Tooltip: 혼자만 팀원이 없는 대신 우승자 예측으로 인한 칩이 2개가 아닌 5개가 증가합니다.</p>}
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
