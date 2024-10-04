'use client';

import { useSocket } from '@/components/provider/SocketProvider';
import { useSelector } from 'react-redux';
import { Backdrop, CircularProgress } from '@mui/material';

export default function LoadingSpinner() {
  const { socket, isConnected } = useSocket();

  // Redux에서 로딩 상태 가져오기
  const { isLoading } = useSelector((state) => state.loading);

  // 소켓 연결이 안되었거나 로딩 중일 때만 로딩 스피너를 표시
  if (!isConnected || isLoading) {
    return (
      <Backdrop open={true} style={{ zIndex: 9999 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  // 로딩 상태가 아니라면 아무것도 렌더링하지 않음
  return null;
}
