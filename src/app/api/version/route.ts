import { NextResponse } from 'next/server';
import packageJson from '../../../../package.json';

export async function GET() {
  const serverVersion = packageJson.version || '1.0.0'; // 기본값 설정
  console.log(serverVersion);
  return NextResponse.json({ serverVersion });
}
