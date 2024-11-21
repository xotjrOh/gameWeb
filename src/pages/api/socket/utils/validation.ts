import { rooms } from '../state/gameState';
import {
  MESSAGES,
  NOT_ASSIGNED,
  MIN_PLAYER_LENGTH,
  AUTHORIZED_SESSION_IDS,
  GAME_STATUS,
} from './constants';
import { Room, Rooms, Player, GameType } from '@/types/room';
import { HorsePlayerData } from '@/types/horse';

export function validateRoom(roomId: string): Room {
  const room = rooms[roomId];
  if (!room) {
    throw new Error(MESSAGES.ROOM_NOT_FOUND);
  }
  return room;
}

export function validatePlayer(room: Room, sessionId: string): Player {
  const player = room.players.find((p) => p.id === sessionId);
  if (!player) {
    throw new Error(MESSAGES.NOT_A_PARTICIPANT);
  }
  return player;
}

export function validateCanCreateRoom(sessionId: string): string {
  if (!AUTHORIZED_SESSION_IDS.includes(sessionId)) {
    throw new Error(MESSAGES.CREATE_ROOM_AUTH_REQUIRED);
  }
  return sessionId;
}

export function validateRoomName(roomName: string): string {
  if (!roomName) {
    throw new Error(MESSAGES.ROOM_NAME_REQUIRED);
  }
  return roomName;
}

export function validateGameType(gameType: GameType): GameType {
  if (!gameType) {
    throw new Error(MESSAGES.GAME_TYPE_REQUIRED);
  }
  return gameType;
}

export function validateMaxPlayers(maxPlayers: number): number {
  if (!Number.isInteger(maxPlayers) || maxPlayers < MIN_PLAYER_LENGTH) {
    throw new Error(MESSAGES.MAX_PLAYERS_INVALID);
  }
  return maxPlayers;
}

export function validateRoomFull(room: Room): Room {
  if (room.players.length >= room.maxPlayers) {
    throw new Error(MESSAGES.ROOM_FULL);
  }
  return room;
}

/**
 * 게임중인 방을 외부에서 접속하려 할 때) 게임중이라 못 들어감
 */
export function validateGameAlreadyStarted(room: Room): Room {
  if (room.status === GAME_STATUS.IN_PROGRESS) {
    throw new Error(MESSAGES.GAME_ALREADY_STARTED);
  }
  return room;
}

/**
 * 게임중인 방을 내부에서 나가려 할 때) 게임중이라 못 나감
 */
export function validateCannotLeave(room: Room): Room {
  if (room.status === GAME_STATUS.IN_PROGRESS) {
    throw new Error(MESSAGES.CANNOT_LEAVE_DURING_GAME);
  }
  return room;
}

export function validateOnlyHostRemoveRoom(
  room: Room,
  sessionId: string
): Room {
  const isHost = room.host.id === sessionId;
  if (!isHost) {
    throw new Error(MESSAGES.ONLY_HOST_CAN_CLOSE_ROOM);
  }
  return room;
}

export function validateDuplicateNickname(
  room: Room,
  nickname: string
): string {
  const isDuplicateNickname =
    room.players.some((player) => player.name === nickname) ||
    room.host.name === nickname;
  if (isDuplicateNickname) {
    throw new Error(MESSAGES.NICKNAME_ALREADY_IN_USE);
  }
  return nickname;
}

export function validateNickname(nickname: string): string {
  if (!nickname) {
    throw new Error(MESSAGES.NICKNAME_REQUIRED);
  }
  if (nickname.length > 10) {
    throw new Error(MESSAGES.NICKNAME_TOO_LONG);
  }
  return nickname;
}

/**
 * 플레이어, 호스트 여러 게임방 참여 방지
 * @param {string} roomId - create-room = null / check-can-join-room = roomId
 */
export function validateAlreadyJoinOtherRoom(
  rooms: Rooms,
  sessionId: string,
  roomId: string | null = null
): Rooms {
  for (const [otherRoomId, otherRoom] of Object.entries(rooms)) {
    // roomId가 주어졌다면, 해당 roomId는 제외하고 비교
    if (roomId && otherRoomId.toString() === roomId.toString()) {
      continue;
    }

    const isPlayerInOtherRoom = otherRoom.players.some(
      (player) => player.id === sessionId
    );
    const isHostInOtherRoom = otherRoom.host.id === sessionId;

    if (isPlayerInOtherRoom || isHostInOtherRoom) {
      throw new Error(MESSAGES.ALREADY_IN_ANOTHER_ROOM(otherRoom.roomName));
    }
  }
  return rooms;
}

/**
 * 모든 플레이어에게 말이 할당되었는지 체크
 */
export function validateAssignedByHorseGame(room: Room): boolean {
  if (room.gameType !== 'horse') {
    throw new Error('이 검증은 말 게임에서만 사용할 수 있습니다.');
  }
  const hasMissingHorse = room.players.some((player) => {
    const horsePlayer = player as HorsePlayerData & Player;
    return !horsePlayer.horse || horsePlayer.horse === NOT_ASSIGNED;
  });
  if (hasMissingHorse) {
    throw new Error(MESSAGES.NOT_ALL_PLAYERS_ASSIGNED);
  }
  return hasMissingHorse;
}

/**
 * 과잉 투자 체크
 */
export function validateChipsByHorseGame(
  player: Player,
  bets: { [horse: string]: number }
): number {
  const horsePlayer = player as HorsePlayerData & Player;
  const totalBets = Object.values(bets).reduce((sum, chips) => sum + chips, 0);
  if (horsePlayer.chips < totalBets) {
    throw new Error(MESSAGES.INSUFFICIENT_CHIPS);
  }
  return totalBets;
}
