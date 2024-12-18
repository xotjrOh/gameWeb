'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch'; // 커스텀 훅
import { io } from 'socket.io-client';
import { setRooms } from '@/store/roomSlice';
import { setIsLoading } from '@/store/loadingSlice';
import { Rooms } from '@/types/room';
import { ClientSocketType } from '@/types/socket';

interface SocketContextType {
  socket: ClientSocketType | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = (): SocketContextType => {
  return useContext(SocketContext);
};

interface SocketProviderProps {
  children: ReactNode;
}

export default function SocketProvider({ children }: SocketProviderProps) {
  const dispatch = useAppDispatch();
  const [socket, setSocket] = useState<ClientSocketType | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // console.log(socket, socket?.id, socket?.connected, isConnected);
  useEffect(() => {
    // socket이 이미 초기화되어 있는지 확인
    if (socket && socket?.connected) {
      return;
    }

    const newSocket: ClientSocketType = io(process.env.NEXT_PUBLIC_SITE_URL, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      // reconnection: true, 		// 자동 재연결 활성화
      // reconnectionAttempts: Infinity, // 재연결 시도 횟수
      // reconnectionDelay: 1000, // 재연결 시도 간격 (1초)
      // forceNew: false,
    });

    newSocket.on('connect', () => {
      console.log('client : conncect');
      setSocket(newSocket);
      setIsConnected(true);
      newSocket.emit('get-room-list'); // 서버 재시작시 방 없애기위함
      dispatch(setIsLoading(false));
    });

    newSocket.on('disconnect', () => {
      console.log('client : disconnect');
      setIsConnected(false);
      dispatch(setIsLoading(true));
      // setSocket(null);
    });

    setSocket(newSocket);

    // todo : disconnect가 문제인지 테스트
    // return async () => {
    return () => {
      if (socket) {
        console.log('provider에서 socket disconnect 테스트 점요');
        // socket.disconnect();
        // const disconnectSocket = async () => {
        //     if (socket && socket.connected) {
        //         return new Promise((resolve) => {
        //             console.log('기존 소켓 연결 해제 중...', socket.id);
        //             socket.disconnect(() => {
        //                 console.log('소켓 연결이 해제되었습니다.');
        //                 resolve();
        //             });
        //         });
        //     }
        // };

        // await disconnectSocket();
      }
    };
  }, [socket?.id, dispatch]);

  useEffect(() => {
    if (socket) {
      const handleRoomUpdated = (updatedRooms: Rooms) => {
        dispatch(setRooms(updatedRooms));
      };

      socket.on('room-updated', handleRoomUpdated);
      socket.emit('get-room-list');

      return () => {
        socket.off('room-updated', handleRoomUpdated);
      };
    }
  }, [socket, socket?.id, dispatch]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
