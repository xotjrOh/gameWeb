import { Rooms } from '@/types/room';

const ROOM_STATE_PERSIST = process.env.ROOM_STATE_PERSIST === '1';

type GlobalRoomState = typeof globalThis & {
  __roomsStore?: Rooms;
  __timersStore?: Record<string, NodeJS.Timeout>;
  __currentRoomId?: number;
};

const globalRoomState = globalThis as GlobalRoomState;

export const rooms: Rooms = ROOM_STATE_PERSIST
  ? (globalRoomState.__roomsStore ??
    (globalRoomState.__roomsStore = {} as Rooms))
  : {};
// TODO : 추후에 NodeJS.Timeout 타입이 맞나 확인필요. number로 변경할 수도
export const timers: Record<string, NodeJS.Timeout> = ROOM_STATE_PERSIST
  ? (globalRoomState.__timersStore ??
    (globalRoomState.__timersStore = {} as Record<string, NodeJS.Timeout>))
  : {};

let currentRoomId = ROOM_STATE_PERSIST
  ? (globalRoomState.__currentRoomId ?? 100)
  : 100;
if (ROOM_STATE_PERSIST) {
  globalRoomState.__currentRoomId = currentRoomId;
}

export function getCurrentRoomId(): string {
  return String(currentRoomId);
}
export function incrementRoomId(): string {
  currentRoomId++;
  if (ROOM_STATE_PERSIST) {
    globalRoomState.__currentRoomId = currentRoomId;
  }
  return String(currentRoomId);
}
