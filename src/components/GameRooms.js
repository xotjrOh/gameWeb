'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { setRooms } from '@/store/roomSlice';
import { initializeSocket } from '@/store/socketSlice';
// import io from 'socket.io-client';
import RoomModal from './RoomModal';

// const socket = io();

export default function GameRooms({ session }) {
  console.log("gameRooms start");
  const dispatch = useDispatch();
  const { socket, isConnected } = useSelector((state) => state.socket);
  const { rooms } = useSelector((state) => state.room);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    console.log("useEffect start");
    if (!isConnected) {
      console.log("한번만진입");
      dispatch(initializeSocket());
    }
    
    return () => {
      if (isConnected) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (socket) {
      console.log("Socket is initialized");

      socket.on('room-updated', (updatedRooms) => {
        console.log("room updated", updatedRooms);
        dispatch(setRooms(updatedRooms));
      });

      socket.emit('get-room-list');

      // 컴포넌트 언마운트 시 핸들러 제거
      return () => {
        socket.off('room-updated');
      };
    }
  }, [socket]);

  const createRoom = (roomName, gameType, maxPlayers) => {
    socket.emit('create-room', { roomName, userName: session.user.name, gameType, sessionId: session.user.id, maxPlayers }, (response) => {
      if (!response.success) {
        alert(response.message);
      } else {
        setShowModal(false);
        alert("redirect 로직 들어가야할듯");
      }
    });
  };

  return (
    <div>
      <h2>Game Rooms</h2>
      <button onClick={() => setShowModal(true)}>방 만들기</button>
      <ul>
        {Object.values(rooms).map((room, index) => (
          <li key={index}>
            {room.roomName} - {room.gameType} - {room.players.length}/{room.maxPlayers}
            <button onClick={() => socket.emit('join-room', { roomName: room.roomName, userName: session.user.name })}>참가</button>
          </li>
        ))}
      </ul>
      {showModal && <RoomModal createRoom={createRoom} />}
    </div>
  );
}
