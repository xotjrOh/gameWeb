'use client';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';

export default function PopupPage() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');

    if (!provider) window.close();

    // 팝업 창에서 OAuth 인증 시작
    signIn(provider, {
      callbackUrl: `${window.location.origin}/auth/popup/callback`,
    });
  }, []);

  return null;
}
