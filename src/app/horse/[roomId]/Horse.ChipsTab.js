'use client';

import { useEffect, useState, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updatePlayers, updateMemo } from '@/store/horseSlice';
import useRaceEnd from '@/hooks/useRaceEnd';
import { useSnackbar } from 'notistack';

function ChipsTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const { players, statusInfo } = useSelector((state) => state.horse.gameData);
  const { hasRaceEnded } = useRaceEnd();
  const [memoState, setMemoState] = useState(statusInfo?.memo || []);
  const [debounceTimeouts, setDebounceTimeouts] = useState({});
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (socket) {
      const updatePlayersAfterRoundEnd = ({ players }) => {
        dispatch(updatePlayers(players));
      };
      socket.on('round-ended', updatePlayersAfterRoundEnd);

      return () => {
        socket.off('round-ended', updatePlayersAfterRoundEnd);
      };
    }
  }, [roomId, socket?.id, dispatch]);

  // 새로고침시의 memo값 할당
  useEffect(() => {
    setMemoState(statusInfo?.memo || []);
  }, [statusInfo]);

  const handleMemoChange = (index, newMemo) => {
    if (newMemo.length > 16) {
      return enqueueSnackbar('메모는 최대 16자까지 입력할 수 있습니다.', { variant: 'error' });
    }

    const updatedMemo = [...memoState];
    updatedMemo[index] = newMemo;
    setMemoState(updatedMemo);

    if (debounceTimeouts[index]) {
      clearTimeout(debounceTimeouts[index]);
    }

    const timeoutId = setTimeout(() => {
      socket.emit('horse-update-memo', { roomId, index, memo: newMemo, sessionId: session.user.id }, (response) => {
        if (response.success) {
          dispatch(updateMemo({ index, memo: newMemo }));
        } else {
          enqueueSnackbar(response.message || '메모 저장에 실패했습니다.', { variant: 'error' });
        }
      });
    }, 600);

    setDebounceTimeouts((prev) => ({
      ...prev,
      [index]: timeoutId,
    }));
  };
  // focus를 잃었을 때 바로 서버에 업데이트 요청
  const handleBlur = (index) => {
    const newMemo = memoState[index];
    socket.emit('horse-update-memo', { roomId, index, memo: newMemo, sessionId: session.user.id }, (response) => {
      if (response.success) {
        clearTimeout(debounceTimeouts[index]);
        dispatch(updateMemo({ index, memo: newMemo }));
      } else {
        enqueueSnackbar(response.message || '메모 저장에 실패했습니다.', { variant: 'error' });
      }
    });
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg">
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl md:text-2xl font-bold text-indigo-600">칩 개수</h2>
        <p className="text-xs md:text-sm text-gray-500 ml-2">(각 메모는 16글자 제한)</p>
      </div>
      <p className="mt-1 text-xs md:text-sm text-gray-600">플레이어 정보를 메모해 두면 <br />기억하기 편리합니다.</p>
      <ul className="mt-4 space-y-2">
        {players.map((player, index) => (
          <li key={index} className="py-2 border-b">
            <span className="text-sm md:text-base">{player.dummyName}: {player.chips.toString().padStart(2, '0')}개</span>
            {hasRaceEnded && (
              <span className="ml-2 text-xs md:text-sm text-gray-700">({player.horse}, {player.name}{player.isSolo ? ', 솔로' : ''})</span>
            )}

            <input
              type="text"
              value={memoState[index] || ''}
              onChange={(e) => handleMemoChange(index, e.target.value)}
              onBlur={() => handleBlur(index)}
              className="border p-2 ml-4 w-48 md:w-64 text-xs md:text-sm rounded-lg"
              placeholder="플레이어 정보 메모"
              maxLength={16}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(ChipsTab);
