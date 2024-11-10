import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import Header from '@/components/header/Header';
import GameRooms from '@/components/GameRooms';
import { Box } from '@mui/material';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <Box>
      <Header session={session} />
      <GameRooms session={session} />
    </Box>
  );
}
