import { CommonResponse } from '@/types/socket';
import { PlaceId } from '@/lib/animalPlaces';

export type AnimalPhase =
  | 'ready'
  | 'start'
  | 'running'
  | 'resolve'
  | 'result'
  | 'ended';

export type SpeciesType =
  | 'herbivore'
  | 'carnivore'
  | 'omnivore'
  | 'observer'
  | 'unknown';

export type AbilityTargetType = 'self' | 'player' | 'place' | 'none';
export type AbilityVisibility = 'public' | 'host' | 'private';
export type PlaceRisk = 'safe' | 'risky' | 'over' | 'unknown';

export interface AnimalAbilityInfo {
  id: string;
  name: string;
  description: string;
  allowedPhases: AnimalPhase[];
  targetType: AbilityTargetType;
  cooldownRounds: number;
  usesPerGame?: number;
}

export interface AnimalRoleInfo {
  id: string;
  name: string;
  speciesType: SpeciesType;
  summary: string;
  abilities: AnimalAbilityInfo[];
  winHint?: string;
}

export interface AnimalEventLogEntry {
  id: string;
  roundNo: number;
  at: number;
  type: 'system' | 'ability' | 'move' | 'eat' | 'result';
  message: string;
  visibility: AbilityVisibility;
  targetId?: string;
}

export interface AnimalIntelEntry {
  id: string;
  roundNo: number;
  type: 'place' | 'player';
  message: string;
  placeId?: PlaceId;
  targetPlayerId?: string;
  roleId?: string;
  counts?: { herbivores: number; carnivores: number; capacity: number };
  speciesType?: SpeciesType;
}

export interface AnimalPlaceSummary {
  placeId: PlaceId;
  herbivores: number | null;
  carnivores: number | null;
  capacity: number | null;
  risk: PlaceRisk;
}

export interface AnimalGameData {
  phase: AnimalPhase;
  roundNo: number;
  totalRounds: number;
  timeLeft: number;
  roundDuration: number;
  endsAt?: number | null;
  placeCapacities: Record<PlaceId, number>;
  eventLog: AnimalEventLogEntry[];
  // Internal optional fields for server-side bookkeeping
  baseCapacities?: Record<PlaceId, number>;
  capacityModifiers?: Record<PlaceId, number>;
  processedReqIds?: Record<string, true>;
  eatIntents?: Record<string, string>;
  fakePlaceByPlayerId?: Record<string, PlaceId>;
  hiddenRoleByPlayerId?: Record<string, boolean>;
  privateIntelByPlayerId?: Record<string, AnimalIntelEntry[]>;
}

export interface AnimalAbilityState {
  usedThisRound: boolean;
  cooldowns: Record<string, number>;
  remainingUses: Record<string, number>;
}

export interface AnimalPlayerData {
  roleId: string | null;
  speciesType: SpeciesType;
  placeId: PlaceId | null;
  locked: boolean;
  isAlive: boolean;
  score: number;
  eatenCountTotal: number;
  eatenCountThisRound: number;
  abilityState: AnimalAbilityState;
  pendingEatTargetId?: string | null;
  buffs?: Record<string, unknown>;
  debuffs?: Record<string, unknown>;
}

export type AnimalPlayer = {
  id: string;
  name: string;
  socketId: string;
} & AnimalPlayerData;

export interface AnimalStateSnapshot {
  you: AnimalPlayer;
  players: AnimalPlayer[];
  gameData: AnimalGameData;
  roleCard?: AnimalRoleInfo;
  placeSummary: AnimalPlaceSummary[];
  intel: AnimalIntelEntry[];
  isHostView: boolean;
}

export interface AnimalRoundResult {
  roundNo: number;
  eatenIds: string[];
  starvedIds: string[];
  sparedIds: string[];
  survivors: string[];
  gameEnded?: boolean;
  winners?: string[];
  losers?: string[];
}

export interface AnimalClientToServerEvents {
  host_assign_roles: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  host_set_round_time: (
    data: { roomId: string; sessionId: string; duration: number },
    callback: (response: CommonResponse) => void
  ) => void;
  host_start_round: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  host_force_end_round: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  host_reset_game: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  player_select_place: (
    data: { roomId: string; sessionId: string; placeId: PlaceId },
    callback: (response: CommonResponse) => void
  ) => void;
  player_lock_place: (
    data: { roomId: string; sessionId: string; locked: boolean },
    callback: (response: CommonResponse) => void
  ) => void;
  player_use_ability: (
    data: {
      roomId: string;
      sessionId: string;
      abilityId: string;
      reqId: string;
      target?: { playerId?: string; placeId?: PlaceId };
    },
    callback: (response: CommonResponse) => void
  ) => void;
  carnivore_eat: (
    data: {
      roomId: string;
      sessionId: string;
      targetPlayerId: string;
      reqId: string;
    },
    callback: (response: CommonResponse) => void
  ) => void;
  player_get_state: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
}

export interface AnimalServerToClientEvents {
  server_state_snapshot: (data: AnimalStateSnapshot) => void;
  server_round_phase_changed: (data: {
    phase: AnimalPhase;
    timeLeft: number;
    endsAt: number | null;
  }) => void;
  server_event_log_append: (data: AnimalEventLogEntry) => void;
  server_round_result: (data: AnimalRoundResult) => void;
}
