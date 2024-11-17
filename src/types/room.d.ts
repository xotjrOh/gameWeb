import { GAME_STATUS } from '@/pages/api/socket/utils/constants';

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS];

export interface Player {
  id: string;
  name: string;
  socketId: string;
}

interface BaseRoom {
  roomId: string;
  roomName: string;
  host: Player;
  players: Player[];
  status: GameStatus;
  maxPlayers: number;
}

export interface HorseRoom extends BaseRoom {
  gameType: 'horse';
  gameData: HorseGameData;
}

export interface ShuffleRoom extends BaseRoom {
  gameType: 'shuffle';
  gameData: ShuffleGameData;
}

export type Room = HorseRoom | ShuffleRoom;

export type GameType = Room['gameType'];

export type Rooms = Record<string, Room>;
