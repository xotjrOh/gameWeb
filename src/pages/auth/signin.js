'use client';

import { getProviders, signIn } from "next-auth/react";
import './signin.css'; // CSS 파일 임포트

export default function SignIn({ providers }) {

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-black bg-opacity-70">
      <div className="bg-white p-5 pb-8 rounded-xl shadow-md w-72 mb-5 text-center">
        <h1 className="mb-5 text-2xl font-bold text-gray-800">간편로그인</h1>
        <div className="flex justify-center gap-5">
          {Object.values(providers).map((provider) => (
            <button 
              key={provider.name} 
              onClick={() => signIn(provider.id, { callbackUrl: '/' })} 
              className="flex items-center justify-center w-12 h-12 rounded-full bg-transparent border-none cursor-pointer transition-transform transform hover:scale-110"
            >
              <img
                src={`/images/${provider.id}_logo.png`}
                alt={`${provider.name} logo`}
                className="w-10 h-10"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const providers = await getProviders();
  return {
    props: { providers },
  };
}
