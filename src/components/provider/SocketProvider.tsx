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
  process.env.NEXT_PUBLIC_SOCKET_SINGLETON_FIX !== '0';
const SOCKET_VERSION_ENFORCE =
  process.env.NEXT_PUBLIC_SOCKET_VERSION_ENFORCE === '1';
const CLIENT_APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  process.env.NEXT_PUBLIC_SITE_VERSION ??
  'dev';
const SOCKET_DISCONNECT_LOADING_DELAY_MS = 2000;

interface SocketHealthSnapshot {
  socketId?: string;
  connected: boolean;
  transport?: string;
  lastConnectAt?: string | null;
  lastDisconnectAt?: string | null;
  lastDisconnectReason?: string | null;
  lastConnectError?: string | null;
  reconnectAttempts: number;
  roomUpdatedListenerCount: number;
}

declare global {
  interface Window {
    __socketHealth?: SocketHealthSnapshot;
  }
}

type DebuggableClientSocket = ClientSocketType & {
  __dbgAttached?: boolean;
  __healthAttached?: boolean;
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

const getSocketTransport = (socket: ClientSocketType | null) => {
  return socket?.io.engine?.transport?.name;
};

const getRoomUpdatedListenerCount = (socket: ClientSocketType | null) => {
  return socket?.listeners('room-updated').length ?? 0;
};

const updateSocketHealth = (
  socket: ClientSocketType | null,
  updates: Partial<SocketHealthSnapshot> = {}
): SocketHealthSnapshot | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const previous = window.__socketHealth;
  const nextHealth: SocketHealthSnapshot = {
    socketId: socket?.id ?? previous?.socketId,
    connected: socket?.connected ?? previous?.connected ?? false,
    transport: getSocketTransport(socket) ?? previous?.transport,
    lastConnectAt: previous?.lastConnectAt ?? null,
    lastDisconnectAt: previous?.lastDisconnectAt ?? null,
    lastDisconnectReason: previous?.lastDisconnectReason ?? null,
    lastConnectError: previous?.lastConnectError ?? null,
    reconnectAttempts: previous?.reconnectAttempts ?? 0,
    roomUpdatedListenerCount:
      socket !== null
        ? getRoomUpdatedListenerCount(socket)
        : (previous?.roomUpdatedListenerCount ?? 0),
    ...updates,
  };

  window.__socketHealth = nextHealth;
  return nextHealth;
};

const logSocketHealth = (
  message: string,
  socket: ClientSocketType | null,
  updates: Partial<SocketHealthSnapshot> = {}
) => {
  if (!DEBUG) {
    return;
  }
  console.log(
    `[socket-debug][client] ${message}`,
    updateSocketHealth(socket, updates)
  );
};

