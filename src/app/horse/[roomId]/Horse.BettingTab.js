'use client'

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateHorses, updatePositions, updateChip, updatePersonalRounds, updatePlayers } from '@/store/horseSlice';

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
          dispatch(updatePersonalRounds(response.personalRounds));
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

      {/* 라운드별 경주마 베팅 현황 */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-4">라운드별 경주마 베팅 현황</h3>
        {statusInfo.rounds && statusInfo.rounds.length > 0 ? (
          statusInfo.rounds.map((round, roundIndex) => (
            <div key={roundIndex} className="mb-6">
              <h4 className="text-lg font-semibold mb-2">Round {roundIndex + 1}</h4>
              <div className="space-y-2">
                {round.map((bet, betIndex) => (
                  <div key={betIndex} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-md border border-gray-300">
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-medium">{bet.horse}</span>
                      {/* 칩과 진행 상태를 경주마와 더 가깝게 배치 */}
                      <span className="text-sm text-gray-700">Chips: {bet.chips}</span>
                      {/* <span className="text-sm text-gray-700">Progress: {bet.progress}</span> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">아직 베팅 기록이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
