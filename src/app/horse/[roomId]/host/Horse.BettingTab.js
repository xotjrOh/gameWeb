'use client';

import { useState, useRef, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateChip, updateIsBetLocked, updateIsRoundStarted } from '@/store/horseSlice';
import { showToast } from '@/store/toastSlice';
import Modal from '@/components/Modal';  // Modal 컴포넌트 가져오기

function BettingTab({ roomId, socket, session }) {
  const dispatch = useDispatch();
  const [bets, setBets] = useState({});
  const [showModal, setShowModal] = useState({ type: null, visible: false });  // 모달 상태
  const [duration, setDuration] = useState(300);  // 라운드 지속 시간
  const [finishLine, setFinishLine] = useState(9);  // 골인 지점
  const { horses = [], statusInfo, isRoundStarted, isTimeover } = useSelector((state) => state.horse.gameData);

  const handleBetChange = (horse, amount) => {
    const newBets = { ...bets, [horse]: amount };
    const totalBet = Object.values(newBets).reduce((sum, chips) => sum + chips, 0);

    if (totalBet <= (statusInfo?.chips || 0)) {
      setBets(newBets);
    }
  };

  const handleBet = () => {
    if (statusInfo?.isBetLocked || isTimeover) {
      return dispatch(showToast({ message: "더 이상 베팅할 수 없습니다.", type: 'error' }));
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
        dispatch(showToast({ message: "성공적으로 역할이 할당되었습니다.", type: 'success' }));
      }
    });
  };

  const startRound = () => {
    setShowModal({ type: 'startRound', visible: true });
  };

  const confirmStartRound = () => {
    socket.emit('horse-start-round', { roomId, duration }, (response) => {
      if (!response.success) {
        dispatch(showToast({ message: response.message, type: 'error' }));
      } else {
        dispatch(showToast({ message: "라운드가 성공적으로 시작되었습니다.", type: 'success' }));
        setShowModal({ type: null, visible: false });
        dispatch(updateIsRoundStarted(true));
      }
    });
  };

  const openSettingsModal = () => {
    if (isRoundStarted) {
      return dispatch(showToast({ message: "라운드가 시작된 후에는 설정을 변경할 수 없습니다.", type: 'error' }));
    }
    setShowModal({ type: 'settings', visible: true });
  };

  const confirmSettings = () => {
    socket.emit('horse-update-settings', { roomId, finishLine }, (response) => {
      if (!response.success) {
        dispatch(showToast({ message: response.message, type: 'error' }));
      } else {
        dispatch(showToast({ message: "설정이 성공적으로 업데이트되었습니다.", type: 'success' }));
        setShowModal({ type: null, visible: false });
      }
    });
  };

  const openNewGameModal = () => {
    setShowModal({ type: 'newGame', visible: true });
  };

  const confirmNewGame = () => {
    socket.emit('horse-new-game', { roomId }, (response) => {
      if (!response.success) {
        dispatch(showToast({ message: response.message, type: 'error' }));
      } else {
        dispatch(showToast({ message: "새 게임이 성공적으로 시작되었습니다.", type: 'success' }));
        // 방 내부 redux값 업데이트 때문
        socket.emit('horse-get-game-data', { roomId, sessionId : session.user.id }, (response) => {
          if (!response.success) {
            dispatch(showToast({ message: response.message, type: 'error' }));
          }
        });
        setShowModal({ type: null, visible: false });
      }
    });
  };

  const openLeaveModal = () => {
    setShowModal({ type: 'leave', visible: true });
  };

  const confirmLeaveRoom = () => {
    socket.emit('leave-room', { roomId, sessionId: session.user.id }, (response) => {
      if (response.success) {
        dispatch(showToast({ message: "방장이 방을 나갔습니다. 방이 종료되었습니다.", type: 'success' }));
        setShowModal({ type: null, visible: false });
        window.location.href = '/';
      } else {
        dispatch(showToast({ message: response.message, type: 'error' }));
      }
    });
  };

  return (
    <div>
      {/* 버튼을 상단에 배치 */}
      <div className="flex justify-between items-center mt-6 mb-4">
        <button
          onClick={openSettingsModal}
          className={`bg-indigo-500 text-white py-2 px-4 text-sm rounded ${isRoundStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isRoundStarted}
        >
          설정
        </button>

        <button
          onClick={assignRoles}
          className={`bg-indigo-500 text-white py-2 px-4 text-sm rounded ${isRoundStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isRoundStarted}
        >
          역할 할당
        </button>

        <button
          onClick={startRound}
          className={`bg-indigo-500 text-white py-2 px-4 text-sm rounded ${!isTimeover ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!isTimeover}
        >
          라운드 시작
        </button>

        <button
          onClick={openNewGameModal}
          className="bg-indigo-500 text-white py-2 px-4 text-sm rounded"
        >
          새 게임
        </button>

        <button
          onClick={openLeaveModal}
          className="text-red-500 text-3xl"
          title="나가기"
        >
          🚪
        </button>
      </div>

      {/* 흰색 container 내부 */}
      <div  className="text-center bg-white p-4 md:p-6 rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-indigo-600">베팅</h2>
          <p className="text-red-500 text-sm">칩은 리필되지 않으니 아껴서 베팅해주세요. <br/>베팅 후 수정은 불가능합니다.</p>

          <div className="grid grid-cols-2 gap-4 mt-4">
            {horses.map((horse) => (
              <div key={horse} className="flex flex-col items-center bg-indigo-50 p-3 md:p-4 rounded-lg shadow-md">
                <label className="font-semibold text-base md:text-lg mb-2">{horse}</label>
                <input
                  type="range"
                  min="0"
                  max={(statusInfo?.chips || 0)}
                  value={bets[horse] || 0}
                  onChange={(e) => handleBetChange(horse, parseInt(e.target.value))}
                  disabled={statusInfo?.isBetLocked || isTimeover}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">칩: {bets[horse] || 0}</p>
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
      </div>

      {/* 모달 컴포넌트 사용 */}
      {showModal.visible && (
        <Modal
          title={
            showModal.type === 'startRound' ? '라운드 지속 시간 설정' :
            showModal.type === 'settings' ? '골인지점 설정' :
            showModal.type === 'newGame' ? '새 게임 시작' : '방 나가기'
          }
          message={
            showModal.type === 'startRound' ? (
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                min="60"
                max="600"
                className="border border-gray-300 p-3 rounded-lg w-full"
              />
            ) : showModal.type === 'settings' ? (
              <input
                type="number"
                value={finishLine}
                onChange={(e) => setFinishLine(parseInt(e.target.value))}
                min="5"
                max="20"
                className="border border-gray-300 p-3 rounded-lg w-full"
              />
            ) : showModal.type === 'newGame' ? '정말 새 게임을 시작하시겠습니까?' : '정말 방을 나가시겠습니까?'
          }
          onConfirm={
            showModal.type === 'startRound' ? confirmStartRound :
            showModal.type === 'settings' ? confirmSettings :
            showModal.type === 'newGame' ? confirmNewGame : confirmLeaveRoom
          }
          onCancel={() => setShowModal({ type: null, visible: false })}
          type={showModal.type === 'leave' ? 'warning' : 'info'}
        />
      )}

    </div>
  );
}

export default memo(BettingTab);
