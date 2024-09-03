import { useEffect } from 'react';

function useUpdateSocketId(socket, session, roomId) {
  useEffect(() => {
    console.log("hook 변화감지 ", socket?.id);
    if (socket && session && roomId) {
        console.log("내부진입", session);
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