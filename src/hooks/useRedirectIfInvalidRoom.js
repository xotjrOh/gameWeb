import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSocket from '@/hooks/useSocket';

const useRedirectIfInvalidRoom = (roomId) => {
  const socket = useSocket();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && socket) {
      socket.emit('check-room', { roomId, sessionId: session.user.id }, (response) => {
        if (!response.isInRoom) {
          alert('잘못된 접근입니다. 대기방으로 이동합니다.');
          router.push('/');
        }
      });
    }
  }, [socket, status, roomId, session, router]);

  return status;
}

export default useRedirectIfInvalidRoom;