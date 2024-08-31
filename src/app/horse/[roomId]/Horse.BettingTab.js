'use client'

import { useState, useEffect } from 'react';
import useSocket from '@/hooks/useSocket';
import MyStatusButton from './Horse.MyStatusButton';

export default function BettingTab({ roomId }) {
  const socket = useSocket();
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedHorses, setSelectedHorses] = useState([]);

  useEffect(() => {
    // 서버에서 현재 타이머 값을 가져옴
    // todo : if socket 필요할지도
    if (socket) {
      // 서버에서 1초마다 보내는 타이머 업데이트를 수신
      socket.on('update-timer', (newTimeLeft) => {
        setTimeLeft(newTimeLeft);
      });

      return () => {
        socket.off('update-timer');
      };
    }
  }, [socket, roomId]);

  const toggleHorseSelection = (horse) => {
    setSelectedHorses((prevSelections) =>
      prevSelections.includes(horse)
        ? prevSelections.filter((h) => h !== horse)
        : [...prevSelections, horse]
    );
  };

  const handleBet = () => {
    if (selectedHorses.length > 0) {
      alert(`You have bet on: ${selectedHorses.join(', ')}`);
      // 베팅 로직 처리
    } else {
      alert('At least one horse must be selected!');
    }
  };

  // todo : 지울예정. 호스트에서만 필요
  // 테스트용 라운드 시작 버튼
  const startRound = () => {
    socket.emit('start-round', { roomId, duration: 300 }); // 5분(300초) 타이머 시작
  };

  return (
    <div className="space-y-4">
      {/* 테스트용 라운드 시작 버튼 */}
      <button
        onClick={startRound}
        className="bg-red-500 text-white py-2 px-4 rounded"
      >
        라운드 시작
      </button>

      {/* 타이머 및 베팅 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">베팅</h2>
        <p className="text-lg">남은 시간: {Math.floor(timeLeft / 60)}:{timeLeft % 60}</p>
        <p className="text-red-500">칩은 리필되지 않으니 아껴서 베팅해주세요</p>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {['A', 'B', 'C', 'D'].map((horse) => (
            <button
              key={horse}
              onClick={() => toggleHorseSelection(horse)}
              className={`p-4 rounded border ${selectedHorses.includes(horse) ? 'bg-green-300' : 'bg-white'}`}
            >
              {horse}
            </button>
          ))}
        </div>

        <button
          onClick={handleBet}
          className="mt-4 bg-green-500 text-white py-2 px-4 rounded"
        >
          베팅하기
        </button>
      </div>

    </div>
  );
}
