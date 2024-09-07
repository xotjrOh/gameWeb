'use client';

import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateVoteHistory, updateIsVoteLocked } from '@/store/horseSlice';

export default function VoteTab({ roomId, socket, session, timeLeft }) {
  const dispatch = useDispatch();
  const [selectedHorse, setSelectedHorse] = useState('');  // 투표한 말
  const { horses, statusInfo, rounds } = useSelector((state) => state.horse.gameData);  // rounds 가져오기

  // 투표 처리
  const handleVote = () => {
    if (statusInfo.isVoteLocked || timeLeft === 0) {
      return alert("더 이상 투표할 수 없습니다.");
    }

    if (selectedHorse) {
      socket.emit('horse-vote', { roomId, session, selectedHorse }, (response) => {
        if (response.success) {
          alert('투표가 완료되었습니다.');
          dispatch(updateVoteHistory(response.voteHistory));  // 개인 라운드 정보 업데이트
          dispatch(updateIsVoteLocked(response.isVoteLocked));  // 투표 잠금
          setSelectedHorse('');  // 선택 초기화
        } else {
          alert(response.message);
        }
      });
    } else {
      alert('말을 선택해주세요.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 타이머 및 투표 */}
      <div className="text-center bg-gray-100 p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold">라운드마다 최다 득표할 것 같은 말에 투표하세요!</h2>
        <p className="text-red-500">맞을 경우 칩이 2개 추가됩니다.</p>
        <p className="text-red-500">투표하기 버튼을 누른 이후에는 수정이 불가합니다.</p>

        <div className="grid grid-cols-2 gap-6 mt-6">
          {horses.map((horse) => (
            <div
              key={horse}
              className={`flex flex-col items-center p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-300 
              ${selectedHorse === horse ? 'border-blue-500 bg-blue-100' : 'bg-white hover:bg-blue-50'}`}  // 선택된 말과 hover 시 배경색 변화
              onClick={() => setSelectedHorse(horse)}  // 선택된 말 업데이트
            >
              <label className={`font-semibold text-lg mb-2 transition-colors duration-300 ${selectedHorse === horse ? 'text-blue-700' : 'text-black'}`}>
                {horse}
              </label>
            </div>
          ))}
        </div>

        <button
          onClick={handleVote}
          className={`mt-6 px-6 py-2 rounded-lg text-white font-semibold ${
            statusInfo.isVoteLocked || timeLeft === 0 ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-600'
          }`}
          disabled={statusInfo.isVoteLocked || timeLeft === 0}
        >
          투표하기
        </button>
      </div>

      {/* 보너스 안내 */}
      {statusInfo.isSolo && (
        <div className="bg-yellow-100 p-4 rounded-lg shadow-md mt-6">
          <p className="text-yellow-800 font-semibold">
            솔로 플레이어는 투표에 성공할 경우 5개의 칩이 추가됩니다!
          </p>
        </div>
      )}

      {/* 투표 내역 표시 */}
      <div className="bg-gray-100 p-4 rounded-lg shadow-md mt-6">
        <h3 className="text-xl font-bold mb-4">내 투표 내역</h3>
        {statusInfo.voteHistory && statusInfo.voteHistory.length > 0 ? (
          <div className="space-y-2">
            {statusInfo.voteHistory.map((vote, index) => {
              const round = rounds?.[index] || [];  // 해당 라운드 데이터
              const votedHorseResult = round.find(r => r.horse === vote);  // 해당 라운드에서 투표한 말의 결과 찾기
              const isSuccessful = votedHorseResult && votedHorseResult.progress === 2;  // 성공 여부 체크

              return (
                <div
                  key={index}
                  className={`flex justify-between items-center p-3 rounded-lg shadow-sm border transition-all duration-300 ${
                    isSuccessful ? 'bg-green-100 border-green-500' : 'bg-white'
                  }`}  // 성공 시 초록 배경과 테두리 추가
                >
                  <span className="font-medium text-lg">Round {index + 1}</span>
                  <span className="text-gray-600">Voted: {vote}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500">아직 투표 기록이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
