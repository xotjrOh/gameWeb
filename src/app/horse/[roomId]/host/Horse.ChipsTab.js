'use client';

import { useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updatePlayers } from '@/store/horseSlice';

function ChipsTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const { players } = useSelector((state) => state.horse.gameData);

  useEffect(() => {
    if (socket) {
      // 'round-ended' 이벤트를 수신하여 칩 개수 업데이트
      const updatePlayersAfterRoundEnd = ({ players }) => {
        dispatch(updatePlayers(players));
      };
      socket.on('round-ended', updatePlayersAfterRoundEnd);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        socket.off('round-ended', updatePlayersAfterRoundEnd);
      };
    }
  }, [socket?.id, dispatch]);

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg">
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl md:text-2xl font-bold text-indigo-600">칩 개수</h2>
      </div>
      <ul className="mt-4 space-y-2">
        {players.map((player, index) => (
          <li key={index} className="py-2 border-b">
            <span className="text-sm md:text-base">{player.dummyName}: {player.chips.toString().padStart(2, '0')}개</span>
            <span className="ml-2 text-xs md:text-sm text-gray-700">({player.horse}, {player.name}{player.isSolo ? ', 솔로' : ''}, {player.socketId})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(ChipsTab);
