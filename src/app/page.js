import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Header from '@/components/Header';
import GameRooms from '@/components/GameRooms';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <Header session={session} />
      <GameRooms session={session} />
    </div>
  );
}
