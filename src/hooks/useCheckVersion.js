import { useEffect } from 'react';

export default function useCheckVersion(socket) {
  useEffect(() => {
    const checkServerVersion = async () => {
      try {
        const response = await fetch('/api/version');
        const { serverVersion } = await response.json();
        const localVersion = localStorage.getItem('localVersion'); // 로컬 저장된 버전

        if (!localVersion) {
          localStorage.setItem('localVersion', serverVersion);
        }

        if (localVersion !== serverVersion) {
          console.log(
            `버전이 변경되었습니다: ${localVersion} -> ${serverVersion}. 새로고침합니다.`
          );
          const disconnectSocket = async () => {
            if (socket && socket.connected) {
              return new Promise((resolve) => {
                console.log('기존 소켓 연결 해제 중...', socket.id);
                socket.disconnect(() => {
                  console.log('소켓 연결이 해제되었습니다.');
                  resolve();
                });
              });
            }
          };

          localStorage.setItem('localVersion', serverVersion);
          window.location.replace('/');

          await disconnectSocket();
        }
      } catch (error) {
        console.error('서버 버전 체크 중 에러 발생:', error);
      }
    };

    checkServerVersion();
  }, [socket?.id, socket?.connected]); // 브라우저 방치후 사용 체크
}
