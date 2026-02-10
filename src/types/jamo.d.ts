import { CommonResponse } from '@/types/socket';

export type JamoPhase = 'waiting' | 'discuss' | 'ended';

export interface JamoGameData {
  phase: JamoPhase;
  roundNo: number;
  roundDuration: number;
  timeLeft: number;
  endsAt: number | null;
  // Internal server-side fields (optional for client)
  board?: Record<number, string>;
  assignmentsByPlayerId?: Record<string, number[]>;
  ownershipByNumber?: JamoOwnershipMap;
  draftByPlayerId?: Record<string, JamoDraftSubmission>;
  wordFirstByPlayerId?: Record<string, Record<string, number>>;
  successLog?: JamoSuccessEntry[];
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

export interface JamoDraftSubmission {
  playerId: string;
  playerName: string;
  raw: string;
  numbers: number[];
  jamos: string[];
  word: string | null;
  dictOk: boolean | null;
  score: number;
  submittedAt: number;
  parsedOk: boolean;
}

export interface JamoOwnershipMap {
  [index: number]: { playerId: string; playerName: string } | null;
}

export interface JamoAssignmentSummary {
  playerId: string;
  playerName: string;
  numbers: number[];
  jamos: string[];
}

export interface JamoRoundResult {
  roundNo: number;
  successCount: number;
  winner: { playerId: string; playerName: string; score: number } | null;
  successes: JamoSuccessEntry[];
}

export interface JamoStateSnapshot {
  you: JamoSelfView;
  players: JamoPlayerView[];
  board: Record<number, string | null>;
  ownership?: JamoOwnershipMap;
  assignments?: JamoAssignmentSummary[];
  draftSubmissions?: Record<string, JamoDraftSubmission>;
  draftSubmittedAt?: number | null;
  gameData: JamoGameData;
  successLog: JamoSuccessEntry[];
  isHostView: boolean;
}

export interface JamoClientToServerEvents {
  jamo_host_distribute: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
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
  jamo_reset_round: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  jamo_submit_draft: (
    data: { roomId: string; sessionId: string; raw: string },
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
  jamo_draft_saved: (data: { submittedAt: number }) => void;
  jamo_submission_debug: (data: JamoDraftSubmission) => void;
  jamo_round_result: (data: JamoRoundResult) => void;
}
