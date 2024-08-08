// components/GameRooms.js
'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import RoomModal from './RoomModal';

const socket = io();

export default function GameRooms({ session }) {
  console.log("gameRooms start");
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      setRooms(data);
    };

    fetchRooms();
    
    console.log("useEffect start");
    fetch('/api/socket');

    socket.on('room-updated', (updatedRooms) => {
      setRooms(updatedRooms);
    });

    return () => {
      console.log("??")
      socket.off('room-updated');
    };
  }, []);

  const createRoom = (roomName, gameType, maxPlayers) => {
    socket.emit('create-room', { roomName, userName: session.user.name, gameType, sessionId: session.user.id, maxPlayers }, (response) => {
      if (!response.success) {
        alert(response.message);
      } else {
        setShowModal(false);
      }
    });
  };

  return (
    <div>
      <h2>Game Rooms</h2>
      <button onClick={() => setShowModal(true)}>Create Room</button>
      <ul>
        {rooms.map((room, index) => (
          <li key={index}>
            {room.roomName} - {room.gameType} - {room.players.length}/{room.maxPlayers}
            <button onClick={() => socket.emit('join-room', { roomName: room.roomName, userName: session.user.name })}>Join</button>
          </li>
        ))}
      </ul>
      {showModal && <RoomModal createRoom={createRoom} />}
    </div>
  );
}
