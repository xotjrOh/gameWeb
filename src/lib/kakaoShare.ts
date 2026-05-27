'use client';

const KAKAO_SDK_SCRIPT_ID = 'kakao-js-sdk';
const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js';

type KakaoSharePayload = {
  objectType: 'text';
  text: string;
  link: {
    mobileWebUrl: string;
    webUrl: string;
  };
  buttonTitle?: string;
};

interface KakaoSdk {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share?: {
    sendDefault: (payload: KakaoSharePayload) => void;
  };
}

type KakaoShareErrorCode =
  | 'browser-unavailable'
  | 'missing-key'
  | 'sdk-load-failed'
  | 'sdk-unavailable'
  | 'send-failed';

export class KakaoShareError extends Error {
  code: KakaoShareErrorCode;

  constructor(code: KakaoShareErrorCode, message: string) {
    super(message);
    this.name = 'KakaoShareError';
    this.code = code;
  }
}

let kakaoSdkPromise: Promise<KakaoSdk> | null = null;

const getKakaoSdk = () =>
  (window as Window & { Kakao?: KakaoSdk }).Kakao ?? null;

const loadKakaoSdk = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new KakaoShareError(
        'browser-unavailable',
        '브라우저에서만 카카오톡 공유를 사용할 수 있습니다.'
      )
    );
  }

  const loadedKakao = getKakaoSdk();
  if (loadedKakao) {
    return Promise.resolve(loadedKakao);
  }

  if (kakaoSdkPromise) {
    return kakaoSdkPromise;
  }

  kakaoSdkPromise = new Promise<KakaoSdk>((resolve, reject) => {
    const resolveIfReady = () => {
      const kakao = getKakaoSdk();
      if (kakao) {
        resolve(kakao);
        return true;
      }
      return false;
    };

    if (resolveIfReady()) {
      return;
    }

    let script = document.getElementById(
      KAKAO_SDK_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = KAKAO_SDK_SCRIPT_ID;
      script.src = KAKAO_SDK_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    script.addEventListener('load', () => {
      if (!resolveIfReady()) {
        reject(
          new KakaoShareError(
            'sdk-unavailable',
            '카카오톡 공유 SDK를 사용할 수 없습니다.'
          )
        );
      }
    });
    script.addEventListener('error', () => {
      reject(
        new KakaoShareError(
          'sdk-load-failed',
          '카카오 SDK를 불러오지 못했습니다.'
        )
      );
    });
  }).catch((error) => {
    kakaoSdkPromise = null;
    throw error;
  });

  return kakaoSdkPromise;
};

const resolveShareUrl = (linkUrl: string) => {
  try {
    return new URL(linkUrl, window.location.origin).toString();
  } catch {
    return window.location.origin;
  }
};

export const shareKakaoText = async ({
  text,
  linkUrl,
}: {
  title: string;
  text: string;
  linkUrl: string;
}) => {
  const javaScriptKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!javaScriptKey) {
    throw new KakaoShareError(
      'missing-key',
      '카카오 JavaScript 키가 설정되지 않았습니다.'
    );
  }

  const kakao = await loadKakaoSdk();
  if (!kakao.isInitialized()) {
    kakao.init(javaScriptKey);
  }
  if (!kakao.Share?.sendDefault) {
    throw new KakaoShareError(
      'sdk-unavailable',
      '카카오톡 공유 SDK를 사용할 수 없습니다.'
    );
  }

  const resolvedUrl = resolveShareUrl(linkUrl);
  try {
    kakao.Share.sendDefault({
      objectType: 'text',
      text,
      link: {
        mobileWebUrl: resolvedUrl,
        webUrl: resolvedUrl,
      },
      buttonTitle: '룰지 읽기',
    });
  } catch (error) {
    throw new KakaoShareError(
      'send-failed',
      error instanceof Error
        ? error.message
        : '카카오톡 공유 요청에 실패했습니다.'
    );
  }
};

export const getKakaoShareErrorMessage = (error: unknown) => {
  if (!(error instanceof KakaoShareError)) {
    return '카카오톡 공유 설정 또는 메시지 길이 제한을 확인해주세요.';
  }

  switch (error.code) {
    case 'missing-key':
      return 'NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY가 설정되지 않았습니다. 카카오 JavaScript 키를 .env.local에 추가해주세요.';
    case 'sdk-load-failed':
      return '카카오 SDK를 불러오지 못했습니다. 네트워크 또는 차단 설정을 확인해주세요.';
    case 'browser-unavailable':
      return '브라우저에서만 카카오톡 공유를 사용할 수 있습니다.';
    case 'sdk-unavailable':
      return '카카오톡 공유 SDK를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
    case 'send-failed':
    default:
      return '카카오톡 공유 설정 또는 메시지 길이 제한을 확인해주세요.';
  }
};
