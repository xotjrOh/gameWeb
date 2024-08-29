'use client';

export default function ChipsTab() {
  const players = [
    { name: 'player1', chips: 10 },
    { name: 'player2', chips: 8 },
    { name: 'player3', chips: 17 },
    // ... 다른 플레이어들
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold">칩 개수</h2>
      <ul className="mt-4">
        {players.map((player, index) => (
          <li key={index} className="py-2 border-b">
            {player.name}: {player.chips}개
          </li>
        ))}
      </ul>
    </div>
  );
}