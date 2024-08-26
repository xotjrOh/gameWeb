'use client';

import { useState, useRef } from 'react';
import LogOutBtn from "@/components/LogOutBtn";
import useOutsideClick from '@/hooks/useOutsideClick';

export default function UserDropdown({ session }) {
  const [userDropdown, setUserDropdown] = useState(false);
  const menuRef = useRef(null);

  const toggleUserDropdown = () => {
    setUserDropdown(!userDropdown);
  };
  const closeDropdowns = () => {
    setUserDropdown(false);
  };

  useOutsideClick(menuRef, closeDropdowns);

  return (
    <div>
      {userDropdown && <div className="fixed inset-0 bg-black opacity-30 z-40"></div>}
      <div ref={menuRef} className="relative z-50">
        <button onClick={toggleUserDropdown} className={`text-black text-lg cursor-pointer p-2 hover:bg-gray-200 rounded yeogieottae-font`}>
          {session.user.name}
        </button>
        {userDropdown && (
          <div className="absolute right-0 bg-white border rounded shadow-lg z-10">
            <ul className="text-left">
              <li className="px-4 py-2 hover:bg-gray-200 cursor-pointer whitespace-nowrap">프로필</li>
              <li className="px-4 py-2 hover:bg-gray-200 cursor-pointer whitespace-nowrap">설정</li>
              <li className="cursor-pointer hover:bg-red-500 hover:text-white whitespace-nowrap">
                <LogOutBtn className="px-4 py-2 w-full h-full" />
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
