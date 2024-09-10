'use client';

import Link from 'next/link';
import UserDropdown from "@/components/UserDropdown";
import Hamburger from "@/components/Hamburger";
import { useDispatch } from 'react-redux';
import { useSocket } from '@/components/provider/SocketProvider';
import { setIsLoading } from '@/store/loadingSlice';
import { signIn } from "next-auth/react";

export default function Header({ session }) {
  const dispatch = useDispatch();
  const { socket } = useSocket();

  const handleClick = () => {
    socket?.emit('get-room-list');
    dispatch(setIsLoading(false));
    // socket.disconnect();
    // socket.connect();
  }

  return (
    <div className="flex justify-between items-center p-2 bg-white text-black shadow-md">
      <div className="flex items-center space-x-4">
        <Link href="/" onClick={handleClick} className="z-[9999]">
          <span className="text-xl font-bold cursor-pointer p-2 hover:bg-gray-200 rounded-full">G</span>
        </Link>
        <Hamburger />
      </div>
      {/* 세션이 없으면 로그인 버튼을, 세션이 있으면 UserDropdown을 표시 */}
      {session ? (
        <UserDropdown session={session} />
      ) : (
        <button 
          onClick={() => signIn()}  // 로그인 버튼 클릭 시 로그인 페이지로 이동
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          로그인
        </button>
      )}
    </div>
  );
}
