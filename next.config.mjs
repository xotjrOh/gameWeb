// import packageJson from './package.json' assert { type: 'json' };

// const serverVersion = packageJson.version || '1.0.0';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // env: {
  //   SERVER_VERSION: serverVersion.toString(), // 클라이언트에서도 사용할 수 있도록 설정
  // },
  reactStrictMode: false,
  images: {
    formats: ['image/webp'],
  },
  async headers() {
    // 이미지 바로 캐싱
    return [
      {
        source: '/images/:all*(jpg|jpeg|png|svg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1년 동안 캐시 유지
          },
        ],
      },
    ];
  },
};

// ES 모듈 형식으로 내보내기
export default nextConfig;