function attachSocketHealthListeners(socket: ClientSocketType | null) {
  if (!socket) {
    return;
  }

  const debuggableSocket = socket as DebuggableClientSocket;
  if (debuggableSocket.__healthAttached) {
    updateSocketHealth(socket);
    return;
  }
  debuggableSocket.__healthAttached = true;

  updateSocketHealth(socket);

  socket.on('connect', () => {
    updateSocketHealth(socket, {
      socketId: socket.id,
      connected: true,
      transport: getSocketTransport(socket),
      lastConnectAt: new Date().toISOString(),
      lastConnectError: null,
    });
  });

  socket.on('disconnect', (reason) => {
    updateSocketHealth(socket, {
      socketId: socket.id,
      connected: false,
      lastDisconnectAt: new Date().toISOString(),
      lastDisconnectReason: reason,
    });
  });

  socket.on('connect_error', (error) => {
    updateSocketHealth(socket, {
      connected: false,
      lastConnectError: error?.message ?? 'unknown',
    });
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    updateSocketHealth(socket, {
      connected: socket.connected,
      reconnectAttempts: attempt,
    });
  });
}

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

  socket.on('connect', () => {
    console.log(
      `[socket-debug][client] connect id=${socket.id} transport=${getSocketTransport(
        socket
      )} listeners(room-updated)=${getRoomUpdatedListenerCount(socket)}`
    );
    logSocketHealth('health:connect', socket);
  });

  socket.on('disconnect', (reason) => {
    console.log(
      `[socket-debug][client] disconnect id=${socket.id} reason=${reason} listeners(room-updated)=${getRoomUpdatedListenerCount(
        socket
      )}`
    );
    logSocketHealth('health:disconnect', socket, {
      lastDisconnectReason: reason,
    });
  });

  socket.on('connect_error', (error) => {
    console.log(
      `[socket-debug][client] connect_error message=${error?.message ?? 'unknown'}`
    );
    logSocketHealth('health:connect_error', socket, {
      lastConnectError: error?.message ?? 'unknown',
    });
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`[socket-debug][client] reconnect_attempt #${attempt}`);
    logSocketHealth('health:reconnect_attempt', socket, {
      reconnectAttempts: attempt,
    });
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
  const disconnectLoadingTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    socketVersionRef.current = socketVersion;
  }, [socketVersion]);

  const clearDisconnectLoadingTimer = useCallback(() => {
    if (disconnectLoadingTimerRef.current) {
      clearTimeout(disconnectLoadingTimerRef.current);
      disconnectLoadingTimerRef.current = null;
    }
  }, []);

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
      clearDisconnectLoadingTimer();
      providerUnmountCount += 1;
      if (DEBUG) {
        console.log(
          `[socket-debug][client] SocketProvider unmount #${providerUnmountCount}`
        );
      }
    };
  }, [clearDisconnectLoadingTimer]);

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
    let handleDisconnect: ((reason: string) => void) | null = null;

    const handleServerVersionEvent = (payload: { version: string }) => {
      enforceServerVersion(payload.version);
    };

    attachSocketHealthListeners(nextSocket);

    if (shouldAttachProviderListeners) {
      handleConnect = () => {
        console.log('client : conncect');
        clearDisconnectLoadingTimer();
        updateSocketHealth(nextSocket, {
          socketId: nextSocket.id,
          connected: true,
          transport: getSocketTransport(nextSocket),
          lastConnectAt: new Date().toISOString(),
          lastConnectError: null,
        });
        setSocket(nextSocket);
        setIsConnected(true);
        nextSocket.emit('get-room-list'); // 서버 재시작시 방 없애기위함
        dispatch(setIsLoading(false));
      };

      handleDisconnect = (reason) => {
        console.log('client : disconnect');
        updateSocketHealth(nextSocket, {
          socketId: nextSocket.id,
          connected: false,
          lastDisconnectAt: new Date().toISOString(),
          lastDisconnectReason: reason,
        });
        setIsConnected(false);
        clearDisconnectLoadingTimer();
        disconnectLoadingTimerRef.current = setTimeout(() => {
          if (!nextSocket.connected) {
            dispatch(
              setIsLoading({
                isLoading: true,
                reason: 'socket-disconnect',
              })
            );
          }
        }, SOCKET_DISCONNECT_LOADING_DELAY_MS);
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
    if (nextSocket.connected) {
      clearDisconnectLoadingTimer();
      updateSocketHealth(nextSocket, {
        socketId: nextSocket.id,
        connected: true,
        transport: getSocketTransport(nextSocket),
      });
      setIsConnected(true);
      dispatch(setIsLoading(false));
    }

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
  }, [
    clearDisconnectLoadingTimer,
    dispatch,
    enforceServerVersion,
    socket?.id,
    socketVersion,
  ]);

  useEffect(() => {
    if (socket) {
      const handleRoomUpdated = (updatedRooms: Rooms) => {
        dispatch(setRooms(updatedRooms));
      };

      socket.on('room-updated', handleRoomUpdated);
      socket.emit('get-room-list');
      updateSocketHealth(socket);

      return () => {
        socket.off('room-updated', handleRoomUpdated);
        updateSocketHealth(socket);
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
