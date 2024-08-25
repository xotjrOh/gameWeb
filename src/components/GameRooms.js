'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import useSocket from '@/hooks/useSocket';
import RoomModal from './RoomModal';

export default function GameRooms({ session }) {
  const socket = useSocket(session);
  const [showModal, setShowModal] = useState(false);
  const { rooms } = useSelector((state) => state.room);

  const closeModal = () => setShowModal(false);
  const createRoom = (roomName, gameType, maxPlayers) => {
    socket.emit('create-room', { roomName, userName: session.user.name, gameType, sessionId: session.user.id, maxPlayers }, (response) => {
      if (!response.success) {
        alert(response.message);
      } else {
        closeModal();
      }
    });
  };

  return (
    <div className="flex flex-col items-center p-4 bg-[#eff9ff] yanolza-font min-h-screen">
      {session.user.id == '3624891095' && (
        <button onClick={() => setShowModal(true)} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">
          방 만들기
        </button>
      )}
      <table className="min-w-full text-center">
        <thead>
          <tr className="border-b border-gray-300 bg-[#dff2fd]">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">방 이름</th>
            <th className="px-4 py-2">게임 종류</th>
            <th className="px-4 py-2">상태</th>
            <th className="px-4 py-2">인원</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(rooms).map((room, index) => (
            <tr key={index} className="border-b border-gray-300 hover:bg-gray-200 cursor-pointer" 
                onClick={() => socket.emit('join-room', { roomName: room.roomName, userName: session.user.name })}>
              <td className="px-4 py-2">{index + 1}</td>
              <td className="px-4 py-2">{room.roomName}</td>
              <td className="px-4 py-2">{room.gameType}</td>
              <td className="px-4 py-2">{room.status}</td>
              <td className="px-4 py-2">{room.players.length} / {room.maxPlayers}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && <RoomModal createRoom={createRoom} closeModal={closeModal} />}
    </div>
  );
}
