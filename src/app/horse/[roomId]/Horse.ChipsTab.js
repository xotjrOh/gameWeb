'use client';

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updatePlayers } from '@/store/horseSlice';

export default function ChipsTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const { players, positions, finishLine } = useSelector((state) => state.horse.gameData);
  const [hasRaceEnded, setHasRaceEnded] = useState(false); // 게임 종료 여부를 상태로 관리

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
    // positions 배열에서 결승선을 넘은 말이 있는지 확인
    const raceEnded = positions.some(horse => horse.position >= finishLine);
    setHasRaceEnded(raceEnded); // 게임 종료 여부 업데이트
  }, [positions, finishLine]);

  return (
    <div>
      <h2 className="text-2xl font-bold">칩 개수</h2>
      <ul className="mt-4">
        {players.map((player, index) => (
          <li key={index} className="py-2 border-b">
            {player.dummyName}: {player.chips}개 
            {hasRaceEnded && (
              <span>
                ({player.horse}, {player.name}, {player.isSolo ? "솔로" : ""})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
