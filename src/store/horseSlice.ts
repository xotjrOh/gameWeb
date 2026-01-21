import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Player } from '@/types/room';
import {
  HorsePlayerData,
  HorseGameData,
  HorsePosition,
  RoundData,
} from '@/types/horse';

interface HorseInitialState {
  players: (Player & HorsePlayerData)[];
  gameData: HorseGameData;
  statusInfo: Player & HorsePlayerData;
}

const initialState: HorseInitialState = {
  players: [],
  gameData: {
    horses: [],
    positions: [],
    finishLine: 9,
    isTimeover: true,
    isRoundStarted: false,
    rounds: [],
    bets: {},
    timeLeft: 0,
    rankingLocked: false,
  },
  statusInfo: {
    id: 'sessionId',
    name: '접속한 닉네임',
    socketId: 'socketId',

    dummyName: '할당되지않음',
    horse: '할당되지않음',
    isSolo: false,
    chips: 0,
    chipDiff: 0,
    rounds: [],
    voteHistory: [],
    isBetLocked: false,
    isVoteLocked: false,
    memo: [],
  },
};

const horseSlice = createSlice({
  name: 'horse',
  initialState,
  reducers: {
    setPlayers(state, action: PayloadAction<(Player & HorsePlayerData)[]>) {
      state.players = action.payload;
    },
    setGameData(state, action: PayloadAction<HorseGameData>) {
      state.gameData = action.payload;
    },
    setStatusInfo(state, action: PayloadAction<Player & HorsePlayerData>) {
      state.statusInfo = action.payload;
    },

    updateHorses(state, action: PayloadAction<string[]>) {
      state.gameData.horses = action.payload; // horses 필드만 업데이트
    },
    updatePositions(state, action: PayloadAction<HorsePosition[]>) {
      state.gameData.positions = action.payload; // positions 필드만 업데이트
    },
    updateFinishLine(state, action: PayloadAction<number>) {
      state.gameData.finishLine = action.payload; // finishLine 필드만 업데이트
    },
    updateIsTimeover(state, action: PayloadAction<boolean>) {
      state.gameData.isTimeover = action.payload; // isTimeover 필드만 업데이트
    },

    updateChip(state, action: PayloadAction<number>) {
      state.statusInfo.chips = action.payload; // statusInfo.chip 필드만 업데이트
    },
    updateChipDiff(state, action: PayloadAction<number>) {
      state.statusInfo.chipDiff = action.payload; // statusInfo.chipDiff 필드만 업데이트
    },
    updatePersonalRounds(state, action: PayloadAction<RoundData[][]>) {
      state.statusInfo.rounds = action.payload; // statusInfo.rounds 필드만 업데이트
    },
    updateVoteHistory(state, action: PayloadAction<string[]>) {
      state.statusInfo.voteHistory = action.payload; // statusInfo.rounds 필드만 업데이트
    },
    updateIsBetLocked(state, action: PayloadAction<boolean>) {
      state.statusInfo.isBetLocked = action.payload; // statusInfo.isBetLocked 필드만 업데이트
    },
    updateIsVoteLocked(state, action: PayloadAction<boolean>) {
      state.statusInfo.isVoteLocked = action.payload; // statusInfo.isVoteLocked 필드만 업데이트
    },
    updateMemo(state, action: PayloadAction<{ index: number; memo: string }>) {
      const { index, memo } = action.payload; // statusInfo.memo 필드만 업데이트
      state.statusInfo.memo[index] = memo;
    },

    updateIsRoundStarted(state, action: PayloadAction<boolean>) {
      state.gameData.isRoundStarted = action.payload; // isRoundStarted 필드만 업데이트
    },
    updateRounds(state, action: PayloadAction<RoundData[][]>) {
      state.gameData.rounds = action.payload; // rounds 필드만 업데이트
    },
  },
});

export const {
  setPlayers,
  setGameData,
  setStatusInfo,

  updateHorses,
  updatePositions,
  updateFinishLine,
  updateIsTimeover,
  updateChip,
  updateChipDiff,
  updatePersonalRounds,
  updateVoteHistory,
  updateIsBetLocked,
  updateIsVoteLocked,
  updateMemo,
  updateIsRoundStarted,
  updateRounds,
} = horseSlice.actions; // state 변경함수들 남음
export default horseSlice;
