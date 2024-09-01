'use client'

import { useSocket } from '@/components/provider/SocketProvider';
import { useSelector } from 'react-redux';

export default function LoadingSpinner() {
    const { socket } = useSocket();

    if ( !socket || !socket.connected ) {
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    }

    const { isLoading } = useSelector((state) => state.loading);

    if (!isLoading) return null;

    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }
  