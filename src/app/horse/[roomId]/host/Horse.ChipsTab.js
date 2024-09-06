'use client';

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updatePlayers } from '@/store/horseSlice';

export default function ChipsTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const { players } = useSelector((state) => state.horse.gameData);
  
  useEffect(() => {
    console.log("players", players);
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

  return (
    <div>
      <h2 className="text-2xl font-bold">칩 개수</h2>
      <ul className="mt-4">
        {players.map((player, index) => (
          <li key={index} className="py-2 border-b">
            {player.dummyName}: {player.chips}개 ({player.horse}, {player.name}, {player.isSolo ? "솔로" : ""}, {player.socketId})
          </li>
        ))}
      </ul>
    </div>
  );
}
