import { CommonResponse } from '@/types/socket';

export type JamoPhase = 'waiting' | 'discuss' | 'result';

export interface JamoGameData {
  phase: JamoPhase;
  roundNo: number;
  roundDuration: number;
  timeLeft: number;
  endsAt: number | null;
  // Internal server-side fields (optional for client)
  board?: Record<number, string>;
  assignmentsByPlayerId?: Record<string, number[]>;
  submissionCounts?: Record<string, number>;
  usedWords?: Record<string, true>;
  successLog?: JamoSuccessEntry[];
  chatLog?: JamoChatMessage[];
  lastRoundResult?: JamoRoundResult;
}

export interface JamoPlayerData {
  score: number;
  successCount: number;
  firstSuccessAt: number | null;
}

export interface JamoPlayerView {
  id: string;
  name: string;
  socketId: string;
  score: number;
  successCount: number;
  submissionCount: number;
}

export interface JamoSelfView extends JamoPlayerView {
  assignedNumbers: number[];
}

export interface JamoSuccessEntry {
  id: string;
  playerId: string;
  playerName: string;
  word: string;
  numbers: number[];
  score: number;
  submittedAt: number;
}

export interface JamoChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  sentAt: number;
}

export interface JamoRoundResult {
  roundNo: number;
  successPlayerCount: number;
  winner: { playerId: string; playerName: string; score: number } | null;
  successes: JamoSuccessEntry[];
}

export interface JamoStateSnapshot {
  you: JamoSelfView;
  players: JamoPlayerView[];
  board: Record<number, string | null>;
  gameData: JamoGameData;
  successLog: JamoSuccessEntry[];
  chatLog: JamoChatMessage[];
  submissionLimit: number;
  isHostView: boolean;
}

export interface JamoClientToServerEvents {
  jamo_set_round_time: (
    data: { roomId: string; sessionId: string; duration: number },
    callback: (response: CommonResponse) => void
  ) => void;
  jamo_start_round: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  jamo_force_end_round: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  jamo_submit_numbers: (
    data: { roomId: string; sessionId: string; numbers: string },
    callback: (response: CommonResponse) => void
  ) => void;
  jamo_send_chat: (
    data: { roomId: string; sessionId: string; message: string },
    callback: (response: CommonResponse) => void
  ) => void;
  jamo_get_state: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
}

export interface JamoServerToClientEvents {
  jamo_state_snapshot: (data: JamoStateSnapshot) => void;
  jamo_round_phase_changed: (data: {
    phase: JamoPhase;
    timeLeft: number;
    endsAt: number | null;
    roundNo: number;
    roundDuration: number;
  }) => void;
  jamo_chat_message: (data: JamoChatMessage) => void;
  jamo_round_result: (data: JamoRoundResult) => void;
}
