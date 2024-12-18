import { useEffect } from 'react';
import { Session } from 'next-auth';
import { ClientSocketType } from '@/types/socket';

function useUpdateSocketId(
  socket: ClientSocketType | null,
  session: Session | null,
  roomId: string
) {
  useEffect(() => {
    if (socket?.id && session && roomId) {
      // 페이지 로드 또는 새로고침 시 서버에 socketId 업데이트 요청
      socket.emit('update-socket-id', {
        roomId,
        sessionId: session.user.id,
        newSocketId: socket.id,
      });
    }
  }, [socket?.id, session, roomId]); // socket, session, roomId가 변경될 때마다 실행
}

export default useUpdateSocketId;
