'use client';

import { useEffect, useState, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updatePlayers, updateMemo } from '@/store/horseSlice';
import useRaceEnd from '@/hooks/useRaceEnd';
import { showToast } from '@/store/toastSlice';

function ChipsTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const { players, statusInfo } = useSelector((state) => state.horse.gameData);
  const { hasRaceEnded } = useRaceEnd();
  const [memoState, setMemoState] = useState(statusInfo?.memo || []); // **입력 메모 상태 관리**
  const [debounceTimeouts, setDebounceTimeouts] = useState({});

  useEffect(() => {
    if (socket) {
      // 'round-ended' 이벤트를 수신하여 칩 개수 업데이트
      const updatePlayersAfterRoundEnd = ({players}) => {
        dispatch(updatePlayers(players));
      }
      socket.on('round-ended', updatePlayersAfterRoundEnd);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        socket.off('round-ended', updatePlayersAfterRoundEnd);
      };
    }
  }, [roomId, socket?.id, dispatch]);

  // 새로고침시의 memo값 할당
  useEffect(() => {
    setMemoState(statusInfo?.memo || []);
  }, [statusInfo]);

  // **서버에 메모 업데이트 요청을 debounce 처리**
  const handleMemoChange = (index, newMemo) => {
    if (newMemo.length > 16) {
      return dispatch(showToast({ message: "메모는 최대 16자까지 입력할 수 있습니다.", type: 'error' }));
    }

    // **메모 상태 업데이트**
    const updatedMemo = [...memoState];
    updatedMemo[index] = newMemo;
    setMemoState(updatedMemo);

    // **기존 debounce 타이머가 있다면 제거**
    if (debounceTimeouts[index]) {
      clearTimeout(debounceTimeouts[index]);
    }

    // **debounce 타이머 설정 (600ms)**
    const timeoutId = setTimeout(() => {
      socket.emit('horse-update-memo', { roomId, index, memo: newMemo, sessionId: session.user.id }, (response) => {
        if (response.success) {
          dispatch(updateMemo({ index, memo: newMemo }));  // **Redux 스토어 업데이트**
        } else {
          dispatch(showToast({ message: response.message || "메모 저장에 실패했습니다.", type: 'error' }));
        }
      });
    }, 600); // **600ms 후에 서버 요청**

    // **타이머 관리**
    setDebounceTimeouts((prev) => ({
      ...prev,
      [index]: timeoutId,
    }));
  };

  // **focus를 잃었을 때 바로 서버에 업데이트 요청**
  const handleBlur = (index) => {
    const newMemo = memoState[index];
    socket.emit('horse-update-memo', { roomId, index, memo: newMemo, sessionId: session.user.id }, (response) => {
      if (response.success) {
        clearTimeout(debounceTimeouts[index]);
        dispatch(updateMemo({ index, memo: newMemo })); // **Redux 스토어 업데이트**
      } else {
        dispatch(showToast({ message: response.message || '메모 저장에 실패했습니다.', type: 'error' }));
      }
    });
  };

  return (
    <div>
      <div className="flex items-baseline mb-2">
      <h2 className="text-xl md:text-2xl font-bold">칩 개수</h2> 
        {/* **칩개수 추가** */}
        <p className="text-xs md:text-sm text-gray-500 ml-2">(각 메모는 16글자 제한)</p>
      </div>
      <p className="mt-1 text-xs md:text-sm">각 플레이어가 누구일지, 어떤 경주마일지 예측하여 기록해두면 <br/>기억하기 편하답니다 :)</p>
      <ul className="mt-4">
        {players.map((player, index) => (
          <li key={index} className="py-2 border-b">
            <span className="text-sm md:text-base">{player.dummyName}: {player.chips}개</span>
            {hasRaceEnded && (
              <span className="ml-2 text-xs md:text-sm text-gray-700">
                ({player.horse}, {player.name}{player.isSolo ? ", 솔로" : ""})
              </span>
            )}

            {/* 메모 입력 필드 */}
            <input
              type="text"
              value={memoState[index] || ''} // **로컬 상태에서 메모 관리**
              onChange={(e) => handleMemoChange(index, e.target.value)} // **debounce 처리된 메모 업데이트**
              onBlur={() => handleBlur(index)}
              className="border p-1 ml-4 w-48 md:w-64 text-xs md:text-sm"
              placeholder="플레이어 정보 메모"
              maxLength={16}  // **16글자 제한**
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(ChipsTab);