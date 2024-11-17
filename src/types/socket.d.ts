import { Socket } from 'socket.io-client';
import { Room, Rooms, GameType } from './room';

// Generic Response Interface
export interface Response<T = undefined> {
  success: boolean;
  data?: T;
  message?: string;
}

// Client-to-Server Events
export interface ClientToServerEvents {
  'update-socket-id': (data: UpdateSocketIdData) => void;
  'get-room-list': () => void;
  'check-room': (
    data: RoomSessionData,
    callback: (response: Response<{ isInRoom: boolean }>) => void
  ) => void;
  'check-room-host': (
    data: RoomSessionData,
    callback: (response: Response<{ isHost: boolean }>) => void
  ) => void;
  'create-room': (
    data: CreateRoomData,
    callback: (response: Response<{ roomId: string }>) => void
  ) => void;
  'check-can-join-room': (
    data: RoomSessionData,
    callback: (response: Response) => void
  ) => void;
  'join-room': (
    data: JoinRoomData,
    callback: (response: Response) => void
  ) => void;
  'leave-room': (
    data: RoomSessionData,
    callback: (response: Response) => void
  ) => void;
  // ... additional events
}

// Server-to-Client Events
export interface ServerToClientEvents {
  'room-updated': (rooms: Rooms) => void;
  'room-closed': (data: { message: string }) => void;
  // ... additional events
}

// Common Data Types
export interface RoomSessionData {
  roomId: string;
  sessionId: string;
}

export interface UpdateSocketIdData extends RoomSessionData {
  newSocketId: string;
}

export interface CreateRoomData {
  roomName: string;
  userName: string;
  gameType: GameType;
  sessionId: string;
  maxPlayers: number;
}

export interface JoinRoomData {
  roomId: string;
  userName: string;
  sessionId: string;
}

// Socket Type Definition
export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
