// components/RoomModal.js
'use client';

import { useState } from 'react';

export default function RoomModal({ createRoom, closeModal }) {
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState('rock-paper-scissors');
  const [maxPlayers, setMaxPlayers] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    createRoom(roomName, gameType, maxPlayers);
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
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="방 이름"
          className="border p-2 rounded mb-2 w-full"
        />
        <select value={gameType} onChange={(e) => setGameType(e.target.value)} className="border p-2 rounded mb-4 w-full">
          <option value="rps">가위바위보</option>
          <option value="horse">경마게임</option>
        </select>
        <input
          type="number"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
          placeholder="최대 인원"
          className="border p-2 rounded mb-2 w-full"
        />
        <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded w-full">
          방 만들기
        </button>
        {/* {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>} */}
      </div>
    </div>
  );
}
