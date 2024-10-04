'use client';

import { useState, useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateVoteHistory, updateIsVoteLocked } from '@/store/horseSlice';
import { useSnackbar } from 'notistack';

function VoteTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [selectedHorse, setSelectedHorse] = useState('');
  const { horses, statusInfo, rounds, isTimeover } = useSelector((state) => state.horse.gameData);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (socket) {
      // 'round-ended' 이벤트를 수신하여 칩 개수 업데이트
      const updateVoteAfterRoundEnd = () => {
        setSelectedHorse('');
      };
      socket.on('round-ended', updateVoteAfterRoundEnd);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        socket.off('round-ended', updateVoteAfterRoundEnd);
      };
    }
  }, [socket?.id]);

  // 투표 처리
  const handleVote = () => {
    if (statusInfo.isVoteLocked || isTimeover) {
      return enqueueSnackbar("더 이상 투표할 수 없습니다.", { variant: 'error' });
    }

    if (selectedHorse) {
      socket.emit('horse-vote', { roomId, session, selectedHorse }, (response) => {
        if (response.success) {
          enqueueSnackbar('투표가 완료되었습니다.', { variant: 'success' });
          dispatch(updateVoteHistory(response.voteHistory));  // 개인 라운드 정보 업데이트
          dispatch(updateIsVoteLocked(response.isVoteLocked));  // 투표 잠금
          setSelectedHorse('');  // 선택 초기화
        } else {
          enqueueSnackbar(response.message, { variant: 'error' });
        }
      });
    } else {
      enqueueSnackbar('말을 선택해주세요.', { variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 타이머 및 투표 */}
      <div className="text-center bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-lg md:text-xl font-bold text-indigo-600">최다 득표할 것 같은 말을 선택하세요!</h2>
        <p className="text-red-500 text-sm md:text-base">예측 성공시 칩이 2개 추가됩니다.</p>

        <div className="grid grid-cols-2 gap-4 md:gap-6 mt-4">
          {horses.map((horse) => (
            <div
              key={horse}
              className={`flex flex-col items-center p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-300 
              ${selectedHorse === horse ? 'border-indigo-500 bg-indigo-100' : 'bg-white hover:bg-indigo-50'}`}
              onClick={() => setSelectedHorse(horse)}
            >
              <label className={`font-semibold text-lg transition-colors duration-300 ${selectedHorse === horse ? 'text-indigo-700' : 'text-gray-800'}`}>
                {horse}
              </label>
            </div>
          ))}
        </div>

        <button
          onClick={handleVote}
          className={`mt-4 px-6 py-2 rounded-lg text-white font-semibold w-full ${
            statusInfo.isVoteLocked || isTimeover ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-600'}`}
          disabled={statusInfo.isVoteLocked || isTimeover}
        >
          투표하기
        </button>
      </div>

      {/* 보너스 안내 */}
      {statusInfo.isSolo && (
        <div className="bg-green-50 p-3 rounded-lg shadow-md mt-4">
          <p className="text-green-800 font-semibold text-sm md:text-base">
            솔로 플레이어는 투표에 성공할 경우 5개의 칩이 추가됩니다!
          </p>
        </div>
      )}

      {/* 투표 내역 표시 */}
      <div className="bg-white p-4 rounded-lg shadow-lg mt-6">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-indigo-600">내 투표 내역</h3>
        {statusInfo.voteHistory && statusInfo.voteHistory.length > 0 ? (
          <div className="space-y-2">
            {statusInfo.voteHistory.map((vote, index) => {
              const round = rounds?.[index] || [];
              const votedHorseResult = round.find(r => r.horse === vote);
              const isSuccessful = votedHorseResult && votedHorseResult.progress === 2;

              return (
                <div
                  key={index}
                  className={`flex justify-between items-center p-2 md:p-3 rounded-lg shadow-sm border transition-all duration-300 ${
                    isSuccessful ? 'bg-green-100 border-green-500' : 'bg-white'}`}
                >
                  <span className="font-medium text-base">라운드 {index + 1}</span>
                  <span className="text-gray-600 text-sm">예측 : {vote}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-sm">아직 투표 기록이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export default memo(VoteTab);
