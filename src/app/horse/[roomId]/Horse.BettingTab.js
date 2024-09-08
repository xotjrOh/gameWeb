'use client';

import { useState, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateChip, updatePersonalRounds, updateIsBetLocked } from '@/store/horseSlice';
import { showToast } from '@/store/toastSlice';

function BettingTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [bets, setBets] = useState({}); 
  const { horses, statusInfo, isTimeover } = useSelector((state) => state.horse.gameData);

  const handleBetChange = (horse, amount) => {
    const newBets = { ...bets, [horse]: amount };
    const totalBet = Object.values(newBets).reduce((sum, chips) => sum + chips, 0);

     // todo : 초과하여 설정은 되나 체크 필요
    if (totalBet <= (statusInfo?.chips || 0)) {
      setBets(newBets);
    }
  };

  const handleBet = () => {
    if (statusInfo.isBetLocked || isTimeover) {
      return dispatch(showToast({ message: "더이상 베팅할 수 없습니다.", type: 'error' }));
    }

    if (Object.keys(bets).length > 0) {
      socket.emit('horse-bet', { roomId, bets }, (response) => {
        if (response.success) {
          dispatch(showToast({ message: '베팅이 완료되었습니다.', type: 'success' }));
          dispatch(updateChip(response.remainChips));
          dispatch(updatePersonalRounds(response.personalRounds));
          dispatch(updateIsBetLocked(response.isBetLocked));
          setBets({});
        } else {
          dispatch(showToast({ message: response.message, type: 'error' }));
        }
      });
    } else {
      dispatch(showToast({ message: '최소 하나의 말에 베팅해주세요.', type: 'error' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* 타이머 및 베팅 */}
      <div className="text-center bg-gray-100 p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold">베팅</h2>
        <p className="text-red-500">칩은 리필되지 않으니 아껴서 베팅해주세요. <br/>베팅하기 버튼을 누른 이후에는 수정이 불가합니다.</p>

        <div className="grid grid-cols-2 gap-6 mt-6">
          {horses.map((horse) => (
            <div key={horse} className="flex flex-col items-center bg-white p-4 rounded-lg shadow-sm border border-gray-300">
              <label className="font-semibold text-lg mb-2">{horse}</label>
              <input
                type="range"
                min="0"
                max={(statusInfo?.chips || 0)}  
                value={bets[horse] || 0}
                onChange={(e) => handleBetChange(horse, parseInt(e.target.value))}
                disabled={statusInfo.isBetLocked || isTimeover}  
                className="w-full"
              />
              <p className="text-gray-700 mt-2">{bets[horse] || 0} chips</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleBet}
          className={`mt-6 px-6 py-2 rounded-lg text-white font-semibold ${
            statusInfo.isBetLocked || isTimeover ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-600'
          }`}
          disabled={statusInfo.isBetLocked || isTimeover}
        >
          베팅하기
        </button>
      </div>

      {/* 라운드별 경주마 베팅 현황 */}
      <div className="bg-gray-100 p-4 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-4">내 베팅 내역</h3>
        {statusInfo.rounds && statusInfo.rounds.length > 0 ? (
          statusInfo.rounds.map((round, roundIndex) => (
            <div key={roundIndex} className="mb-6">
              <h4 className="text-lg font-semibold mb-2">Round {roundIndex + 1}</h4>
              <div className="space-y-2">
                {round.map((bet, betIndex) => (
                  <div key={betIndex} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm border border-gray-300">
                    <span className="font-medium text-lg">{bet.horse}</span>
                    <span className="text-gray-600">Chips: {bet.chips}</span>
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

export default memo(BettingTab);