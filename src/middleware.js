import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request) {
  // 토큰을 가져옵니다.
  const session = await getToken({ req: request });
  console.log('Session:', session);
  console.log(request.nextUrl);

  // 요청된 경로가 '/auth/signin'으로 시작하는 경우
  if (request.nextUrl.pathname.startsWith('/auth/signin')) {
    return NextResponse.next();
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트합니다.
  if (!session) {
    const loginUrl = new URL('/auth/signin', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 인증된 사용자는 요청을 계속 진행합니다.
  return NextResponse.next();
}

// 모든 경로에 대해 미들웨어를 적용하지만, 로그인 경로는 예외로 설정합니다.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|images|auth|api).*)',
  ],
};
