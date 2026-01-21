import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AnimalEventLogEntry,
  AnimalGameData,
  AnimalIntelEntry,
  AnimalPlaceSummary,
  AnimalPlayer,
  AnimalRoleInfo,
  AnimalRoundResult,
  AnimalStateSnapshot,
} from '@/types/animal';

interface AnimalState {
  players: AnimalPlayer[];
  you: AnimalPlayer | null;
  roleCard: AnimalRoleInfo | null;
  gameData: AnimalGameData;
  placeSummary: AnimalPlaceSummary[];
  intel: AnimalIntelEntry[];
  eventLog: AnimalEventLogEntry[];
  roundResult: AnimalRoundResult | null;
}

const initialState: AnimalState = {
  players: [],
  you: null,
  roleCard: null,
  gameData: {
    phase: 'ready',
    roundNo: 0,
    totalRounds: 3,
    timeLeft: 0,
    roundDuration: 180,
    endsAt: null,
    placeCapacities: { A: 1, B: 1, C: 1, D: 1 },
    eventLog: [],
  },
  placeSummary: [],
  intel: [],
  eventLog: [],
  roundResult: null,
};

const animalSlice = createSlice({
  name: 'animal',
  initialState,
  reducers: {
    setSnapshot(state, action: PayloadAction<AnimalStateSnapshot>) {
      state.players = action.payload.players ?? [];
      state.you = action.payload.you ?? null;
      state.roleCard = action.payload.roleCard ?? null;
      state.gameData = action.payload.gameData;
      state.placeSummary = action.payload.placeSummary ?? [];
      state.intel = action.payload.intel ?? [];
      state.eventLog = action.payload.gameData.eventLog ?? [];
    },
    updatePhase(
      state,
      action: PayloadAction<{
        phase: AnimalGameData['phase'];
        timeLeft: number;
        endsAt: number | null;
      }>
    ) {
      state.gameData.phase = action.payload.phase;
      state.gameData.timeLeft = action.payload.timeLeft;
      state.gameData.endsAt = action.payload.endsAt;
    },
    appendEventLog(state, action: PayloadAction<AnimalEventLogEntry>) {
      state.eventLog.push(action.payload);
      state.gameData.eventLog.push(action.payload);
    },
    setRoundResult(state, action: PayloadAction<AnimalRoundResult | null>) {
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
  appendEventLog,
  setRoundResult,
  clearRoundResult,
} = animalSlice.actions;

export default animalSlice;
