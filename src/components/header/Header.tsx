'use client';

import Link from 'next/link';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { useSocket } from '@/components/provider/SocketProvider';
import { setIsLoading } from '@/store/loadingSlice';
import { AppBar, Box, Toolbar, IconButton, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { signIn } from 'next-auth/react';
import { Session } from 'next-auth';
import Hamburger from '@/components/Hamburger';
import UserDropdown from '@/components/UserDropdown';
import { usePathname, useSearchParams } from 'next/navigation';

interface HeaderProps {
  session: Session | null;
}

export default function Header({ session }: HeaderProps) {
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = () => {
    socket?.emit('get-room-list');
    dispatch(setIsLoading(false));
    // socket.disconnect();
    // socket.connect();
  };

  const handleSignIn = () => {
    // 현재 페이지의 URL을 생성
    const currentUrl = `${window.location.origin}${pathname}${searchParams?.toString()}`;
    // 로그인 페이지로 이동하며, 현재 URL을 callbackUrl로 전달
    signIn(undefined, { callbackUrl: currentUrl });
  };
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{ backgroundColor: 'background.default', color: 'black' }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* 웹사이트 로고 */}
          <IconButton
            edge="start"
            aria-label="홈 버튼"
            sx={{ mr: 2 }}
            component={Link}
            href="/"
            prefetch={false}
            onClick={handleClick}
          >
            <HomeIcon sx={{ color: 'black' }} />
          </IconButton>

          {/* 햄버거 메뉴 */}
          <Box sx={{ flexGrow: 1 }}>
            <Hamburger />
          </Box>

          {/* 세션이 있을 때: 사용자 드롭다운, 없을 때: 로그인 버튼 */}
          {session ? (
            <UserDropdown session={session} />
          ) : (
            <Button color="inherit" onClick={handleSignIn}>
              로그인
            </Button>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
