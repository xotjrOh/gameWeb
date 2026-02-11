import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  JamoAssignmentSummary,
  JamoDraftSubmission,
  JamoFinalResult,
  JamoGameData,
  JamoOwnershipMap,
  JamoRoundResult,
  JamoStateSnapshot,
  JamoSuccessEntry,
  JamoPlayerView,
  JamoSelfView,
} from '@/types/jamo';

interface JamoState {
  players: JamoPlayerView[];
  you: JamoSelfView | null;
  gameData: JamoGameData;
  board: Record<number, string | null>;
  ownership: JamoOwnershipMap;
  assignments: JamoAssignmentSummary[];
  draftSubmissions: Record<string, JamoDraftSubmission>;
  draftSubmittedAt: number | null;
  successLog: JamoSuccessEntry[];
  roundHistory: JamoRoundResult[];
  finalResult: JamoFinalResult | null;
  roundResult: JamoRoundResult | null;
}

const initialState: JamoState = {
  players: [],
  you: null,
  gameData: {
    phase: 'waiting',
    roundNo: 0,
    maxRounds: 5,
    blockDuplicateCards: true,
    roundDuration: 180,
    timeLeft: 0,
    endsAt: null,
  },
  board: {},
  ownership: {},
  assignments: [],
  draftSubmissions: {},
  draftSubmittedAt: null,
  successLog: [],
  roundHistory: [],
  finalResult: null,
  roundResult: null,
};

const jamoSlice = createSlice({
  name: 'jamo',
  initialState,
  reducers: {
    setSnapshot(state, action: PayloadAction<JamoStateSnapshot>) {
      if (state.gameData.roundNo !== action.payload.gameData.roundNo) {
        state.roundResult = null;
      }
      if (action.payload.gameData.phase !== 'ended') {
        state.roundResult = null;
      }
      state.players = action.payload.players ?? [];
      state.you = action.payload.you ?? null;
      state.gameData = action.payload.gameData;
      state.board = action.payload.board ?? {};
      state.ownership = action.payload.ownership ?? {};
      state.assignments = action.payload.assignments ?? [];
      state.draftSubmissions = action.payload.draftSubmissions ?? {};
      state.draftSubmittedAt = action.payload.draftSubmittedAt ?? null;
      state.successLog = action.payload.successLog ?? [];
      state.roundHistory = action.payload.roundHistory ?? [];
      state.finalResult = action.payload.finalResult ?? null;
    },
    updatePhase(
      state,
      action: PayloadAction<{
        phase: JamoGameData['phase'];
        timeLeft: number;
        endsAt: number | null;
        roundNo: number;
        maxRounds: number;
        roundDuration: number;
      }>
    ) {
      state.gameData.phase = action.payload.phase;
      state.gameData.timeLeft = action.payload.timeLeft;
      state.gameData.endsAt = action.payload.endsAt;
      state.gameData.roundNo = action.payload.roundNo;
      state.gameData.maxRounds = action.payload.maxRounds;
      state.gameData.roundDuration = action.payload.roundDuration;
    },
    setDraftSaved(state, action: PayloadAction<number>) {
      state.draftSubmittedAt = action.payload;
    },
    upsertSubmissionDebug(state, action: PayloadAction<JamoDraftSubmission>) {
      state.draftSubmissions[action.payload.playerId] = action.payload;
    },
    setRoundResult(state, action: PayloadAction<JamoRoundResult | null>) {
      state.roundResult = action.payload;
      if (action.payload) {
        const existingIndex = state.roundHistory.findIndex(
          (entry) => entry.roundNo === action.payload?.roundNo
        );
        if (existingIndex >= 0) {
          state.roundHistory[existingIndex] = action.payload;
        } else {
          state.roundHistory.push(action.payload);
        }
      }
    },
    clearRoundResult(state) {
      state.roundResult = null;
    },
  },
});

export const {
  setSnapshot,
  updatePhase,
  setDraftSaved,
  upsertSubmissionDebug,
  setRoundResult,
  clearRoundResult,
} = jamoSlice.actions;

export default jamoSlice;
