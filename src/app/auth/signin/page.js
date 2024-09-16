'use client';

import { useEffect, useState } from 'react';
import { signIn } from "next-auth/react";
import Image from 'next/image';
import KakaoIcon from '@/components/icon/KakaoIcon';
import GoogleIcon from '@/components/icon/GoogleIcon';
import Link from 'next/link';

export default function SignInPage() {
  const [isKakaoBrowser, setIsKakaoBrowser] = useState(false);

  useEffect(() => {
    // User-Agent에서 'KAKAOTALK' 문자열이 포함되어 있으면 카카오톡 브라우저로 간주
    console.log(navigator);
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('kakaotalk')) {
      setIsKakaoBrowser(true);
    }
  }, []);

  return (
    <div className="relative h-screen">
      <Image 
        src="/images/background-image.avif" 
        alt="Background" 
        fill={true} 
        style={{ objectFit: 'cover' }} 
        priority={true} 
      />

      {/* 룰 설명 버튼 */}
      <div className="absolute top-4 right-4 z-50">
        <Link href="/games/horse" prefetch={false} className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md transition duration-200 hover:bg-blue-700 hover:scale-105 transform border-2 border-blue-700">
          룰 설명 먼저보기
        </Link>
      </div>

      <div className="absolute inset-0 flex flex-col justify-center items-center h-screen bg-black bg-opacity-70">
        <div className="bg-white p-5 pb-8 rounded-xl shadow-md w-72 mb-5 text-center">
          <h1 className="mb-5 text-2xl font-bold text-gray-800">간편로그인</h1>
          <div>
            <button type="button" onClick={() => signIn('kakao', { callbackUrl: '/' })}
            className="py-2 px-4 flex justify-center items-center  bg-yellow-400 hover:bg-yellow-500 focus:ring-yellow-300 focus:ring-offset-yellow-100 text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2  rounded-lg ">
              <KakaoIcon/>
              카카오 로그인
            </button>
          </div>
          <div>
            <button type="button" onClick={() => signIn('google', { callbackUrl: '/' })} disabled={isKakaoBrowser}
              className={`mt-2 py-2 px-4 flex justify-center items-center w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg ${
                isKakaoBrowser 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'  // 비활성화 상태일 때 스타일
                  : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 focus:ring-offset-red-200'  // 활성화 상태일 때 스타일
              }`}
            >
              <GoogleIcon/>
              {isKakaoBrowser ? (
                <span className="text-sm">
                  구글 로그인 지원X <br />
                  <span className="text-xs">카카오톡 브라우저는 거부됨</span>
                </span>
              ) : (
                "구글 로그인"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
