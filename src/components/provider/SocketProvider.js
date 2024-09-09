'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import { setRooms } from '@/store/roomSlice';
import { setIsLoading } from '@/store/loadingSlice';

const SocketContext = createContext({
    socket: null,
});

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({children}) => {
    const dispatch = useDispatch();
    const [socket, setSocket] = useState(null);
  
    useEffect(() => {
        // socket이 이미 초기화되어 있는지 확인
        if (socket && socket?.connected) {
            return;
        }

        const newSocket = io(process.env.NEXT_PUBLIC_SITE_URL, {
            path : "/api/socket/io",
            addTrailingSlash: false,
            // reconnection: true, 		// 자동 재연결 활성화
            // reconnectionAttempts: Infinity, // 재연결 시도 횟수
            // reconnectionDelay: 1000, // 재연결 시도 간격 (1초)
            // forceNew: false,
        });

        newSocket.on('connect', () => {
            setSocket(newSocket);
            newSocket.emit("get-room-list"); // 서버 재시작시 방 없애기위함
            dispatch(setIsLoading(false))
        });

        newSocket.on('disconnect', () => {
            console.log("client : disconnect");
            dispatch(setIsLoading(true))
            // setSocket(null);
        });

        newSocket.on('reconnect', (attempt) => {
            console.log(`client : reconnect (${attempt} attempts)`);
        });
    
        newSocket.on('reconnect_failed', () => {
            console.log('client : reconnect_failed');
        });

        newSocket.on("error", (err) => {
            console.log("client : error");
            console.error(err);
        })

        setSocket(newSocket);
    
        return async () => {
          if (socket) {
            console.log("provider에서 socket disconnect");
            // socket.disconnect();
            const disconnectSocket = async () => {
                if (socket && socket.connected) {
                    return new Promise((resolve) => {
                        console.log('기존 소켓 연결 해제 중...', socket.id);
                        socket.disconnect(() => {
                            console.log('소켓 연결이 해제되었습니다.');
                            resolve();
                        });
                    });
                }
            };

            await disconnectSocket();
          }
        };
    }, [socket?.id, dispatch]);
    
    useEffect(() => {
        if (socket) {
            const handleRoomUpdated = (updatedRooms) => {
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
      <SocketContext.Provider value={{socket}}>
        {children}
      </SocketContext.Provider>
    );
};