import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  JamoChatMessage,
  JamoGameData,
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
  successLog: JamoSuccessEntry[];
  chatLog: JamoChatMessage[];
  roundResult: JamoRoundResult | null;
  submissionLimit: number;
}

const initialState: JamoState = {
  players: [],
  you: null,
  gameData: {
    phase: 'waiting',
    roundNo: 0,
    roundDuration: 180,
    timeLeft: 0,
    endsAt: null,
  },
  board: {},
  successLog: [],
  chatLog: [],
  roundResult: null,
  submissionLimit: 10,
};

const jamoSlice = createSlice({
  name: 'jamo',
  initialState,
  reducers: {
    setSnapshot(state, action: PayloadAction<JamoStateSnapshot>) {
      if (state.gameData.roundNo !== action.payload.gameData.roundNo) {
        state.roundResult = null;
      }
      state.players = action.payload.players ?? [];
      state.you = action.payload.you ?? null;
      state.gameData = action.payload.gameData;
      state.board = action.payload.board ?? {};
      state.successLog = action.payload.successLog ?? [];
      state.chatLog = action.payload.chatLog ?? [];
      state.submissionLimit = action.payload.submissionLimit ?? 10;
    },
    updatePhase(
      state,
      action: PayloadAction<{
        phase: JamoGameData['phase'];
        timeLeft: number;
        endsAt: number | null;
        roundNo: number;
        roundDuration: number;
      }>
    ) {
      state.gameData.phase = action.payload.phase;
      state.gameData.timeLeft = action.payload.timeLeft;
      state.gameData.endsAt = action.payload.endsAt;
      state.gameData.roundNo = action.payload.roundNo;
      state.gameData.roundDuration = action.payload.roundDuration;
    },
    appendChatMessage(state, action: PayloadAction<JamoChatMessage>) {
      state.chatLog.push(action.payload);
      if (state.chatLog.length > 200) {
        state.chatLog = state.chatLog.slice(-200);
      }
    },
    setRoundResult(state, action: PayloadAction<JamoRoundResult | null>) {
      state.roundResult = action.payload;
    },
    clearRoundResult(state) {
      state.roundResult = null;
    },
  },
});

export const {
  setSnapshot,
  updatePhase,
  appendChatMessage,
  setRoundResult,
  clearRoundResult,
} = jamoSlice.actions;

export default jamoSlice;
