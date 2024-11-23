import { useEffect } from 'react';
import { ClientSocketType } from '@/types/socket';

interface VersionResponse {
  serverVersion: string;
}

export default function useCheckVersion(socket: ClientSocketType | null) {
  useEffect(() => {
    const checkServerVersion = async () => {
      try {
        const response = await fetch('/api/version');
        const { serverVersion }: VersionResponse = await response.json();
        const localVersion = localStorage.getItem('localVersion'); // 로컬 저장된 버전

        if (!localVersion) {
          localStorage.setItem('localVersion', serverVersion);
        }

        if (localVersion !== serverVersion) {
          console.log(
            `버전이 변경되었습니다: ${localVersion} -> ${serverVersion}. 새로고침합니다.`
          );
          const disconnectSocket = async () => {
            return new Promise<void>((resolve) => {
              if (socket && socket.connected) {
                console.log('기존 소켓 연결 해제 중...', socket.id);
                // TODO : 순차적용 해제했는데 에러나는지 확인
                socket.disconnect();
                console.log('소켓 연결이 해제되었습니다.');
              }
              resolve();
            });
          };

          localStorage.setItem('localVersion', serverVersion);
          // TODO : 아래 두개 순서 바꾸었으니 에러 확인
          await disconnectSocket();
          window.location.replace('/');
        }
      } catch (error) {
        console.error('서버 버전 체크 중 에러 발생:', error);
      }
    };

    checkServerVersion();
  }, [socket?.id, socket?.connected]); // 브라우저 방치후 사용 체크
}
