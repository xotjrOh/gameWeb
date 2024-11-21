import { Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { Room, Rooms, GameType, Player } from './room';
import { ReconnectionResult } from '../services/commonService';
import {
  RoundData,
  HorsePosition,
  HorsePlayerData,
  HorseClientToServerEvents,
  HorseServerToClientEvents,
} from '@/types/horse';
import {
  ShuffleClientToServerEvents,
  ShuffleServerToClientEvents,
} from '@/types/shuffle';

export interface CommonResponse {
  success: boolean;
  message?: string;
}

// Client-to-Server Events
export interface ClientToServerEvents
  extends HorseClientToServerEvents,
    ShuffleClientToServerEvents {
  'update-socket-id': (data: UpdateSocketIdData) => void;
  'get-room-list': () => void;
  'check-room': (
    data: RoomSessionData,
    callback: (response: CommonResponse) => void
  ) => void;
  'check-room-host': (
    data: RoomSessionData,
    callback: (response: CommonResponse) => void
  ) => void;
  'create-room': (
    data: CreateRoomData,
    callback: (response: CommonResponse & { roomId?: string }) => void
  ) => void;
  'check-can-join-room': (
    data: RoomSessionData,
    callback: (response: CommonResponse & ReconnectionResult) => void
  ) => void;
  'join-room': (
    data: JoinRoomData,
    callback: (response: CommonResponse) => void
  ) => void;
  'leave-room': (
    data: RoomSessionData,
    callback: (response: CommonResponse) => void
  ) => void;

  // ... additional events
}

// Server-to-Client Events
export interface ServerToClientEvents
  extends HorseServerToClientEvents,
    ShuffleServerToClientEvents {
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
export type ClientSocketType = ClientSocket<
  ServerToClientEvents,
  ClientToServerEvents
>;
export type ServerSocketType = ServerSocket<
  ClientToServerEvents,
  ServerToClientEvents
>;
