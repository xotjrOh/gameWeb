import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import Header from '@/components/header/Header';
import GameRooms from '@/components/GameRooms';
import { Box } from '@mui/material';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const serverVersion = process.env.SERVER_VERSION || '1.0.0';
  console.log('version : ', serverVersion);

  return (
    <Box>
      <Header session={session} />
      <GameRooms session={session} />
    </Box>
  );
}
