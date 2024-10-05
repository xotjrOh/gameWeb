'use client';

import { useState, useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  updateChip,
  updatePersonalRounds,
  updateIsBetLocked,
} from '@/store/horseSlice';
import { useSnackbar } from 'notistack';

function BettingTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [bets, setBets] = useState({});
  const { horses, statusInfo, isTimeover } = useSelector(
    (state) => state.horse.gameData
  );
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

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
    const sanitizedAmount =
      isNaN(amount) || amount === '' ? 0 : parseInt(amount);
    const newBets = { ...bets, [horse]: sanitizedAmount };
    const totalBet = Object.values(newBets).reduce(
      (sum, chips) => sum + chips,
      0
    );

    if (sanitizedAmount < 0) return; // 베팅 금액이 음수가 되지 않도록

    if (totalBet <= (statusInfo?.chips || 0)) {
      setBets(newBets);
    } else {
      enqueueSnackbar('보유한 칩보다 많이 베팅할 수 없습니다.', { variant: 'error' });
    }
  };

  const handleBet = () => {
    if (statusInfo.isBetLocked || isTimeover) {
      return enqueueSnackbar('더이상 베팅할 수 없습니다.', { variant: 'error' });
    }

    if (Object.keys(bets).length > 0) {
      socket.emit('horse-bet', { roomId, bets }, (response) => {
        if (response.success) {
          enqueueSnackbar('베팅이 완료되었습니다.', { variant: 'success' });
          dispatch(updateChip(response.remainChips));
          dispatch(updatePersonalRounds(response.personalRounds));
          dispatch(updateIsBetLocked(response.isBetLocked));
          setBets({});
        } else {
          enqueueSnackbar(response.message, { variant: 'error' });
        }
      });
    } else {
      enqueueSnackbar('최소 하나의 말에 베팅해주세요.', { variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 베팅 섹션 */}
      <div className="text-center bg-white p-4 md:p-6 rounded-lg shadow-lg">
        <div className="flex justify-center items-baseline">
          <h2 className="text-xl md:text-2xl font-bold text-indigo-600">
            베팅
          </h2>
          <p className="text-sm text-gray-500 ml-2">
            (남은 칩 개수 : {statusInfo?.chips || 0})
          </p>
        </div>
        <p className="text-red-500 text-sm md:text-base">
          칩은 리필되지 않으니 아껴서 베팅해주세요. <br />
          베팅 후 수정은 불가능합니다.
        </p>

        {/* 그리드 컬럼을 1로 설정하여 한 줄에 하나씩 표시 */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 mt-4">
          {horses.map((horse) => (
            <div
              key={horse}
              className="flex flex-col items-center bg-indigo-50 p-3 md:p-4 rounded-lg shadow-md"
            >
              <label className="font-semibold text-base md:text-lg mb-2">
                {horse}
              </label>
              {/* 칩 개수 표시를 슬라이더 위로 이동 */}
              <p className="text-gray-700 text-sm md:text-base mb-2">
                베팅 칩 : {bets[horse] || 0}
              </p>
              {/* 슬라이더 */}
              <input
                type="range"
                min="0"
                max={statusInfo?.chips || 0}
                value={bets[horse] || 0}
                onChange={(e) => handleBetChange(horse, e.target.value)}
                disabled={statusInfo.isBetLocked || isTimeover}
                className="w-full h-6 appearance-none bg-gray-200 rounded-full outline-none slider-thumb"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleBet}
          className={`mt-4 md:mt-6 px-4 md:px-6 py-2 rounded-lg text-white font-semibold text-sm md:text-base w-full
                ${
                  statusInfo.isBetLocked || isTimeover
                    ? 'bg-gray-500'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
          disabled={statusInfo.isBetLocked || isTimeover}
        >
          베팅하기
        </button>
      </div>

      {/* 베팅 내역 섹션 */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-indigo-600">
          내 베팅 내역
        </h3>
        {statusInfo.rounds && statusInfo.rounds.length > 0 ? (
          statusInfo.rounds.map((round, roundIndex) => (
            <div key={roundIndex} className="mb-4 md:mb-6">
              <h4 className="text-base md:text-lg font-semibold mb-2">
                라운드 {roundIndex + 1}
              </h4>
              <div className="space-y-2">
                {round.map((bet, betIndex) => (
                  <div
                    key={betIndex}
                    className="flex justify-between items-center p-2 md:p-3 bg-indigo-50 rounded-lg shadow-sm border border-gray-300"
                  >
                    <span className="font-medium text-base md:text-lg">
                      {bet.horse}
                    </span>
                    <span className="text-gray-600 text-sm md:text-base">
                      칩 : {bet.chips}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 text-sm md:text-base">
            아직 베팅 기록이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(BettingTab);
