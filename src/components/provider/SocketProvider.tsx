'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

interface VersionResponse {
  serverVersion: string;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

const DEBUG = process.env.NEXT_PUBLIC_SOCKET_DEBUG === '1';
const SOCKET_SINGLETON_FIX =
  process.env.NEXT_PUBLIC_SOCKET_SINGLETON_FIX === '1';
const SOCKET_VERSION_ENFORCE =
  process.env.NEXT_PUBLIC_SOCKET_VERSION_ENFORCE === '1';
const CLIENT_APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  process.env.NEXT_PUBLIC_SITE_VERSION ??
  'dev';

type DebuggableClientSocket = ClientSocketType & {
  __dbgAttached?: boolean;
  __providerListenersAttached?: boolean;
};

const INITIAL_SOCKET_VERSION = SOCKET_VERSION_ENFORCE
  ? (process.env.NEXT_PUBLIC_APP_VERSION ?? null)
  : CLIENT_APP_VERSION;

let providerMountCount = 0;
let providerUnmountCount = 0;
let singletonSocket: ClientSocketType | null = null;
let singletonConnectInvoked = false;
let singletonSocketVersion: string | null = INITIAL_SOCKET_VERSION;

const createClientSocket = (
  autoConnect: boolean,
  version: string
): ClientSocketType => {
  const baseOptions = {
    path: '/api/socket/io',
    addTrailingSlash: false,
  };
  const auth =
    SOCKET_VERSION_ENFORCE && version
      ? {
          ver: version,
        }
      : undefined;
  return io(process.env.NEXT_PUBLIC_SITE_URL, {
    ...baseOptions,
    ...(autoConnect ? {} : { autoConnect: false }),
    ...(auth ? { auth } : {}),
  });
};

const getManagedSocket = (version: string): ClientSocketType => {
  if (!SOCKET_SINGLETON_FIX) {
    return createClientSocket(true, version);
  }
  if (!singletonSocket || singletonSocketVersion !== version) {
    if (singletonSocket) {
      singletonSocket.removeAllListeners();
      singletonSocket.disconnect();
    }
    singletonSocket = createClientSocket(false, version);
    singletonConnectInvoked = false;
    singletonSocketVersion = version;
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
  const [socketVersion, setSocketVersion] = useState<string | null>(
    INITIAL_SOCKET_VERSION
  );
  const socketRef = useRef<ClientSocketType | null>(null);
  const socketVersionRef = useRef<string | null>(socketVersion);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    socketVersionRef.current = socketVersion;
  }, [socketVersion]);

  useEffect(() => {
    if (!SOCKET_VERSION_ENFORCE || socketVersion) {
      return;
    }

    let cancelled = false;

    const fetchServerVersion = async () => {
      try {
        const response = await fetch('/api/version', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const { serverVersion }: VersionResponse = await response.json();
        if (!cancelled) {
          setSocketVersion(serverVersion);
        }
      } catch (error) {
        if (DEBUG) {
          console.error(
            '[socket-debug][client] failed to resolve server version',
            error
          );
        }
      }
    };

    fetchServerVersion();

    return () => {
      cancelled = true;
    };
  }, [socketVersion]);

  const enforceServerVersion = useCallback((version: string | undefined) => {
    if (
      !SOCKET_VERSION_ENFORCE ||
      !version ||
      version === socketVersionRef.current
    ) {
      return;
    }

    if (DEBUG) {
      console.log(
        `[socket-debug][client] server-version mismatch local=${socketVersionRef.current} server=${version}`
      );
    }

    setSocketVersion(version);
    setIsConnected(false);

    if (SOCKET_SINGLETON_FIX) {
      if (singletonSocket) {
        singletonSocket.removeAllListeners();
        singletonSocket.disconnect();
        singletonSocket = null;
        singletonConnectInvoked = false;
      }
    } else {
      const current = socketRef.current;
      if (current) {
        current.removeAllListeners();
        current.disconnect();
      }
    }

    setSocket(null);
  }, []);

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
    const desiredVersion = SOCKET_VERSION_ENFORCE
      ? socketVersion
      : CLIENT_APP_VERSION;

    if (SOCKET_VERSION_ENFORCE && !desiredVersion) {
      if (DEBUG) {
        console.warn(
          '[socket-debug][client] waiting for resolved server version'
        );
      }
      return;
    }

    if (socket && socket?.connected) {
      return;
    }

    const resolvedVersion = desiredVersion ?? CLIENT_APP_VERSION;
    const nextSocket = getManagedSocket(resolvedVersion);
    const debuggableSocket = nextSocket as DebuggableClientSocket;
    const shouldAttachProviderListeners =
      !SOCKET_SINGLETON_FIX || !debuggableSocket.__providerListenersAttached;

    let handleConnect: (() => void) | null = null;
    let handleDisconnect: (() => void) | null = null;

    const handleServerVersionEvent = (payload: { version: string }) => {
      enforceServerVersion(payload.version);
    };

    if (shouldAttachProviderListeners) {
      handleConnect = () => {
        console.log('client : conncect');
        setSocket(nextSocket);
        setIsConnected(true);
        nextSocket.emit('get-room-list'); // 서버 재시작시 방 없애기위함
        dispatch(setIsLoading(false));
      };

      handleDisconnect = () => {
        console.log('client : disconnect');
        setIsConnected(false);
        dispatch(setIsLoading(true));
      };

      nextSocket.on('connect', handleConnect);
      nextSocket.on('disconnect', handleDisconnect);
      nextSocket.on('server-version', handleServerVersionEvent);

      if (SOCKET_SINGLETON_FIX) {
        debuggableSocket.__providerListenersAttached = true;
      }
    } else if (SOCKET_VERSION_ENFORCE) {
      nextSocket.off('server-version', handleServerVersionEvent);
      nextSocket.on('server-version', handleServerVersionEvent);
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

    return () => {
      if (!SOCKET_SINGLETON_FIX) {
        if (handleConnect) {
          nextSocket.off('connect', handleConnect);
        }
        if (handleDisconnect) {
          nextSocket.off('disconnect', handleDisconnect);
        }
        nextSocket.off('server-version', handleServerVersionEvent);
      }
    };
  }, [dispatch, enforceServerVersion, socket?.id, socketVersion]);

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

  useEffect(() => {
    if (!DEBUG) {
      return;
    }

    const handleVisibilityChange = () => {
      console.log(
        `[socket-debug][client] page visibility=${document.visibilityState}`
      );
    };
    const handleFocus = () => {
      console.log('[socket-debug][client] page focus');
    };
    const handleBlur = () => {
      console.log('[socket-debug][client] page blur');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
