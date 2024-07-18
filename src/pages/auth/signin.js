'use client';

import { getProviders, signIn } from "next-auth/react";
import './signin.css'; // 일반 CSS 파일 임포트

export default function SignIn({ providers }) {
  return (
    <div className="container">
      <div className="card">
        <h1 className="title">간편로그인</h1>
        <div className="providers">
          {Object.values(providers).map((provider) => (
            <button 
              key={provider.name} 
              onClick={() => signIn(provider.id, { callbackUrl: '/' })} 
              className="button"
            >
              <img
                src={`/images/${provider.id}_logo.png`}
                alt={`${provider.name} logo`}
                className="icon"
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
