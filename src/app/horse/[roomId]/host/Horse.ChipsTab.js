'use client';

import { useState, useEffect } from 'react';

export default function ChipsTab({ roomId, socket, session }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (socket) {
      // 'round-ended' 이벤트를 수신하여 칩 개수 업데이트
      socket.on('round-ended', (updatedPlayers) => {
        setPlayers(updatedPlayers);
      });

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        socket.off('round-ended');
      };
    }
  }, [socket, roomId]);

  return (
    <div>
      <h2 className="text-2xl font-bold">칩 개수</h2>
      <ul className="mt-4">
        {players.map((player, index) => (
          <li key={index} className="py-2 border-b">
            {player.dummyName}: {player.chips}개
          </li>
        ))}
      </ul>
    </div>
  );
}
