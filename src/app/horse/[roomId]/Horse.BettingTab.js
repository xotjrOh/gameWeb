'use client';

import { useState, useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateChip, updatePersonalRounds, updateIsBetLocked } from '@/store/horseSlice';
import { showToast } from '@/store/toastSlice';

function BettingTab({ roomId, socket, session }) {
  // 변경 사항:
  // 1. 입력 필드 좌우에 +와 - 버튼을 배치했습니다.
  // 2. 버튼에 롱프레스 기능을 추가하여 길게 누르면 베팅 금액이 빠르게 증가/감소합니다.
  // 3. 기존 주석을 제거하고 변경 사항을 상단에 명시했습니다.

  const dispatch = useDispatch();
  const [bets, setBets] = useState({});
  const { horses, statusInfo, isTimeover } = useSelector((state) => state.horse.gameData);

  // 롱프레스 기능을 위한 상태 및 타이머 변수
  const [pressTimer, setPressTimer] = useState(null);

  useEffect(() => {
    if (socket) {
      const updateBetsAfterRoundEnd = () => {
        setBets({});
      };
      socket.on('round-ended', updateBetsAfterRoundEnd);

      return () => {
        socket.off('round-ended', updateBetsAfterRoundEnd);
      };
    }
  }, [socket?.id]);

  const handleBetChange = (horse, amount) => {
    const sanitizedAmount = isNaN(amount) || amount === '' ? 0 : parseInt(amount);
    const newBets = { ...bets, [horse]: sanitizedAmount };
    const totalBet = Object.values(newBets).reduce((sum, chips) => sum + chips, 0);

    if (totalBet <= (statusInfo?.chips || 0)) {
      setBets(newBets);
    }
  };

  const handleIncrement = (horse) => {
    const currentBet = bets[horse] || 0;
    if (currentBet < (statusInfo?.chips || 0)) {
      handleBetChange(horse, currentBet + 1);
    }
  };

  const handleDecrement = (horse) => {
    const currentBet = bets[horse] || 0;
    if (currentBet > 0) {
      handleBetChange(horse, currentBet - 1);
    }
  };

  const handlePress = (horse, action) => {
    action(horse);
    const timer = setTimeout(() => {
      handlePress(horse, action);
    }, 200); // 200ms마다 증가/감소
    setPressTimer(timer);
  };

  const handleRelease = () => {
    clearTimeout(pressTimer);
    setPressTimer(null);
  };

  const handleBet = () => {
    if (statusInfo.isBetLocked || isTimeover) {
      return dispatch(showToast({ message: '더이상 베팅할 수 없습니다.', type: 'error' }));
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
      <div className="text-center bg-white p-4 md:p-6 rounded-lg shadow-lg">
        <div className="flex justify-center items-baseline">
          <h2 className="text-xl md:text-2xl font-bold text-indigo-600">베팅</h2>
          <p className="text-sm text-gray-500 ml-2">(남은 칩 개수 : {statusInfo?.chips || 0})</p>
        </div>
        <p className="text-red-500 text-sm md:text-base">
          칩은 리필되지 않으니 아껴서 베팅해주세요. <br />
          베팅 후 수정은 불가능합니다.
        </p>

        <div className="grid grid-cols-2 gap-4 md:gap-6 mt-4">
          {horses.map((horse) => (
            <div key={horse} className="flex flex-col items-center bg-indigo-50 p-3 md:p-4 rounded-lg shadow-md">
              <label className="font-semibold text-base md:text-lg mb-2">{horse}</label>
              <div className="flex items-center space-x-2">
                <button
                  onMouseDown={() => handlePress(horse, handleDecrement)}
                  onMouseUp={handleRelease}
                  onMouseLeave={handleRelease}
                  onTouchStart={() => handlePress(horse, handleDecrement)}
                  onTouchEnd={handleRelease}
                  disabled={statusInfo.isBetLocked || isTimeover || (bets[horse] || 0) === 0}
                  className="px-2 py-1 bg-gray-200 rounded-md text-lg font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max={statusInfo?.chips || 0}
                  value={bets[horse] || ''}
                  onChange={(e) => handleBetChange(horse, e.target.value)}
                  disabled={statusInfo.isBetLocked || isTimeover}
                  className="w-16 text-center border border-gray-300 rounded-md"
                  placeholder="0"
                />
                <button
                  onMouseDown={() => handlePress(horse, handleIncrement)}
                  onMouseUp={handleRelease}
                  onMouseLeave={handleRelease}
                  onTouchStart={() => handlePress(horse, handleIncrement)}
                  onTouchEnd={handleRelease}
                  disabled={statusInfo.isBetLocked || isTimeover || (bets[horse] || 0) >= (statusInfo?.chips || 0)}
                  className="px-2 py-1 bg-gray-200 rounded-md text-lg font-bold"
                >
                  +
                </button>
              </div>
              <p className="text-gray-700 text-sm md:text-base mt-2">칩 : {bets[horse] || 0}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleBet}
          className={`mt-4 md:mt-6 px-4 md:px-6 py-2 rounded-lg text-white font-semibold text-sm md:text-base w-full
            ${statusInfo.isBetLocked || isTimeover ? 'bg-gray-500' : 'bg-indigo-500 hover:bg-indigo-600'}`}
          disabled={statusInfo.isBetLocked || isTimeover}
        >
          베팅하기
        </button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-indigo-600">내 베팅 내역</h3>
        {statusInfo.rounds && statusInfo.rounds.length > 0 ? (
          statusInfo.rounds.map((round, roundIndex) => (
            <div key={roundIndex} className="mb-4 md:mb-6">
              <h4 className="text-base md:text-lg font-semibold mb-2">라운드 {roundIndex + 1}</h4>
              <div className="space-y-2">
                {round.map((bet, betIndex) => (
                  <div
                    key={betIndex}
                    className="flex justify-between items-center p-2 md:p-3 bg-indigo-50 rounded-lg shadow-sm border border-gray-300"
                  >
                    <span className="font-medium text-base md:text-lg">{bet.horse}</span>
                    <span className="text-gray-600 text-sm md:text-base">칩 : {bet.chips}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 text-sm md:text-base">아직 베팅 기록이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export default memo(BettingTab);
