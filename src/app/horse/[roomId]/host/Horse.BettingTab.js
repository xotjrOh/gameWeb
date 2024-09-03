'use client'

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setChip } from '@/store/chipSlice';

export default function BettingTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [timeLeft, setTimeLeft] = useState(0);
  const [horses, setHorses] = useState([]);
  const [bets, setBets] = useState({});
  const [isBetLocked, setIsBetLocked] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);  // **모달 창을 관리하는 상태**
  const [duration, setDuration] = useState(300);  // **사용자가 설정할 라운드 지속 시간**
  const [isRoundStarted, setIsRoundStarted] = useState(false);  // **라운드 시작 여부**
  const [finishLine, setFinishLine] = useState(10);  // **골인지점 설정 상태**
  const [showSettingsModal, setShowSettingsModal] = useState(false);  // **설정을 위한 모달 창 상태**
  const { chip } = useSelector((state) => state.chip);

  useEffect(() => {
    if (socket) {
      socket.on('update-timer', (newTimeLeft) => {
        setTimeLeft(newTimeLeft);
      });

      socket.on('roles-assigned', ({ horses }) => {
        setHorses(horses);
      });

      return () => {
        socket.off('update-timer');
        socket.off('roles-assigned');
      };
    }
  }, [socket, roomId]);

  const handleBetChange = (horse, amount) => {
    const newBets = { ...bets, [horse]: amount };
    const totalBet = Object.values(newBets).reduce((sum, chips) => sum + chips, 0);

    if (totalBet <= chip) {
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
          dispatch(setChip(response.remainChips));
          setIsBetLocked(true);
        } else {
          alert(response.message);
        }
      });
    } else {
      alert('최소 하나의 말에 베팅해주세요.');
    }
  };

  const assignRoles = () => {
    if (isRoundStarted) {
      return alert("라운드가 시작된 후에는 역할을 할당할 수 없습니다.");
    }

    socket.emit('horse-assign-roles', { roomId }, (response) => {
      if (!response.success) {
        alert(response.message);
      } else {
        alert("성공적으로 할당이 완료되었습니다.");
      }
    });
  };

  const startRound = () => {
    setShowDurationModal(true);  // **모달 창 열기**
  };

  const confirmStartRound = () => {
    socket.emit('horse-start-round', { roomId, duration, finishLine }, (response) => {
      if (!response.success) {
        alert(response.message);
      } else {
        alert("성공적으로 타이머가 동작했습니다.");
        setShowDurationModal(false);  // **모달 창 닫기**
        setIsRoundStarted(true);  // **라운드 시작됨을 표시**
      }
    });
  };

  const openSettingsModal = () => {
    if (isRoundStarted) {
      return alert("라운드가 시작된 후에는 설정을 변경할 수 없습니다.");
    }
    setShowSettingsModal(true);  // **설정 모달 창 열기**
  };

  const confirmSettings = () => {
    socket.emit('horse-update-settings', { roomId, finishLine }, (response) => {
      if (!response.success) {
        alert(response.message);
      } else {
        alert("설정이 성공적으로 업데이트되었습니다.");
        setShowSettingsModal(false);  // **설정 모달 창 닫기**
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* **설정 버튼** */}
      <button
        onClick={openSettingsModal}
        className="bg-blue-500 text-white py-2 px-4 rounded"
        disabled={isRoundStarted} // **라운드 시작 후 비활성화**
      >
        설정
      </button>

      <button
        onClick={assignRoles}
        className={`bg-yellow-500 text-white py-2 px-4 rounded ${isRoundStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isRoundStarted} // **라운드 시작 후 비활성화**
      >
        역할 할당
      </button>

      <button
        onClick={startRound}
        className={`bg-red-500 text-white py-2 px-4 rounded ${isRoundStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isRoundStarted} // **라운드 시작 후 비활성화**
      >
        라운드 시작
      </button>

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
                max={chip}
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

      {/* **모달 창** */}
      {showDurationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg text-center">
            <h3 className="text-lg font-bold mb-4">라운드 지속 시간 설정</h3>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min="60"
              max="600"
              className="border p-2 rounded mb-4 w-full"
            />
            <button
              onClick={confirmStartRound}
              className="bg-blue-500 text-white py-2 px-4 rounded w-full"
            >
              라운드 시작
            </button>
          </div>
        </div>
      )}

      {/* **설정 모달 창** */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg text-center">
            <h3 className="text-lg font-bold mb-4">골인지점 설정</h3>
            <input
              type="number"
              value={finishLine}
              onChange={(e) => setFinishLine(parseInt(e.target.value))}
              min="5"
              max="20"
              className="border p-2 rounded mb-4 w-full"
            />
            <button
              onClick={confirmSettings}
              className="bg-green-500 text-white py-2 px-4 rounded w-full"
            >
              설정 완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
