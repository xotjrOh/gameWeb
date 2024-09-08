'use client'

import { useState, useRef, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import useOutsideClick from '@/hooks/useOutsideClick';
import { updateChip, updateIsBetLocked, updateIsRoundStarted } from '@/store/horseSlice';
import { showToast } from '@/store/toastSlice';

function BettingTab({ roomId, socket, session }) {
  console.log("BettingTab 페이지");
  const dispatch = useDispatch();
  const [bets, setBets] = useState({});
  const [showDurationModal, setShowDurationModal] = useState(false);  // **모달 창을 관리하는 상태**
  const [duration, setDuration] = useState(300);  // **사용자가 설정할 라운드 지속 시간**
  const [finishLine, setFinishLine] = useState(9);  // **골인지점 설정 상태**
  const [showSettingsModal, setShowSettingsModal] = useState(false);  // **설정을 위한 모달 창 상태**
  const [showNewGameModal, setShowNewGameModal] = useState(false);  // **새 게임 확인 모달 상태 추가**
  const roundPopupRef = useRef(null);
  const settingPopupRef = useRef(null);
  const newGamePopupRef = useRef(null);  // **새 게임 모달 참조 추가**
  const { horses, statusInfo, isRoundStarted, isTimeover } = useSelector((state) => state.horse.gameData);

  useOutsideClick(roundPopupRef, () => setShowDurationModal(false));
  useOutsideClick(settingPopupRef, () => setShowSettingsModal(false));
  useOutsideClick(newGamePopupRef, () => setShowNewGameModal(false));  // **새 게임 모달 외부 클릭 닫기**

  const handleBetChange = (horse, amount) => {
    const newBets = { ...bets, [horse]: amount };
    const totalBet = Object.values(newBets).reduce((sum, chips) => sum + chips, 0);

    if (totalBet <= (statusInfo?.chips || 0)) {
      setBets(newBets);
    }
  };

  const handleBet = () => {
    if (statusInfo?.isBetLocked || isTimeover) {
      return dispatch(showToast({ message: "더이상 베팅할 수 없습니다.", type: 'error' }));
    }
    if (Object.keys(bets).length > 0) {
      socket.emit('horse-bet', { roomId, bets }, (response) => {
        if (response.success) {
          dispatch(showToast({ message: '베팅이 완료되었습니다.', type: 'success' }));
          dispatch(updateChip(response.remainChips));
          dispatch(updateIsBetLocked(response.isBetLocked));
        } else {
          dispatch(showToast({ message: response.message, type: 'error' }));
        }
      });
    } else {
      dispatch(showToast({ message: '최소 하나의 말에 베팅해주세요.', type: 'error' }));
    }
  };

  const assignRoles = () => {
    if (isRoundStarted) {
      return dispatch(showToast({ message: "라운드가 시작된 후에는 역할을 할당할 수 없습니다.", type: 'error' }));
    }

    socket.emit('horse-assign-roles', { roomId }, (response) => {
      if (!response.success) {
        dispatch(showToast({ message: response.message, type: 'error' }));
      } else {
        dispatch(showToast({ message: "성공적으로 할당이 완료되었습니다.", type: 'success' }));
      }
    });
  };

  const startRound = () => {
    setShowDurationModal(true);  // **모달 창 열기**
  };

  const confirmStartRound = () => {
    socket.emit('horse-start-round', { roomId, duration }, (response) => {
      if (!response.success) {
        dispatch(showToast({ message: response.message, type: 'error' }));
      } else {
        dispatch(showToast({ message: "성공적으로 타이머가 동작했습니다.", type: 'success' }));
        setShowDurationModal(false);  // **모달 창 닫기**
        dispatch(updateIsRoundStarted(true));
      }
    });
  };

  const openSettingsModal = () => {
    if (isRoundStarted) {
      return dispatch(showToast({ message: "라운드가 시작된 후에는 설정을 변경할 수 없습니다.", type: 'error' }));
    }
    setShowSettingsModal(true);  // **설정 모달 창 열기**
  };

  const confirmSettings = () => {
    socket.emit('horse-update-settings', { roomId, finishLine }, (response) => {
      if (!response.success) {
        dispatch(showToast({ message: response.message, type: 'error' }));
      } else {
        dispatch(showToast({ message: "설정이 성공적으로 업데이트되었습니다.", type: 'success' }));
        setShowSettingsModal(false);  // **설정 모달 창 닫기**
      }
    });
  };

  // **새 게임 시작 모달 확인**
  const openNewGameModal = () => {
    setShowNewGameModal(true);  // **새 게임 모달 열기**
  };

  const confirmNewGame = () => {
    socket.emit('horse-new-game', { roomId }, (response) => {
      if (!response.success) {
        dispatch(showToast({ message: response.message, type: 'error' }));
      } else {
        dispatch(showToast({ message: "새 게임이 성공적으로 시작되었습니다.", type: 'success' }));
        socket.emit('horse-get-game-data', { roomId, sessionId : session.user.id }, (response) => {
          if (!response.success) {
            dispatch(showToast({ message: response.message, type: 'error' }));
          }
        });
        setShowNewGameModal(false);  // **새 게임 모달 닫기**
      }
    });
  };

  return (
    <div>
      <div className="space-y-4">
        {/* **설정 버튼** */}
        <div className="flex justify-between">
          <div className="flex">
            <button
              onClick={openSettingsModal}
              className={`bg-blue-500 text-white py-2 px-4 rounded mr-2 ${isRoundStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isRoundStarted} // **라운드 시작 후 비활성화**
            >
              설정
            </button>

            <button
              onClick={assignRoles}
              className={`bg-yellow-500 text-white py-2 px-4 rounded mr-2 ${isRoundStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isRoundStarted} // **라운드 시작 후 비활성화**
            >
              역할 할당
            </button>

            <button
              onClick={startRound}
              className={`bg-red-500 text-white py-2 px-4 rounded mr-2 ${!isTimeover ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isTimeover} // **라운드 시작 후 비활성화**
            >
              라운드 시작
            </button>
          </div>

          {/* **새 게임 버튼 추가** */}
          <button
            onClick={openNewGameModal}
            className="bg-purple-500 text-white py-2 px-4 rounded"
          >
            새 게임
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold">베팅</h2>
          <p className="text-red-500">칩은 리필되지 않으니 아껴서 베팅해주세요. <br/>베팅하기 버튼을 누른 이후에는 수정이 불가합니다.</p>

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
                  disabled={statusInfo?.isBetLocked || isTimeover}
                  className="w-full"
                />
                <p>{bets[horse] || 0} chips</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleBet}
            className={`mt-4 ${statusInfo?.isBetLocked || isTimeover ? 'bg-gray-500' : 'bg-green-500'} text-white py-2 px-4 rounded`}
            disabled={statusInfo?.isBetLocked || isTimeover}
          >
            베팅하기
          </button>
        </div>

      </div>
      {/* **모달 창** */}
      {showDurationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center" ref={roundPopupRef}>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center" ref={settingPopupRef}>
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

      {/* **새 게임 모달 창 추가** */}
      {showNewGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center" ref={newGamePopupRef}>
            <h3 className="text-lg font-bold mb-4">정말 새로 시작하시겠습니까?</h3>
            <button
              onClick={confirmNewGame}
              className="bg-purple-500 text-white py-2 px-4 rounded w-full mb-2"
            >
              확인
            </button>
            <button
              onClick={() => setShowNewGameModal(false)}
              className="bg-gray-500 text-white py-2 px-4 rounded w-full"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(BettingTab);