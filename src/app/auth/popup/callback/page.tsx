'use client';

import { useEffect } from 'react';
import { getSession } from 'next-auth/react';

export default function PopupCallbackPage() {
  useEffect(() => {
    // 세션이 업데이트되었음을 확인하고 메인 창으로 메시지 전송
    getSession().then((session) => {
      if (session) {
        // 인증 성공
        window.opener.postMessage('oauth:success', window.location.origin);
      } else {
        // 인증 실패
        window.opener.postMessage('oauth:error', window.location.origin);
      }
      window.close(); // 팝업 창 닫기
    });
  }, []);

  return null;
}
