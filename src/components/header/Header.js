'use client';

import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { useSocket } from '@/components/provider/SocketProvider';
import { setIsLoading } from '@/store/loadingSlice';
import { AppBar, Box, Toolbar, IconButton, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { signIn } from "next-auth/react";
import Hamburger from "@/components/Hamburger";
import UserDropdown from "@/components/UserDropdown";

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
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: 'background.default', color: 'black' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* 웹사이트 로고 */}
          <IconButton
            edge="start"
            aria-label="home"
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
            <UserDropdown />
          ) : (
            <Button color="inherit" onClick={() => signIn()}>로그인</Button>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
