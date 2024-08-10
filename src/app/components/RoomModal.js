// components/RoomModal.js
'use client';

import { useState } from 'react';

export default function RoomModal({ createRoom }) {
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState('rock-paper-scissors');
  const [maxPlayers, setMaxPlayers] = useState(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    createRoom(roomName, gameType, maxPlayers);
  };

  return (
    <div className="modal">
      <h2>Create a Room</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Room Name"
        />
        <select value={gameType} onChange={(e) => setGameType(e.target.value)}>
          <option value="rock-paper-scissors">Rock Paper Scissors</option>
          <option value="horse-racing">Horse Racing</option>
        </select>
        <input
          type="number"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
          placeholder="Max Players"
        />
        <button type="submit">Create</button>
      </form>
    </div>
  );
}
