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
      const updatePlayersAfterRoundEnd = ({players}) => {
        dispatch(updatePlayers(players));
      }
      socket.on('round-ended', updatePlayersAfterRoundEnd);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        socket.off('round-ended', updatePlayersAfterRoundEnd);
      };
    }
  }, [socket?.id, dispatch]);

  return (
    <div>
      <h2 className="text-xl font-bold md:text-2xl">칩 개수</h2>
      <ul className="mt-4 space-y-2">
        {players.map((player, index) => (
          <li key={index} className="flex justify-between items-center py-2 border-b text-sm md:text-base">
            <span className="font-semibold">{player.dummyName} :</span>
            <span className="text-gray-600"> {player.chips}개 ({player.horse}, {player.name}{player.isSolo ? ", 솔로" : ""}, {player.socketId}) </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(ChipsTab);