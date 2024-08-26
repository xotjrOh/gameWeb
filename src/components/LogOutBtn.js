'use client';

import { signOut } from 'next-auth/react'

export default function LogOutBtn({ className }) {
  return <button className={className} onClick={() => { signOut() }}>로그아웃</button>
} 