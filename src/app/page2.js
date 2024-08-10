'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Header from '@/app/components/Header';

const socket = io();

export default function HomePage() {
  console.log("start")
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [gameType, setGameType] = useState('rock-paper-scissors');
  const [choice, setChoice] = useState('');
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const sessionId = '3624891095'; // 예시 세션 ID, 실제 구현에서는 로그인한 사용자 정보에서 가져와야 함

  useEffect(() => {
    console.log("useEffect")
    fetch('/api/socket'); // 서버 측 소켓 초기화를 위한 API 호출

    socket.on('room-updated', (updatedRooms) => {
      setRooms(updatedRooms);
    });

    socket.on('game-update', (gameData) => {
      // 게임 데이터 업데이트
      console.log('Game update:', gameData);
      setGameResult(gameData);
    });

    return () => {
      socket.off('room-updated');
      socket.off('game-update');
    };
  }, []);

  const createRoom = () => {
    if (roomName.trim() !== '' && userName.trim() !== '') {
      socket.emit('create-room', { roomName, userName, gameType, sessionId, maxPlayers }, (response) => {
        if (!response.success) {
          setErrorMessage(response.message);
        } else {
          setRoomName('');
          setErrorMessage('');
          setShowModal(false);
        }
      });
    }
  };

  const joinRoom = (roomName) => {
    if (userName.trim() !== '') {
      socket.emit('join-room', { roomName, userName });
      setCurrentRoom(rooms.find(room => room.roomName === roomName));
    }
  };

  const leaveRoom = () => {
    if (currentRoom && userName) {
      socket.emit('leave-room', { roomName: currentRoom.roomName, userName });
      setCurrentRoom(null);
    }
  };

  const makeChoice = (choice) => {
    if (currentRoom) {
      socket.emit('game-action', { roomName: currentRoom.roomName, userName, choice });
    }
  };

  return (
    <div>
      <Header />
      <div className="flex flex-col items-center p-4">
        <h1 className="text-2xl font-bold mb-4">다양한 게임</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">
          방 만들기
        </button>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        {currentRoom ? (
          <div>
            <h2>방: {currentRoom.roomName}</h2>
            <h3>플레이어:</h3>
            <ul>
              {currentRoom.players.map((player, index) => (
                <li key={index}>{player}</li>
              ))}
            </ul>
            <div>
              <button onClick={() => makeChoice('rock')} className="bg-gray-500 text-white px-4 py-2 rounded mr-2">
                바위
              </button>
              <button onClick={() => makeChoice('paper')} className="bg-gray-500 text-white px-4 py-2 rounded mr-2">
                보
              </button>
              <button onClick={() => makeChoice('scissors')} className="bg-gray-500 text-white px-4 py-2 rounded">
                가위
              </button>
            </div>
            {gameResult && <p>게임 결과: {gameResult}</p>}
            <button onClick={leaveRoom} className="bg-red-500 text-white px-4 py-2 rounded mt-4">
              방 나가기
            </button>
          </div>
        ) : (
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">방 이름</th>
                <th className="px-4 py-2">게임 종류</th>
                <th className="px-4 py-2">상태</th>
                <th className="px-4 py-2">인원</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, index) => (
                <tr key={index} className="bg-gray-100 border-b">
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2">{room.roomName}</td>
                  <td className="px-4 py-2">{room.gameType}</td>
                  <td className="px-4 py-2">{room.players.length < room.maxPlayers ? '대기 중' : '게임 중'}</td>
                  <td className="px-4 py-2">{room.players.length} / {room.maxPlayers}</td>
                  <td>
                    <button onClick={() => joinRoom(room.roomName)} className="bg-green-500 text-white px-4 py-2 rounded">
                      참여하기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">방 만들기</h2>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="사용자 이름"
              className="border p-2 rounded mb-2 w-full"
            />
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="방 이름"
              className="border p-2 rounded mb-2 w-full"
            />
            <select value={gameType} onChange={(e) => setGameType(e.target.value)} className="border p-2 rounded mb-4 w-full">
              <option value="rock-paper-scissors">가위바위보</option>
              <option value="horse-racing">경마게임</option>
            </select>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              placeholder="최대 인원"
              className="border p-2 rounded mb-2 w-full"
            />
            <button onClick={createRoom} className="bg-blue-500 text-white px-4 py-2 rounded w-full">
              방 만들기
            </button>
            {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
