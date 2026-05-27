import { useEffect, useRef, useState } from 'react';
import { ClientSocketType } from '@/types/socket';
import {
  MurderMysteryAnnouncement,
  MurderMysteryStateSnapshot,
} from '@/types/murderMystery';

interface PartRevealEvent {
  partId: string;
  partName: string;
  byPlayerId: string;
  cardId: string;
  revealedCount: number;
  totalCount: number;
}

const useMurderMysteryGameData = (
  roomId: string,
  socket: ClientSocketType | null,
  sessionId: string
) => {
  const [snapshot, setSnapshot] = useState<MurderMysteryStateSnapshot | null>(
    null
  );
  const [requestErrorMessage, setRequestErrorMessage] = useState<string | null>(
    null
  );
  const [latestAnnouncement, setLatestAnnouncement] =
    useState<MurderMysteryAnnouncement | null>(null);
  const [latestPartReveal, setLatestPartReveal] =
    useState<PartRevealEvent | null>(null);
  const hasReceivedSnapshotRef = useRef(false);
  const hasShownRequestErrorRef = useRef(false);
  const hasTerminalRequestErrorRef = useRef(false);

  useEffect(() => {
    if (!socket || !roomId || !sessionId) {
      return;
    }
    hasReceivedSnapshotRef.current = false;
    hasShownRequestErrorRef.current = false;
    hasTerminalRequestErrorRef.current = false;
    setRequestErrorMessage(null);
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const handleSnapshot = (data: MurderMysteryStateSnapshot) => {
      hasReceivedSnapshotRef.current = true;
      hasTerminalRequestErrorRef.current = false;
      setRequestErrorMessage(null);
      setSnapshot(data);
    };

    const handleAnnouncement = (data: MurderMysteryAnnouncement) => {
      setLatestAnnouncement(data);
    };

    const handlePartReveal = (data: PartRevealEvent) => {
      setLatestPartReveal(data);
    };

    const requestSnapshot = () => {
      if (disposed) {
        return;
      }
      socket.emit('mm_get_state', { roomId, sessionId }, (response) => {
        if (!response.success) {
          if (!hasShownRequestErrorRef.current) {
            hasShownRequestErrorRef.current = true;
            hasTerminalRequestErrorRef.current = true;
            setRequestErrorMessage(
              response.message ?? '상태 조회에 실패했습니다.'
            );
          }
        }
      });
    };

    const scheduleRetry = () => {
      if (
        disposed ||
        hasReceivedSnapshotRef.current ||
        hasTerminalRequestErrorRef.current
      ) {
        return;
      }
      retryTimer = setTimeout(() => {
        if (
          disposed ||
          hasReceivedSnapshotRef.current ||
          hasTerminalRequestErrorRef.current
        ) {
          return;
        }
        requestSnapshot();
        scheduleRetry();
      }, 3000);
    };

    socket.on('mm_state_snapshot', handleSnapshot);
    socket.on('mm_announcement', handleAnnouncement);
    socket.on('mm_part_revealed', handlePartReveal);
    socket.on('connect', requestSnapshot);

    requestSnapshot();
    scheduleRetry();

    return () => {
      disposed = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      socket.off('mm_state_snapshot', handleSnapshot);
      socket.off('mm_announcement', handleAnnouncement);
      socket.off('mm_part_revealed', handlePartReveal);
      socket.off('connect', requestSnapshot);
    };
  }, [socket?.id, roomId, sessionId]);

  return {
    snapshot,
    requestErrorMessage,
    latestAnnouncement,
    latestPartReveal,
  };
};

export default useMurderMysteryGameData;
