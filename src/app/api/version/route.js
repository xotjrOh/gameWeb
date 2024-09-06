import { NextResponse } from 'next/server';

export async function GET() {
  const serverVersion = process.env.NEXT_PUBLIC_SERVER_VERSION || '1.00'; // 기본값 설정
  return NextResponse.json({ serverVersion });
}
