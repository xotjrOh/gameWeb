// components/RoomModal.js
'use client';

import { useState, useRef } from 'react';
import { setIsLoading } from '@/store/loadingSlice';

export default function RoomModal({ closeModal, socket, router, dispatch, session }) {
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState('horse');
  const [maxPlayers, setMaxPlayers] = useState(null);
  const inputRefs = useRef({
    roomName: null,
    gameType: null,
    maxPlayers: null,
  });

  const createRoom = (e) => {
    e.preventDefault();
    dispatch(setIsLoading(true));
    socket.emit('create-room', { roomName, userName: session.user.name, gameType, sessionId: session.user.id, maxPlayers }, (response) => {
      dispatch(setIsLoading(false));
      if (!response.success) {
        alert(response.message);
        inputRefs.current[response.field]?.focus();
      } else {
        router.push(`/${gameType}/${response.roomId}`);
        console.log(`/${gameType}/${response.roomId}`)
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 어두운 배경 */}
      <div className="fixed inset-0 bg-black opacity-50" onClick={closeModal}></div>
      
      {/* 모달 내용 */}
      <div className="bg-white p-6 rounded-lg z-10">
        <h2 className="text-xl font-bold mb-4">방 만들기</h2>
        <input
          type="text"
          ref={(el) => (inputRefs.current.roomName = el)}
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="방 이름"
          className="border p-2 rounded mb-2 w-full"
        />
        <select ref={(el) => (inputRefs.current.gameType = el)} value={gameType} onChange={(e) => setGameType(e.target.value)} className="border p-2 rounded mb-4 w-full">
          {/* <option value="rps">가위바위보</option> */}
          <option value="horse">경마게임</option>
        </select>
        <input
          type="number"
          ref={(el) => (inputRefs.current.maxPlayers = el)}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
          placeholder="최대 인원"
          className="border p-2 rounded mb-2 w-full"
        />
        <button onClick={createRoom} className="bg-blue-500 text-white px-4 py-2 rounded w-full">
          방 만들기
        </button>
      </div>
    </div>
  );
}
