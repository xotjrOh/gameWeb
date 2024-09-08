'use client';

import { useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updatePlayers } from '@/store/horseSlice';
import useRaceEnd from '@/hooks/useRaceEnd';

function ChipsTab({ roomId, socket, session }) {
  console.log("ChipsTab 이다.");
  const dispatch = useDispatch();
  const { players } = useSelector((state) => state.horse.gameData);
  const { hasRaceEnded } = useRaceEnd();

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
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(ChipsTab);