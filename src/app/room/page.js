'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Header from "@/components/Header";

// const socket = io(); // 클라이언트에서 서버 URL을 자동으로 감지하도록 설정

export default function Page() {

  // const [roomName, setRoomName] = useState('');
  // const [rooms, setRooms] = useState([]);

  // useEffect(() => {
  //   fetch('/api/socket'); // 서버 측 소켓 초기화를 위한 API 호출

  //   socket.on('room-created', (roomName) => {
  //     setRooms((prevRooms) => [...prevRooms, { name: roomName, status: '대기 중', players: 1, createdTime: new Date().toLocaleString() }]);
  //   });

  //   socket.on('user-joined', (roomName) => {
  //     console.log(`User joined room ${roomName}`);
  //   });

  //   return () => {
  //     socket.off('room-created');
  //     socket.off('user-joined');
  //   };
  // }, []);

  // const createRoom = () => {
  //   if (roomName.trim() !== '') {
  //     socket.emit('create-room', roomName);
  //     setRoomName('');
  //   }
  // };

  // const joinRoom = (roomName) => {
  //   socket.emit('join-room', roomName);
  // };

  return (
    <div>
      <Header/>
      {/*<div className="flex flex-col items-center p-4">
        <h1 className="text-2xl font-bold mb-4">티츄 비</h1>
        <p className="text-center mb-4">
          3레벨 이하 는 정규전(R 빨은 방)에 참여할 수 없습니다.
          비정규 방에서 1-2 게임하면 3레벨 됩니다. R 없는 방에 참여하거나,
          방생성에서 정규전 체크를 풀고 만들면 됩니다.
        </p>
        <div className="flex justify-center items-center mb-4">
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="방 이름"
            className="border p-2 rounded mr-2"
          />
          <button onClick={createRoom} className="bg-blue-500 text-white px-4 py-2 rounded">
            새로운 방
          </button>
        </div>
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">T</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2">인원</th>
              <th className="px-4 py-2">생성시간</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room, index) => (
              <tr key={index} className="bg-gray-100 border-b">
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2">{room.name}</td>
                <td className="px-4 py-2">{room.status}</td>
                <td className="px-4 py-2">{room.players}</td>
                <td className="px-4 py-2">{room.createdTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> */}
    </div>
  );
}
