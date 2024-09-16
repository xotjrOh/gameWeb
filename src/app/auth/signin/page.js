'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import KakaoIcon from '@/components/icon/KakaoIcon';
import GoogleIcon from '@/components/icon/GoogleIcon';
import Link from 'next/link';

export default function SignInPage() {
  const [isKakaoBrowser, setIsKakaoBrowser] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('kakaotalk')) {
      setIsKakaoBrowser(true);
    }
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* 배경 이미지 */}
      <Image
        src="/images/background-image.avif"
        alt="Background"
        fill
        className="object-cover"
        priority
      />

      {/* 어두운 오버레이 */}
      <div className="absolute inset-0 bg-black opacity-70"></div>

      {/* 룰 설명 버튼 */}
      <div className="absolute top-4 right-4 z-50">
        <Link
          href="/games/horse"
          prefetch={false}
          className="py-2 px-4 bg-indigo-600 text-white font-semibold rounded-full shadow-md transition duration-200 hover:bg-indigo-700 hover:scale-105 transform border-2 border-indigo-700"
        >
          룰 설명 보기
        </Link>
      </div>

      {/* 로그인 카드 */}
      <div className="relative z-10 bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg p-8 rounded-2xl shadow-xl w-80 text-center">
        <h1 className="mb-6 text-3xl font-extrabold text-gray-800">간편 로그인</h1>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => signIn('kakao', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center py-3 px-4 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold rounded-full shadow-md transition duration-200"
          >
            <KakaoIcon className="mr-2" />
            카카오 로그인
          </button>
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            disabled={isKakaoBrowser}
            className={`w-full flex items-center justify-center py-3 px-4 rounded-full shadow-md transition duration-200 font-semibold ${
              isKakaoBrowser
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            <GoogleIcon className="mr-2" />
            {isKakaoBrowser ? (
              <span className="text-sm">
                구글 로그인 불가 <br />
                <span className="text-xs">(카카오톡 브라우저 미지원)</span>
              </span>
            ) : (
              '구글 로그인'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
