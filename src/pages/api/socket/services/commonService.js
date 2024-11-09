/**
 * 플레이어의 재접속을 처리합니다.
 * @returns {Object|null} - 재접속이 이루어진 경우 콜백 데이터 객체를 반환하고, 아니면 null을 반환합니다.
 */
export function handlePlayerReconnect(room, sessionId, socket) {
  // 플레이어가 이미 방에 존재하는지 확인
  const playerExists = room.players.some((player) => player.id === sessionId);
  if (playerExists) {
    const player = room.players.find((player) => player.id === sessionId);
    player.socketId = socket.id;
    socket.join(room.roomId.toString());
    return { success: true, reEnter: true, host: false };
  }

  // 플레이어가 호스트인지 확인
  if (room.host.id === sessionId) {
    return { success: true, reEnter: true, host: true };
  }

  // 재접속이 이루어지지 않음
  return null;
}
