import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  if (process.env.SOCKET_DEBUG === '1') {
    console.log('[version-api]', {
      purpose: request.headers.get('x-purpose'),
      watchId: request.headers.get('x-version-watch-id'),
      userAgent: request.headers.get('user-agent'),
    });
  }

  const serverVersion = process.env.SERVER_VERSION || '1.0.0';
  return NextResponse.json({ serverVersion });
}
