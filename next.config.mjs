/** @type {import('next').NextConfig} */
import { promises as fs } from 'fs';

// 현재 서버 버전 불러오기
let serverVersion = parseFloat(process.env.SERVER_VERSION) || 1.00;

// 서버 버전 증가 함수
const incrementServerVersion = async () => {
  serverVersion = (serverVersion + 0.01).toFixed(2);  // 소수점 2자리까지 버전 증가

  // .env.local 파일의 내용 읽기
  const envLocalPath = '.env.local';
  try {
    const envFileContent = await fs.readFile(envLocalPath, 'utf8');

    // 기존 .env.local 내용 중 SERVER_VERSION 부분을 업데이트
    const updatedEnvFileContent = envFileContent.replace(
      /SERVER_VERSION=.*/,
      `SERVER_VERSION=${serverVersion}`
    );

    // 업데이트된 내용을 다시 .env.local 파일에 저장
    await fs.writeFile(envLocalPath, updatedEnvFileContent, 'utf8');
  } catch (err) {
    console.error('Failed to update server version in .env.local:', err);
  }
};

// 서버가 시작될 때마다 버전 증가
await incrementServerVersion();

const nextConfig = {
  env: {
    NEXT_PUBLIC_SERVER_VERSION: serverVersion, // 클라이언트에서도 사용할 수 있도록 설정
  },
  reactStrictMode: false,
  experimental: {
    appDir: true,
  },
};

export default nextConfig;
