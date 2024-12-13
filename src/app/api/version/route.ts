import { NextResponse } from 'next/server';

export async function GET() {
  const serverVersion = process.env.SERVER_VERSION || '1.0.0';
  console.log('version : ', serverVersion);
  return NextResponse.json({ serverVersion });
}
