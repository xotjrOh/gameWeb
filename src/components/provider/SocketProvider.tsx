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

const DEBUG = process.env.NEXT_PUBLIC_SOCKET_DEBUG === '1';
const SOCKET_SINGLETON_FIX =
  process.env.NEXT_PUBLIC_SOCKET_SINGLETON_FIX === '1';

type DebuggableClientSocket = ClientSocketType & {
  __dbgAttached?: boolean;
  __providerListenersAttached?: boolean;
};

let providerMountCount = 0;
let providerUnmountCount = 0;
let singletonSocket: ClientSocketType | null = null;
let singletonConnectInvoked = false;

const createClientSocket = (autoConnect: boolean): ClientSocketType => {
  const baseOptions = {
    path: '/api/socket/io',
    addTrailingSlash: false,
  };
  return io(process.env.NEXT_PUBLIC_SITE_URL, {
    ...baseOptions,
    ...(autoConnect ? {} : { autoConnect: false }),
  });
};

const getManagedSocket = (): ClientSocketType => {
  if (!SOCKET_SINGLETON_FIX) {
    return createClientSocket(true);
  }
  if (!singletonSocket) {
    singletonSocket = createClientSocket(false);
  }
  return singletonSocket;
};

export const useSocket = (): SocketContextType => {
  return useContext(SocketContext);
};

interface SocketProviderProps {
  children: ReactNode;
}

function attachSocketDebugListeners(socket: ClientSocketType | null) {
  if (!DEBUG || !socket) {
    return;
  }

  const debuggableSocket = socket as DebuggableClientSocket;
  if (debuggableSocket.__dbgAttached) {
    return;
  }
  debuggableSocket.__dbgAttached = true;

  const getListenerCount = () => socket.listeners('room-updated').length;
  const engine = socket.io.engine;

  socket.on('connect', () => {
    const transport = engine?.transport?.name;
    console.log(
      `[socket-debug][client] connect id=${socket.id} transport=${transport} listeners(room-updated)=${getListenerCount()}`
    );
  });

  socket.on('disconnect', (reason) => {
    console.log(
      `[socket-debug][client] disconnect id=${socket.id} reason=${reason} listeners(room-updated)=${getListenerCount()}`
    );
  });

  socket.on('connect_error', (error) => {
    console.log(
      `[socket-debug][client] connect_error message=${error?.message ?? 'unknown'}`
    );
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`[socket-debug][client] reconnect_attempt #${attempt}`);
  });

  const trackedEvents = new Set(['room-updated', 'room-closed', 'error']);
  socket.onAny((event, ...args) => {
    if (!trackedEvents.has(event as string)) {
      return;
    }
    console.log(
      `[socket-debug][client] event=${event} payload=${JSON.stringify(args[0] ?? {})}`
    );
  });
}

export default function SocketProvider({ children }: SocketProviderProps) {
  const dispatch = useAppDispatch();
  const [socket, setSocket] = useState<ClientSocketType | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    providerMountCount += 1;
    if (DEBUG) {
      console.log(
        `[socket-debug][client] SocketProvider mount #${providerMountCount}`
      );
    }

    return () => {
      providerUnmountCount += 1;
      if (DEBUG) {
        console.log(
          `[socket-debug][client] SocketProvider unmount #${providerUnmountCount}`
        );
      }
    };
  }, []);

  // console.log(socket, socket?.id, socket?.connected, isConnected);
  useEffect(() => {
    // socket이 이미 초기화되어 있는지 확인
    if (socket && socket?.connected) {
      return;
    }

    const nextSocket = getManagedSocket();
    const debuggableSocket = nextSocket as DebuggableClientSocket;
    const shouldAttachProviderListeners =
      !SOCKET_SINGLETON_FIX || !debuggableSocket.__providerListenersAttached;

    if (shouldAttachProviderListeners) {
      nextSocket.on('connect', () => {
        console.log('client : conncect');
        setSocket(nextSocket);
        setIsConnected(true);
        nextSocket.emit('get-room-list'); // 서버 재시작시 방 없애기위함
        dispatch(setIsLoading(false));
      });

      nextSocket.on('disconnect', () => {
        console.log('client : disconnect');
        setIsConnected(false);
        dispatch(setIsLoading(true));
        // setSocket(null);
      });

      if (SOCKET_SINGLETON_FIX) {
        debuggableSocket.__providerListenersAttached = true;
      }
    }

    setSocket(nextSocket);

    if (
      SOCKET_SINGLETON_FIX &&
      !singletonConnectInvoked &&
      !nextSocket.connected
    ) {
      nextSocket.connect();
      singletonConnectInvoked = true;
    }

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

  useEffect(() => {
    if (!socket) {
      return;
    }
    attachSocketDebugListeners(socket);
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
