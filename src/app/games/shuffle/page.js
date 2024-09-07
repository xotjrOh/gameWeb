'use client';

import { useRouter } from 'next/navigation';  // router를 사용하기 위한 import
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';

export default function ShuffleGame() {
  const { data: session, status } = useSession();
  const router = useRouter();  // router 인스턴스 생성

  const handleGoHome = () => {
    router.push('/');  // 홈으로 이동
  };

  return (
    <>
        <Header session={session} />
        <div className="flex flex-col items-center justify-center h-screen bg-blue-50">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4 animate-bounce">
            아직 게임이 준비되지 않았습니다.
        </h1>
        <p className="text-lg text-gray-600 mb-6">
            개발 중입니다! 조금만 기다려 주세요. 🙏
        </p>
        <div className="flex items-center space-x-4">
            <div className="p-2 bg-yellow-300 rounded-full animate-spin-slow">
            🚧
            </div>
            <p className="text-sm text-gray-600">
            재미있는 게임이 곧 준비됩니다!
            </p>
        </div>
        <div className="mt-10">
            <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-yellow-400 text-gray-800 rounded-full shadow-lg hover:bg-yellow-500 transform transition-transform duration-500 ease-in-out hover:rotate-12 hover:scale-110"
            style={{ fontSize: '18px' }} // 글자 크기는 고정
            >
            홈으로 돌아가기
            </button>
        </div>
        </div>
    </>
  );
}
