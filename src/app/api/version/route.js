import { NextResponse } from 'next/server';

export async function GET() {
  const serverVersion = process.env.SERVER_VERSION || '1.0.0'; // 기본값 설정
  return NextResponse.json({ serverVersion });
}
