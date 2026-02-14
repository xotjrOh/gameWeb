import { Server } from 'socket.io';
import { MurderMysteryRoom } from '@/types/room';
import { MurderMysteryAnnouncement } from '@/types/murderMystery';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';
import { buildMurderMysterySnapshot } from './murderMysteryStateMachine';

export const emitMurderMysterySnapshots = (
  room: MurderMysteryRoom,
  io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
  room.players.forEach((player) => {
    const snapshot = buildMurderMysterySnapshot(room, player.id, false);
    io.to(player.socketId).emit('mm_state_snapshot', snapshot);
  });

  if (room.host.socketId) {
    const hostSnapshot = buildMurderMysterySnapshot(room, room.host.id, true);
    io.to(room.host.socketId).emit('mm_state_snapshot', hostSnapshot);
  }
};

export const emitMurderMysteryAnnouncement = (
  room: MurderMysteryRoom,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  announcement: MurderMysteryAnnouncement
) => {
  io.to(room.roomId).emit('mm_announcement', announcement);
};

export const emitMurderMysteryPartRevealed = (
  room: MurderMysteryRoom,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  data: {
    partId: string;
    partName: string;
    byPlayerId: string;
    cardId: string;
    revealedCount: number;
    totalCount: number;
  }
) => {
  io.to(room.roomId).emit('mm_part_revealed', data);
};
