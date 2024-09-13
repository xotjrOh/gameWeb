'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
// import useOutsideClick from '@/hooks/안되는파일'
import useOutsideClick from '@/hooks/useOutsideClick';

export default function Hamburger() {
  const [hamburgerDropdown, setHamburgerDropdown] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleHamburgerDropdown = () => {
    setHamburgerDropdown(!hamburgerDropdown);
  };
  const handleMouseLeave = (e) => {
    const anotherMenu = e.relatedTarget.classList.contains('menu');
    if (anotherMenu) {
      setIsSubmenuOpen(false);
    }
  };
  const closeDropdowns = () => {
    setHamburgerDropdown(false);
    setIsSubmenuOpen(false);
  };

  useOutsideClick(menuRef, closeDropdowns);

  return (
    <div>
      {hamburgerDropdown && <div className="fixed inset-0 bg-black opacity-30 z-40"></div>}
      <div ref={menuRef} className="relative z-50">
        <button onClick={toggleHamburgerDropdown} className="text-lg cursor-pointer p-2 hover:bg-gray-200 rounded-full">
          ☰
        </button>
        {hamburgerDropdown && (
          <div className="absolute w-48 bg-white border rounded shadow-lg">
            <Link href="/rankings" prefetch={false}>
              <span className="menu block px-4 py-2 text-black hover:bg-gray-100">랭크 순위</span>
            </Link>
            <Link href="/settings" prefetch={false} onClick={(e) => e.preventDefault()}>
              <span className="menu block px-4 py-2 text-black hover:bg-gray-100 cursor-not-allowed">게임 설정</span>
            </Link>
            <div className="relative">
              <button
                onMouseEnter={() => setIsSubmenuOpen(true)}
                onMouseLeave={handleMouseLeave}
                className="menu block px-4 py-2 text-black hover:bg-gray-100 w-full text-left"
              >
                게임 소개
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  ▶
                </span>
              </button>
              {isSubmenuOpen && (
                <div className="absolute top-0 left-full mt-0 w-48 bg-white border rounded shadow-lg">
                  <Link href="/games/horse" prefetch={false}>
                    <span className="block px-4 py-2 text-black hover:bg-gray-100">🐎 경마게임</span>
                  </Link>
                  <Link href="/games/shuffle" prefetch={false}>
                    <span className="block px-4 py-2 text-black hover:bg-gray-100">🔀 뒤죽박죽</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
