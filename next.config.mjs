/** @type {import('next').NextConfig} */
const nextConfig = {
    // todo : 나중에 true할거
    reactStrictMode: false,
    experimental: {
        appDir: true,
    },
    // async rewrites() {
    //     return [
    //         {
    //             source: '/horse/:id?access=granted',
    //             destination: '/horse/:id',  // 쿼리 파라미터가 있는 경우 실제 경로로 요청을 전달
    //         },
    //     ];
    // },
};

export default nextConfig;
