'use client';

export default function HorsesTab({ roomId, socket, session }) {
  const horses = [
    { name: 'A', position: 3 },
    { name: 'B', position: 5 },
    { name: 'C', position: 1 },
    // ... 다른 경주마들
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold">경주마</h2>
      <ul className="mt-4">
        {horses.map((horse, index) => (
          <li key={index} className="py-2 border-b">
            {horse.name} - 현재 위치: {horse.position}칸
          </li>
        ))}
      </ul>
    </div>
  );
}