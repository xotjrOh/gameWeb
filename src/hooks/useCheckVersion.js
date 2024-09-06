import { useEffect } from 'react';

export default function useCheckVersion(socket) {
  useEffect(() => {
    const checkServerVersion = async () => {
        try {
            const response = await fetch('/api/version');
            const { serverVersion } = await response.json();
            const localVersion = localStorage.getItem('localVersion');     // 로컬 저장된 버전

            console.log("Current local version:", localVersion);
            console.log("Current server version:", serverVersion);
            
            if (!localVersion) {
                localStorage.setItem('localVersion', serverVersion);
            }

            if (parseFloat(localVersion) !== parseFloat(serverVersion)) {
                // 서버 버전이 다를 경우 로비로 리다이렉트
                console.log(`버전이 변경되었습니다: ${localVersion} -> ${serverVersion}. 새로고침합니다.`);
                localStorage.setItem('localVersion', serverVersion);
                window.location.href = '/';  // 새로고침하여 로비로 이동
            }
        } catch (error) {
            console.error('서버 버전 체크 중 에러 발생:', error);
        }
    };

    checkServerVersion();
  }, [socket?.id, socket?.connected]); // 브라우저 방치후 사용 체크
}
