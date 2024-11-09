export const rooms = {};
export const timers = {}; // roomId별 setInteval 저장할 객체

let currentRoomId = 100;
export function getCurrentRoomId() {
  return currentRoomId;
}
export function incrementRoomId() {
  return ++currentRoomId;
}
