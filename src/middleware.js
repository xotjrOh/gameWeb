import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request) {
  // 토큰을 가져옵니다.
  const session = await getToken({ req: request });
  const { pathname } = request.nextUrl;
  console.log(pathname);

  // 이미 로그인한 상태에서 로그인 페이지로 접근하면 메인 페이지로 리다이렉트
  if (session && pathname.startsWith('/auth/signin')) {
    const redirectUrl = new URL('/', request.url);  // 메인 페이지로 리다이렉트
    return NextResponse.redirect(redirectUrl);  // '/'를 메인 페이지나 원하는 페이지로 설정
  }

  // 요청된 경로가 '/auth/signin'으로 시작하는 경우
  if (
    pathname.startsWith('/auth/signin') || 
    pathname.startsWith('/auth/popup') || 
    pathname.startsWith('/games/horse') 
  ) {
    return NextResponse.next();
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트합니다.
  if (!session && !pathname.startsWith('/auth/signin')) {
    const loginUrl = new URL('/auth/signin', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 인증된 사용자는 요청을 계속 진행합니다.
  return NextResponse.next();
}

// 모든 경로에 대해 미들웨어를 적용하지만, 로그인 경로와 특정 예외 경로는 제외합니다.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|images|api|socket).*)',
  ],
};
