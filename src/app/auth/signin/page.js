'use client';

import { signIn } from "next-auth/react";
import './page.css'; // CSS 파일 임포트

export default function SignInPage() {

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-black bg-opacity-70">
      <div className="bg-white p-5 pb-8 rounded-xl shadow-md w-72 mb-5 text-center">
        <h1 className="mb-5 text-2xl font-bold text-gray-800">간편로그인</h1>
        <div>
          <button type="button" onClick={() => signIn('kakao', { callbackUrl: '/' })}
           className="py-2 px-4 flex justify-center items-center  bg-yellow-400 hover:bg-yellow-500 focus:ring-yellow-300 focus:ring-offset-yellow-100 text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2  rounded-lg ">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
            </svg>
            카카오 로그인
          </button>
        </div>
        <div>
          <button type="button" onClick={() => signIn('google', { callbackUrl: '/' })}
           className="mt-2 py-2 px-4 flex justify-center items-center  bg-red-600 hover:bg-red-700 focus:ring-red-500 focus:ring-offset-red-200 text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2  rounded-lg ">
            <svg width="20" height="20" fill="currentColor" className="mr-2" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg">
                <path d="M896 786h725q12 67 12 128 0 217-91 387.5t-259.5 266.5-386.5 96q-157 0-299-60.5t-245-163.5-163.5-245-60.5-299 60.5-299 163.5-245 245-163.5 299-60.5q300 0 515 201l-209 201q-123-119-306-119-129 0-238.5 65t-173.5 176.5-64 243.5 64 243.5 173.5 176.5 238.5 65q87 0 160-24t120-60 82-82 51.5-87 22.5-78h-436v-264z">
                </path>
            </svg>
            구글 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
