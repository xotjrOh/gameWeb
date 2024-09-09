'use client';

import Link from 'next/link';
import UserDropdown from "@/components/UserDropdown";
import Hamburger from "@/components/Hamburger";
import { useDispatch } from 'react-redux';
import { useSocket } from '@/components/provider/SocketProvider';
import { setIsLoading } from '@/store/loadingSlice';

export default function Header({ session }) {
  const dispatch = useDispatch();
  const { socket } = useSocket();

  const handleClick = () => {
    socket?.emit('get-room-list');
    dispatch(setIsLoading(false));
    socket.disconnect();
    socket.connect();
  }

  return (
    <div className="flex justify-between items-center p-2 bg-white text-black shadow-md">
      <div className="flex items-center space-x-4">
        <Link href="/" onClick={handleClick} className="z-[9999]">
          <span className="text-xl font-bold cursor-pointer p-2 hover:bg-gray-200 rounded-full">G</span>
        </Link>
        <Hamburger />
      </div>
      <UserDropdown session={session} />
    </div>
  );
}
