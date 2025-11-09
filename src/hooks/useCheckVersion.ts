import { useEffect, useRef } from 'react';
import { ClientSocketType } from '@/types/socket';

interface VersionResponse {
  serverVersion: string;
}

const VERSION_WATCH_DEBUG = process.env.NEXT_PUBLIC_VERSION_WATCH_DEBUG === '1';
const VERSION_WATCH_NOOP = process.env.NEXT_PUBLIC_VERSION_WATCH_NOOP === '1';
const VERSION_WATCH_FORCE_REFRESH =
  process.env.NEXT_PUBLIC_VERSION_WATCH_FORCE_REFRESH === '1';
const VERSION_WATCH_INTERVAL_MS = Number(
  process.env.NEXT_PUBLIC_VERSION_WATCH_INTERVAL_MS ?? 60000
);

export default function useCheckVersion(socket: ClientSocketType | null) {
  const versionWatcherIdRef = useRef(
    `vw-${Math.random().toString(36).slice(2, 10)}`
  );
  const pendingVersionRef = useRef<string | null>(null);
  const lastMismatchTimestampRef = useRef<number | null>(null);

  const logVersionWatch = (
    message: string,
    payload?: Record<string, unknown>
  ) => {
    if (VERSION_WATCH_DEBUG) {
      console.log(`[version-watch] ${message}`, payload);
    }
  };

  useEffect(() => {
    let isActive = true;
    let intervalId: NodeJS.Timeout | null = null;

    const shouldForceRefresh =
      VERSION_WATCH_FORCE_REFRESH && !VERSION_WATCH_NOOP;

    const checkServerVersion = async (
      reason: 'initial' | 'interval' | 'visibility'
    ) => {
      if (document.visibilityState === 'hidden' && reason !== 'initial') {
        logVersionWatch('skip-hidden-tab', { reason });
        return;
      }

      try {
        logVersionWatch('fetch:start', { reason });
        const response = await fetch('/api/version', {
          headers: {
            'x-purpose': 'version-watch',
            'x-version-watch-id': versionWatcherIdRef.current,
          },
          cache: VERSION_WATCH_DEBUG ? 'no-store' : 'default',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const { serverVersion }: VersionResponse = await response.json();
        const localVersion = localStorage.getItem('localVersion'); // 로컬 저장된 버전

        if (!localVersion) {
          localStorage.setItem('localVersion', serverVersion);
          logVersionWatch('local-version-initialized', { serverVersion });
        }

        if (localVersion && localVersion !== serverVersion) {
          logVersionWatch('version-changed', {
            from: localVersion,
            to: serverVersion,
            reason,
            noop: VERSION_WATCH_NOOP,
          });

          localStorage.setItem('localVersion', serverVersion);
          pendingVersionRef.current = serverVersion;
          lastMismatchTimestampRef.current = Date.now();

          if (!shouldForceRefresh) {
            logVersionWatch('passive-mode-skip-disconnect', {
              serverVersion,
            });
            return;
          }

          if (VERSION_WATCH_NOOP) {
            logVersionWatch('noop-enabled-skip-disconnect');
            return;
          }

          const disconnectSocket = async () => {
            return new Promise<void>((resolve) => {
              if (socket && socket.connected) {
                logVersionWatch('disconnecting-socket', {
                  socketId: socket.id,
                });
                socket.disconnect();
              }
              resolve();
            });
          };

          if (!isActive) {
            return;
          }

          await disconnectSocket();
          window.location.replace('/');
        }
      } catch (error) {
        logVersionWatch('error', { reason, error });
      }
    };

    checkServerVersion('initial');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkServerVersion('visibility');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (VERSION_WATCH_DEBUG || VERSION_WATCH_INTERVAL_MS > 0) {
      intervalId = setInterval(
        () => {
          checkServerVersion('interval');
        },
        VERSION_WATCH_DEBUG ? 15000 : VERSION_WATCH_INTERVAL_MS
      );
    }

    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket?.id, socket?.connected]); // 브라우저 방치후 사용 체크
}
