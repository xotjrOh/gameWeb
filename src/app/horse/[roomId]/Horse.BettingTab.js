'use client'

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setChip } from '@/store/chipSlice';

export default function BettingTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [timeLeft, setTimeLeft] = useState(0);
  const [horses, setHorses] = useState([]);  // **현재 사용되는 말들을 저장**
  const [bets, setBets] = useState({});  // **각 말에 대한 베팅을 저장**
  const [isBetLocked, setIsBetLocked] = useState(false);  // **베팅이 잠겨있는지 여부**
  const { chip } = useSelector((state) => state.chip);

  useEffect(() => {
    if (socket) {
      // 서버에서 1초마다 보내는 타이머 업데이트를 수신
      socket.on('update-timer', (newTimeLeft) => {
        setTimeLeft(newTimeLeft);
      });

      // 서버에서 현재 라운드에 사용되는 말을 수신
      socket.on('roles-assigned', ({ horses }) => {
        setHorses(horses);
      });

      return () => {
        socket.off('update-timer');
        socket.off('roles-assigned');
      };
    }
  }, [socket, roomId]);

  // **베팅 시 총 칩 수가 초과하지 않도록 제한**
  const handleBetChange = (horse, amount) => {
    const newBets = { ...bets, [horse]: amount };
    const totalBet = Object.values(newBets).reduce((sum, chips) => sum + chips, 0);
    
    // todo : 초과하여 설정은 되나 체크 필요
    if (totalBet <= chip) {
      setBets(newBets);
    }
  };

  // **말에 대한 선택을 처리하는 로직은 제거**
  // 베팅을 진행하는 handleBet 함수
  const handleBet = () => {
    if (isBetLocked || timeLeft === 0) {
      return alert("더이상 베팅할 수 없습니다.");
    }

    if (Object.keys(bets).length > 0) {
      socket.emit('horse-bet', { roomId, bets }, (response) => {
        if (response.success) {
          alert('베팅이 완료되었습니다.');
          dispatch(setChip(response.remainChips));
          setIsBetLocked(true);  // **베팅 완료 후 잠금**
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

        {/* **현재 사용되는 말들을 이용해 화면에 뿌려주기** */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {horses.map((horse) => (
            <div key={horse} className="flex flex-col items-center">
              <label className="font-semibold">{horse}</label>
              <input
                type="range"
                min="0"
                max={chip}  // **총 칩 수를 최대값으로 설정**
                value={bets[horse] || 0}
                onChange={(e) => handleBetChange(horse, parseInt(e.target.value))}
                disabled={isBetLocked || timeLeft === 0}  // **베팅 잠금 또는 시간이 0초 남았을 경우 비활성화**
                className="w-full"
              />
              <p>{bets[horse] || 0} chips</p>  {/* **현재 베팅된 칩 수를 표시** */}
            </div>
          ))}
        </div>

        <button
          onClick={handleBet}
          className={`mt-4 ${isBetLocked || timeLeft === 0 ? 'bg-gray-500' : 'bg-green-500'} text-white py-2 px-4 rounded`}
          disabled={isBetLocked || timeLeft === 0}  // **베팅 잠금 또는 시간이 0초 남았을 경우 비활성화**
        >
          베팅하기
        </button>
      </div>
    </div>
  );
}
