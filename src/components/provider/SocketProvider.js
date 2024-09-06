'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import { setRooms } from '@/store/roomSlice';

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
        if (socket && socket.connected) {
            return;
        }

        const newSocket = io(process.env.NEXT_PUBLIC_SITE_URL, {
            path : "/api/socket/io",
            addTrailingSlash: false,
            reconnection: true, 		// 자동 재연결 활성화
            reconnectionAttempts: Infinity, // 재연결 시도 횟수
            reconnectionDelay: 1000, // 재연결 시도 간격 (1초)
            forceNew: false,
        });

        newSocket.on('connect', () => {
            console.log("client : connect", newSocket);
            console.log("socket id : ", newSocket.id, newSocket.connected);
            setSocket(newSocket);
        });

        newSocket.on('disconnect', () => {
            console.log("client : disconnect");
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
    
        return () => {
          if (socket) {
            console.log("provider에서 socket disconnect");
            socket.disconnect();
          }
        };
    }, [socket?.id]);
    
    useEffect(() => {
        if (socket) {
            const handleRoomUpdated = (updatedRooms) => {
                console.log("room-updated", updatedRooms);
                dispatch(setRooms(updatedRooms));
            };

            socket.on('room-updated', handleRoomUpdated);
            socket.emit('get-room-list');

            return () => {
                socket.off('room-updated', handleRoomUpdated);
            };
        }
    }, [socket, dispatch]);

    return (
      <SocketContext.Provider value={{socket}}>
        {children}
      </SocketContext.Provider>
    );
};