'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconButton, Box, Menu, MenuItem, Backdrop } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

export default function Hamburger() {
  const [anchorEl, setAnchorEl] = useState(null); // 햄버거 메뉴
  const [submenuAnchorEl, setSubmenuAnchorEl] = useState(null); // '게임 소개' 서브메뉴

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSubmenuOpen = (event) => {
    setSubmenuAnchorEl(event.currentTarget);
  };

  const closeMenus = () => {
    setAnchorEl(null);
    setSubmenuAnchorEl(null);
  };

  const handleSubmenuClose = () => {
    setSubmenuAnchorEl(null);
  };

  return (
    <Box>
      {anchorEl && <Backdrop open={Boolean(anchorEl)} sx={{ zIndex: 40 }} />}

      <IconButton onClick={handleMenuOpen} sx={{ fontSize: '1.25rem' }}>
        <MenuIcon />
      </IconButton>

      {/* 햄버거 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenus}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {/* 메뉴 아이템 */}
        <MenuItem
          component={Link}
          href="/rankings"
          onMouseEnter={handleSubmenuClose}
        >
          랭크 순위
        </MenuItem>
        {/* <MenuItem
          component={Link}
          href="/settings"
          onMouseEnter={handleSubmenuClose}
          disabled
        >
          게임 설정
        </MenuItem> */}

        {/* '게임 소개' 메뉴 */}
        <MenuItem onMouseEnter={handleSubmenuOpen}>
          게임 소개
          <ArrowRightIcon />
        </MenuItem>
      </Menu>

      {/* '게임 소개' 서브메뉴 */}
      <Menu
        anchorEl={submenuAnchorEl}
        open={Boolean(submenuAnchorEl)}
        onClose={handleSubmenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          root: {
            sx: {
              pointerEvents: 'none', // 부모 요소가 클릭 이벤트를 차단하지 않도록 설정
            },
          },
          paper: {
            sx: {
              pointerEvents: 'auto',
            },
          },
        }}
      >
        <MenuItem component={Link} href="/games/horse">
          🐎 경마게임
        </MenuItem>
        <MenuItem component={Link} href="/games/shuffle">
          🔀 뒤죽박죽
        </MenuItem>
      </Menu>
    </Box>
  );
}
