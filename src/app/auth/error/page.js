'use client';

import { signIn } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ErrorPage() {
  const router = useRouter();
  const { error } = router.query;

  useEffect(() => {
    console.log("OAuth Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-red-50">
      <h1 className="text-3xl font-bold text-red-500">로그인 에러</h1>
      <p className="text-red-400 mt-2">로그인 중 오류가 발생했습니다: {error}</p>
      <button
        onClick={() => signIn()}
        className="mt-5 px-4 py-2 bg-blue-500 text-white rounded"
      >
        다시 시도하기
      </button>
    </div>
  );
}
