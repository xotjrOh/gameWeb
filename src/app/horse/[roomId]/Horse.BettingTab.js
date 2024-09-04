'use client'

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateHorses, updatePositions, updateChip, updatePlayers } from '@/store/horseSlice';

export default function BettingTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [timeLeft, setTimeLeft] = useState(0); // o
  const [bets, setBets] = useState({}); // o
  const [isBetLocked, setIsBetLocked] = useState(false); // o
  const { horses, statusInfo } = useSelector((state) => state.horse.gameData);

  useEffect(() => {
    if (socket) {
      socket.on('update-timer', (newTimeLeft) => {
        setTimeLeft(newTimeLeft);
      });

      socket.on('roles-assigned', ({ horses, players }) => {
        const positions = horses.map(horse => ({
          name: horse,
          position: 0
        }));
        dispatch(updateHorses(horses));
        dispatch(updatePositions(positions));
        dispatch(updatePlayers(players));
      });

      return () => {
        socket.off('update-timer');
        socket.off('roles-assigned');
      };
    }
  }, [roomId, socket?.id, dispatch]);

  const handleBetChange = (horse, amount) => {
    const newBets = { ...bets, [horse]: amount };
    const totalBet = Object.values(newBets).reduce((sum, chips) => sum + chips, 0);
    
    // todo : 초과하여 설정은 되나 체크 필요
    if (totalBet <= (statusInfo?.chips || 0)) {
      setBets(newBets);
    }
  };

  const handleBet = () => {
    if (isBetLocked || timeLeft === 0) {
      return alert("더이상 베팅할 수 없습니다.");
    }

    if (Object.keys(bets).length > 0) {
      socket.emit('horse-bet', { roomId, bets }, (response) => {
        if (response.success) {
          alert('베팅이 완료되었습니다.');
          dispatch(updateChip(response.remainChips));
          setIsBetLocked(true);
        } else {
          alert(response.message);
        }
      });
    } else {
      alert('최소 하나의 말에 베팅해주세요.');
    }
  };

  return (
    <div className="space-y-4">

      {/* 타이머 및 베팅 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">베팅</h2>
        <p className="text-lg">남은 시간: {Math.floor(timeLeft / 60)}:{timeLeft % 60}</p>
        <p className="text-red-500">칩은 리필되지 않으니 아껴서 베팅해주세요. 베팅하기 버튼을 누른 이후에는 수정이 불가합니다.</p>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {horses.map((horse) => (
            <div key={horse} className="flex flex-col items-center">
              <label className="font-semibold">{horse}</label>
              <input
                type="range"
                min="0"
                max={(statusInfo?.chips || 0)}  
                value={bets[horse] || 0}
                onChange={(e) => handleBetChange(horse, parseInt(e.target.value))}
                disabled={isBetLocked || timeLeft === 0}  
                className="w-full"
              />
              <p>{bets[horse] || 0} chips</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleBet}
          className={`mt-4 ${isBetLocked || timeLeft === 0 ? 'bg-gray-500' : 'bg-green-500'} text-white py-2 px-4 rounded`}
          disabled={isBetLocked || timeLeft === 0}
        >
          베팅하기
        </button>
      </div>
    </div>
  );
}
