/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        appDir: true,
    },
    async rewrites() {
        return [
            {
                source: '/horse/:id?access=granted',
                destination: '/horse/:id',  // 쿼리 파라미터가 있는 경우 실제 경로로 요청을 전달
            },
        ];
    },
};

export default nextConfig;
