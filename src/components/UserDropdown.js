'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { setIsLoading } from '@/store/loadingSlice';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Backdrop,
  ListItemIcon,
} from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

export default function UserDropdown({ session }) {
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState(null); // 사용자 드롭다운 상태

  // 사용자 메뉴 열기/닫기
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = () => {
    dispatch(setIsLoading(true));
    signOut().finally(() => {
      dispatch(setIsLoading(false));
    });
  };

  return (
    <Box>
      {anchorEl && <Backdrop open={Boolean(anchorEl)} sx={{ zIndex: 40 }} />}

      <IconButton
        size="large"
        edge="end"
        aria-label="사용자 계정을 관리하는 버튼"
        aria-controls="menu-appbar"
        aria-haspopup="true"
        onClick={handleMenuOpen}
        color="inherit"
      >
        <AccountCircle />
      </IconButton>

      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {/* <MenuItem onClick={handleMenuClose}>프로필</MenuItem>
        <MenuItem onClick={handleMenuClose}>내 계정</MenuItem> */}
        <MenuItem
          onClick={handleSignOut}
          sx={{
            '&:hover': {
              backgroundColor: 'red', // 호버 시 붉은색 배경
              color: 'white', // 텍스트 색상 변경
            },
          }}
        >
          <ListItemIcon>
            <ExitToAppIcon sx={{ color: 'inherit' }} /> {/* 나가는 문 아이콘 */}
          </ListItemIcon>
          로그아웃
        </MenuItem>
      </Menu>
    </Box>
  );
}
