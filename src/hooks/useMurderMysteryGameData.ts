import { useEffect, useState } from 'react';
import { ClientSocketType } from '@/types/socket';
import {
  MurderMysteryAnnouncement,
  MurderMysteryPartScenario,
  MurderMysteryStateSnapshot,
} from '@/types/murderMystery';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';

interface PartRevealEvent {
  part: MurderMysteryPartScenario;
  byPlayerId: string;
  cardId: string;
}

const useMurderMysteryGameData = (
  roomId: string,
  socket: ClientSocketType | null,
  sessionId: string
) => {
  const { enqueueSnackbar } = useCustomSnackbar();
  const [snapshot, setSnapshot] = useState<MurderMysteryStateSnapshot | null>(
    null
  );
  const [latestAnnouncement, setLatestAnnouncement] =
    useState<MurderMysteryAnnouncement | null>(null);
  const [latestPartReveal, setLatestPartReveal] =
    useState<PartRevealEvent | null>(null);

  useEffect(() => {
    if (!socket || !roomId || !sessionId) {
      return;
    }

    const handleSnapshot = (data: MurderMysteryStateSnapshot) => {
      setSnapshot(data);
    };

    const handleAnnouncement = (data: MurderMysteryAnnouncement) => {
      setLatestAnnouncement(data);
    };

    const handlePartReveal = (data: PartRevealEvent) => {
      setLatestPartReveal(data);
    };

    socket.on('mm_state_snapshot', handleSnapshot);
    socket.on('mm_announcement', handleAnnouncement);
    socket.on('mm_part_revealed', handlePartReveal);

    socket.emit('mm_get_state', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '상태 조회에 실패했습니다.', {
          variant: 'error',
        });
      }
    });

    return () => {
      socket.off('mm_state_snapshot', handleSnapshot);
      socket.off('mm_announcement', handleAnnouncement);
      socket.off('mm_part_revealed', handlePartReveal);
    };
  }, [socket?.id, roomId, sessionId, enqueueSnackbar]);

  return {
    snapshot,
    latestAnnouncement,
    latestPartReveal,
  };
};

export default useMurderMysteryGameData;
