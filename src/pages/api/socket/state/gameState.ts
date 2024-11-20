import { Rooms } from '@/types/room';

export const rooms: Rooms = {};
// TODO : 추후에 NodeJS.Timeout 타입이 맞나 확인필요. number로 변경할 수도
export const timers: Record<string, NodeJS.Timeout> = {};

let currentRoomId = 100;
export function getCurrentRoomId(): string {
  return String(currentRoomId);
}
export function incrementRoomId(): string {
  currentRoomId++;
  return String(currentRoomId);
}
