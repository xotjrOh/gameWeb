'use client';

import { useState, useRef } from 'react';
import { setIsLoading } from '@/store/loadingSlice';
import { showToast } from '@/store/toastSlice';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelSelect from './FloatingLabelSelect';

// RoomModal 컴포넌트
export default function RoomModal({ closeModal, socket, router, dispatch, session }) {
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState('horse');
  const [maxPlayers, setMaxPlayers] = useState('');
  // 각각의 ref 정의
  const roomNameRef = useRef(null);
  const gameTypeRef = useRef(null);
  const maxPlayersRef = useRef(null);

  const createRoom = (e) => {
    e.preventDefault();

    if (socket && socket.connected && socket.id) {
      dispatch(setIsLoading(true));
      socket?.emit('create-room', { roomName, userName: session.user.name, gameType, sessionId: session.user.id, maxPlayers: parseInt(maxPlayers) }, (response) => {
        if (!response.success) {
          dispatch(showToast({ message: response.message, type: 'error' }));
          if (response.field === 'roomName') {
            roomNameRef.current?.focus();
          } else if (response.field === 'gameType') {
            gameTypeRef.current?.focus();
          } else if (response.field === 'maxPlayers') {
            maxPlayersRef.current?.focus();
          }
        } else {
          router.replace(`/${gameType}/${response.roomId}/host`);
        }
        dispatch(setIsLoading(false));
      });
    } else {
      dispatch(showToast({ message: '소켓 연결 대기 중입니다.', type: 'warning' }));
    }
  };

  // 숫자가 아닌 문자는 입력되지 않도록 처리
  const handleMaxPlayersChange = (e) => {
    const { value } = e.target;
    const rNumericString = /^\d*$/;
    
    if (rNumericString.test(value)) {
      setMaxPlayers(value);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 어두운 배경 */}
      <div className="fixed inset-0 bg-black opacity-50" onClick={closeModal}></div>
      
      {/* 모달 내용 */}
      <div className="bg-white p-6 rounded-lg shadow-lg z-10 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-indigo-600">방 만들기</h2>

        {/* 방 이름 입력 */}
        <FloatingLabelInput
          label="방 이름"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          inputRef={roomNameRef}
        />

        <FloatingLabelSelect
          label="게임 종류"
          value={gameType}
          onChange={(e) => setGameType(e.target.value)}
          selectRef={gameTypeRef}  // **ref 추가**
          options={[
            { value: 'horse', label: '🏇경마게임' },
          ]}
        />

        {/* 최대 인원 입력 / number type은 오작동으로 사용안함 */}
        <FloatingLabelInput
          label="최대 인원"
          type="text"
          value={maxPlayers}
          onChange={handleMaxPlayersChange}
          inputRef={maxPlayersRef}
        />

        {/* 방 만들기 버튼 */}
        <button onClick={createRoom} className="bg-indigo-500 text-white px-4 py-2 rounded w-full transition-transform duration-300 hover:scale-105">
          방 만들기
        </button>
      </div>
    </div>
  );
}
