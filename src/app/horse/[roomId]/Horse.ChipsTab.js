'use client';

import { useEffect, useState, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updatePlayers, updateMemo } from '@/store/horseSlice';
import useRaceEnd from '@/hooks/useRaceEnd';

function ChipsTab({ roomId, socket, session }) {
  console.log("ChipsTab 이다.");
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
  }, [roomId, socket?.id]);

  useEffect(() => {
    setMemoState(statusInfo?.memo || []);
  }, [statusInfo?.memo]);
  
  // **서버에 메모 업데이트 요청을 debounce 처리**
  const handleMemoChange = (index, newMemo) => {
    if (newMemo.length > 16) {
      return alert("메모는 최대 16자까지 입력할 수 있습니다.");
    }

    // **메모 상태 업데이트**
    const updatedMemo = [...memoState];
    updatedMemo[index] = newMemo;
    setMemoState(updatedMemo);

    // **기존 debounce 타이머가 있다면 제거**
    if (debounceTimeouts[index]) {
      clearTimeout(debounceTimeouts[index]);
    }

    // **debounce 타이머 설정 (500ms)**
    const timeoutId = setTimeout(() => {
      socket.emit('horse-update-memo', { roomId, index, memo: newMemo, sessionId: session.user.id }, (response) => {
        if (response.success) {
          dispatch(updateMemo({ index, memo: newMemo }));  // **Redux 스토어 업데이트**
        } else {
          alert(response.message || "메모 저장에 실패했습니다.");
        }
      });
    }, 500); // **500ms 후에 서버 요청**

    // **타이머 관리**
    setDebounceTimeouts((prev) => ({
      ...prev,
      [index]: timeoutId,
    }));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold">칩 개수</h2>
      <ul className="mt-4">
        {players.map((player, index) => (
          <li key={index} className="py-2 border-b">
            {player.dummyName}: {player.chips}개 
            {hasRaceEnded && (
              <span>
                ({player.horse}, {player.name}{player.isSolo ? ", 솔로" : ""})
              </span>
            )}

            {/* 메모 입력 필드 */}
            <input
              type="text"
              value={memoState[index] || ''} // **로컬 상태에서 메모 관리**
              onChange={(e) => handleMemoChange(index, e.target.value)} // **debounce 처리된 메모 업데이트**
              className="border p-1 ml-4"
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