import _ from 'lodash';
import { Server } from 'socket.io';
import { GAME_STATUS } from '../utils/constants';
import { JamoRoom, Player } from '@/types/room';
import {
  JamoAssignmentSummary,
  JamoDraftSubmission,
  JamoFinalResult,
  JamoOwnershipMap,
  JamoPlayerData,
  JamoRoundResult,
  JamoStateSnapshot,
  JamoSuccessEntry,
} from '@/types/jamo';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';

const JAMO_CONSONANTS = [
  'ㄱ',
  'ㄴ',
  'ㄷ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅅ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];
const JAMO_VOWELS = [
  'ㅏ',
  'ㅑ',
  'ㅓ',
  'ㅕ',
  'ㅗ',
  'ㅛ',
  'ㅜ',
  'ㅠ',
  'ㅡ',
  'ㅣ',
];
const JAMO_POOL = [...JAMO_CONSONANTS, ...JAMO_VOWELS];
const DICT_CACHE_TTL_MS = 10 * 60 * 1000;

const INITIAL_INDEX: Record<string, number> = {
  ㄱ: 0,
  ㄴ: 2,
  ㄷ: 3,
  ㄹ: 5,
  ㅁ: 6,
  ㅂ: 7,
  ㅅ: 9,
  ㅇ: 11,
  ㅈ: 12,
  ㅊ: 14,
  ㅋ: 15,
  ㅌ: 16,
  ㅍ: 17,
  ㅎ: 18,
};

const MEDIAL_INDEX: Record<string, number> = {
  ㅏ: 0,
  ㅑ: 2,
  ㅓ: 4,
  ㅕ: 6,
  ㅗ: 8,
  ㅛ: 12,
  ㅜ: 13,
  ㅠ: 17,
  ㅡ: 18,
  ㅣ: 20,
};

const FINAL_INDEX: Record<string, number> = {
  ㄱ: 1,
  ㄴ: 4,
  ㄷ: 7,
  ㄹ: 8,
  ㅁ: 16,
  ㅂ: 17,
  ㅅ: 19,
  ㅇ: 21,
  ㅈ: 22,
  ㅊ: 23,
  ㅋ: 24,
  ㅌ: 25,
  ㅍ: 26,
  ㅎ: 27,
};

const DICT_API_KEY =
  process.env.OPENDICT_API_KEY ?? process.env.DICT_API_KEY ?? '';
const DICT_API_ENABLED = Boolean(DICT_API_KEY);
const DICT_API_URL = 'https://krdict.korean.go.kr/api/search';

type WordCacheEntry = { exists: boolean; expiresAt: number };
const wordCache = new Map<string, WordCacheEntry>();
const wordInflight = new Map<string, Promise<boolean>>();
let dictKeyWarned = false;

const makeId = () =>
  `jamo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const ensureGameData = (room: JamoRoom) => {
  room.gameData.maxRounds ??= 5;
  room.gameData.board ??= {};
  room.gameData.assignmentsByPlayerId ??= {};
  room.gameData.ownershipByNumber ??= {};
  room.gameData.draftByPlayerId ??= {};
  room.gameData.wordFirstByPlayerId ??= {};
  room.gameData.successLog ??= [];
  room.gameData.roundHistory ??= [];
  room.gameData.finalResult ??= null;
};

const isConsonant = (char: string) =>
  Object.prototype.hasOwnProperty.call(INITIAL_INDEX, char);
const isVowel = (char: string) =>
  Object.prototype.hasOwnProperty.call(MEDIAL_INDEX, char);

const composeSyllable = (
  initial: string,
  vowel: string,
  final: string | null
) => {
  const initialIndex = INITIAL_INDEX[initial];
  const medialIndex = MEDIAL_INDEX[vowel];
  if (initialIndex === undefined || medialIndex === undefined) {
    return null;
  }
  const finalIndex = final ? (FINAL_INDEX[final] ?? 0) : 0;
  if (final && finalIndex === 0) {
    return null;
  }
  const codePoint =
    0xac00 + initialIndex * 21 * 28 + medialIndex * 28 + finalIndex;
  return String.fromCharCode(codePoint);
};

export const composeWordFromJamo = (jamos: string[]) => {
  if (jamos.length < 2) {
    return null;
  }
  const syllables: string[] = [];
  let index = 0;
  while (index < jamos.length) {
    const initial = jamos[index];
    const vowel = jamos[index + 1];
    if (!initial || !vowel || !isConsonant(initial) || !isVowel(vowel)) {
      return null;
    }

    let final: string | null = null;
    const next = jamos[index + 2];
    if (next && isConsonant(next)) {
      const afterNext = jamos[index + 3];
      if (!afterNext || !isVowel(afterNext)) {
        final = next;
        index += 3;
      } else {
        index += 2;
      }
    } else {
      index += 2;
    }

    const syllable = composeSyllable(initial, vowel, final);
    if (!syllable) {
      return null;
    }
    syllables.push(syllable);
  }

  return syllables.join('');
};

const parseNumberList = (value: string): number[] | null => {
  if (!value) {
    return null;
  }
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return null;
  }
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((num) => !Number.isInteger(num))) {
    return null;
  }
  const unique = new Set(numbers);
  if (unique.size !== numbers.length) {
    return null;
  }
  if (numbers.some((num) => num < 1 || num > 24)) {
    return null;
  }
  return numbers;
};

const fetchDictionaryMatch = async (word: string): Promise<boolean> => {
  if (!DICT_API_KEY) {
    if (!dictKeyWarned) {
      console.warn('[jamo] dictionary API key is missing');
      dictKeyWarned = true;
    }
    return false;
  }

  const url = new URL(DICT_API_URL);
  url.searchParams.set('key', DICT_API_KEY);
  url.searchParams.set('q', word);
  url.searchParams.set('part', 'word');
  url.searchParams.set('sort', 'popular');
  url.searchParams.set('num', '20');
  url.searchParams.set('start', '1');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      return false;
    }
    const xml = await response.text();
    const wordRegex = /<word>([^<]+)<\/word>/g;
    let match: RegExpExecArray | null;
    while ((match = wordRegex.exec(xml)) !== null) {
      if (match[1]?.trim() === word) {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

export const checkDictionary = async (word: string): Promise<boolean> => {
  const cached = wordCache.get(word);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.exists;
  }

  const exists = await fetchDictionaryMatch(word);
  wordCache.set(word, { exists, expiresAt: now + DICT_CACHE_TTL_MS });
  return exists;
};

export const isDictionaryEnabled = DICT_API_ENABLED;

export const getCachedDictionaryResult = (word: string): boolean | null => {
  const cached = wordCache.get(word);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.exists;
  }
  return null;
};

export const resolveDictionaryResult = (word: string): Promise<boolean> => {
  const cached = getCachedDictionaryResult(word);
  if (cached !== null) {
    return Promise.resolve(cached);
  }
  const inflight = wordInflight.get(word);
  if (inflight) {
    return inflight;
  }
  const promise = checkDictionary(word).finally(() => {
    wordInflight.delete(word);
  });
  wordInflight.set(word, promise);
  return promise;
};

export const createJamoBoard = () => {
  const shuffled = _.shuffle(JAMO_POOL);
  const board: Record<number, string> = {};
  shuffled.forEach((jamo, index) => {
    board[index + 1] = jamo;
  });
  return board;
};

export const distributeJamoBoard = (room: JamoRoom) => {
  ensureGameData(room);
  const board = createJamoBoard();
  const { assignments, ownership, perPlayer } = assignJamoToPlayers(room);

  room.gameData.board = board;
  room.gameData.assignmentsByPlayerId = assignments;
  room.gameData.ownershipByNumber = ownership;
  room.gameData.draftByPlayerId = {};
  room.gameData.wordFirstByPlayerId = {};
  room.gameData.successLog = [];
  room.gameData.lastRoundResult = undefined;
  room.gameData.timeLeft = 0;
  room.gameData.endsAt = null;
  room.gameData.phase = 'waiting';
  room.status = GAME_STATUS.PENDING;

  return { perPlayer };
};

export const resetJamoRound = (room: JamoRoom) => {
  ensureGameData(room);
  room.gameData.phase = 'waiting';
  room.gameData.roundNo = 0;
  room.gameData.timeLeft = 0;
  room.gameData.endsAt = null;
  room.status = GAME_STATUS.PENDING;

  room.gameData.board = {};
  room.gameData.assignmentsByPlayerId = {};
  room.gameData.ownershipByNumber = {};
  room.gameData.draftByPlayerId = {};
  room.gameData.wordFirstByPlayerId = {};
  room.gameData.successLog = [];
  room.gameData.roundHistory = [];
  room.gameData.finalResult = null;
  room.gameData.lastRoundResult = undefined;

  room.players.forEach((player) => {
    const jamoPlayer = player as Player & JamoPlayerData;
    jamoPlayer.totalScore = 0;
    jamoPlayer.successCount = 0;
    jamoPlayer.lastScoredAt = null;
  });
};

export const assignJamoToPlayers = (room: JamoRoom) => {
  const playerCount = room.players.length;
  const perPlayer = playerCount > 0 ? Math.floor(24 / playerCount) : 0;
  const positions = _.shuffle(Array.from({ length: 24 }, (_, i) => i + 1));
  const assignments: Record<string, number[]> = {};
  const ownership: JamoOwnershipMap = {};

  for (let index = 1; index <= 24; index += 1) {
    ownership[index] = null;
  }

  room.players.forEach((player, index) => {
    const start = index * perPlayer;
    const assigned = positions.slice(start, start + perPlayer);
    assignments[player.id] = assigned;
    assigned.forEach((num) => {
      ownership[num] = { playerId: player.id, playerName: player.name };
    });
  });

  return { assignments, ownership, perPlayer };
};

export const startJamoRound = (room: JamoRoom, duration: number) => {
  ensureGameData(room);
  const nextDuration = duration > 0 ? duration : room.gameData.roundDuration;
  room.status = GAME_STATUS.IN_PROGRESS;
  room.gameData.phase = 'discuss';
  room.gameData.roundNo += 1;
  room.gameData.roundDuration = nextDuration;
  room.gameData.timeLeft = nextDuration;
  room.gameData.endsAt = Date.now() + nextDuration * 1000;

  room.gameData.draftByPlayerId = {};
  room.gameData.wordFirstByPlayerId = {};
  room.gameData.successLog = [];
  room.gameData.lastRoundResult = undefined;
  room.gameData.finalResult = null;
};

export const setJamoMaxRounds = (room: JamoRoom, maxRounds: number) => {
  ensureGameData(room);
  room.gameData.maxRounds = maxRounds;
  const players = room.players as (Player & JamoPlayerData)[];
  if (room.gameData.phase !== 'discuss' && room.gameData.roundNo >= maxRounds) {
    room.gameData.finalResult = buildFinalResult(
      players,
      room.gameData.roundNo
    );
    return;
  }
  if (room.gameData.roundNo < maxRounds) {
    room.gameData.finalResult = null;
  }
};

const sortFinalStandings = (
  players: Array<Player & JamoPlayerData>
): Array<Player & JamoPlayerData> =>
  [...players].sort((a, b) => {
    if ((b.totalScore ?? 0) !== (a.totalScore ?? 0)) {
      return (b.totalScore ?? 0) - (a.totalScore ?? 0);
    }
    if ((b.successCount ?? 0) !== (a.successCount ?? 0)) {
      return (b.successCount ?? 0) - (a.successCount ?? 0);
    }
    const aLast = a.lastScoredAt ?? Number.MAX_SAFE_INTEGER;
    const bLast = b.lastScoredAt ?? Number.MAX_SAFE_INTEGER;
    if (aLast !== bLast) {
      return aLast - bLast;
    }
    return a.id.localeCompare(b.id);
  });

const buildFinalResult = (
  players: Array<Player & JamoPlayerData>,
  roundCount: number
): JamoFinalResult => {
  const sorted = sortFinalStandings(players);
  const standings = sorted.map((player) => ({
    playerId: player.id,
    playerName: player.name,
    totalScore: player.totalScore ?? 0,
    successCount: player.successCount ?? 0,
    lastScoredAt: player.lastScoredAt ?? null,
  }));
  const winner = standings[0]
    ? {
        playerId: standings[0].playerId,
        playerName: standings[0].playerName,
        totalScore: standings[0].totalScore,
        successCount: standings[0].successCount,
      }
    : null;

  return {
    decidedAt: Date.now(),
    roundCount,
    winner,
    standings,
  };
};

export const endJamoRound = async (
  room: JamoRoom
): Promise<JamoRoundResult> => {
  ensureGameData(room);
  const players = room.players as (Player & JamoPlayerData)[];
  const drafts = room.gameData.draftByPlayerId ?? {};
  const wordFirstByPlayerId = room.gameData.wordFirstByPlayerId ?? {};
  const candidatesByWord = new Map<
    string,
    Array<{ draft: JamoDraftSubmission; firstSubmittedAt: number }>
  >();
  const perPlayerDelta: JamoRoundResult['perPlayerDelta'] = {};

  const pendingDrafts = Object.values(drafts).filter(
    (draft) => draft.word && draft.word.length >= 2 && draft.dictOk === null
  );
  if (pendingDrafts.length > 0) {
    const resolved = await Promise.all(
      pendingDrafts.map((draft) =>
        resolveDictionaryResult(draft.word as string)
      )
    );
    pendingDrafts.forEach((draft, index) => {
      draft.dictOk = resolved[index];
    });
  }

  players.forEach((player) => {
    perPlayerDelta[player.id] = {
      gainedScore: 0,
      success: false,
    };
  });

  players.forEach((player) => {
    const draft = drafts[player.id];
    if (
      !draft ||
      !draft.word ||
      draft.word.length < 2 ||
      !draft.dictOk ||
      !draft.parsedOk
    ) {
      return;
    }

    const firstSubmittedAt =
      wordFirstByPlayerId[player.id]?.[draft.word] ?? draft.submittedAt;
    const list = candidatesByWord.get(draft.word) ?? [];
    list.push({ draft, firstSubmittedAt });
    candidatesByWord.set(draft.word, list);
  });

  const successes: JamoSuccessEntry[] = [];
  candidatesByWord.forEach((list, word) => {
    const sorted = [...list].sort(
      (a, b) => a.firstSubmittedAt - b.firstSubmittedAt
    );
    const winnerCandidate = sorted[0];
    if (!winnerCandidate) {
      return;
    }
    successes.push({
      id: makeId(),
      playerId: winnerCandidate.draft.playerId,
      playerName: winnerCandidate.draft.playerName,
      word,
      numbers: winnerCandidate.draft.numbers,
      score: winnerCandidate.draft.score,
      submittedAt: winnerCandidate.firstSubmittedAt,
    });
  });

  const sortedSuccesses = successes.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.submittedAt - b.submittedAt;
  });

  sortedSuccesses.forEach((entry) => {
    const player = players.find((p) => p.id === entry.playerId);
    if (!player) {
      return;
    }
    player.totalScore = (player.totalScore ?? 0) + entry.score;
    player.successCount = (player.successCount ?? 0) + 1;
    player.lastScoredAt = entry.submittedAt;
    perPlayerDelta[player.id] = {
      gainedScore: entry.score,
      success: true,
      word: entry.word,
    };
  });

  room.gameData.successLog = sortedSuccesses;

  const winner = sortedSuccesses[0]
    ? {
        playerId: sortedSuccesses[0].playerId,
        playerName: sortedSuccesses[0].playerName,
        score: sortedSuccesses[0].score,
      }
    : null;

  const result: JamoRoundResult = {
    roundNo: room.gameData.roundNo,
    durationSec: room.gameData.roundDuration,
    successCount: sortedSuccesses.length,
    winner,
    successes: sortedSuccesses,
    perPlayerDelta,
    finalizedAt: Date.now(),
  };

  room.gameData.roundHistory ??= [];
  room.gameData.roundHistory.push(result);
  room.gameData.lastRoundResult = result;

  if (room.gameData.roundNo >= room.gameData.maxRounds) {
    room.gameData.finalResult = buildFinalResult(
      players,
      room.gameData.roundNo
    );
  } else {
    room.gameData.finalResult = null;
  }

  return result;
};

export const buildJamoSnapshot = (
  room: JamoRoom,
  viewerId: string,
  isHostView: boolean
): JamoStateSnapshot => {
  ensureGameData(room);
  const board: Record<number, string> = room.gameData.board ?? {};
  const assignments: Record<string, number[]> =
    room.gameData.assignmentsByPlayerId ?? {};
  const assignedNumbers = [...(assignments[viewerId] ?? [])].sort(
    (a, b) => a - b
  );
  const draftByPlayerId = room.gameData.draftByPlayerId ?? {};
  const playersView = room.players.map((player) => {
    const jamoPlayer = player as Player & JamoPlayerData;
    const hasDraft = Boolean(draftByPlayerId[player.id]);
    return {
      id: player.id,
      name: player.name,
      socketId: player.socketId,
      totalScore: jamoPlayer.totalScore ?? 0,
      successCount: jamoPlayer.successCount ?? 0,
      submissionCount: hasDraft ? 1 : 0,
    };
  });

  const you =
    playersView.find((player) => player.id === viewerId) ??
    ({
      id: viewerId,
      name: room.host.name,
      socketId: room.host.socketId,
      totalScore: 0,
      successCount: 0,
      submissionCount: draftByPlayerId[viewerId] ? 1 : 0,
    } as const);

  const boardView: Record<number, string | null> = {};
  for (let index = 1; index <= 24; index += 1) {
    if (isHostView || assignedNumbers.includes(index)) {
      boardView[index] = board[index] ?? null;
    } else {
      boardView[index] = null;
    }
  }

  const ownershipByNumber = room.gameData.ownershipByNumber ?? {};
  const assignmentsSummary: JamoAssignmentSummary[] = room.players.map(
    (player) => {
      const numbers = [...(assignments[player.id] ?? [])].sort((a, b) => a - b);
      const jamos = numbers
        .map((num) => board[num])
        .filter(Boolean) as string[];
      return {
        playerId: player.id,
        playerName: player.name,
        numbers,
        jamos,
      };
    }
  );

  const draftSubmittedAt = draftByPlayerId[viewerId]?.submittedAt ?? null;

  return {
    you: {
      ...you,
      assignedNumbers,
    },
    players: playersView,
    board: boardView,
    ownership: isHostView ? ownershipByNumber : undefined,
    assignments: isHostView ? assignmentsSummary : undefined,
    draftSubmissions: isHostView ? draftByPlayerId : undefined,
    draftSubmittedAt,
    gameData: {
      phase: room.gameData.phase,
      roundNo: room.gameData.roundNo,
      maxRounds: room.gameData.maxRounds,
      roundDuration: room.gameData.roundDuration,
      timeLeft: room.gameData.timeLeft,
      endsAt: room.gameData.endsAt ?? null,
    },
    successLog: room.gameData.successLog ?? [],
    roundHistory: room.gameData.roundHistory ?? [],
    finalResult: room.gameData.finalResult ?? null,
    isHostView,
  };
};

export const emitJamoSnapshots = (
  room: JamoRoom,
  io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
  room.players.forEach((player) => {
    const snapshot = buildJamoSnapshot(room, player.id, false);
    io.to(player.socketId).emit('jamo_state_snapshot', snapshot);
  });

  if (room.host.socketId) {
    const hostSnapshot = buildJamoSnapshot(room, room.host.id, true);
    io.to(room.host.socketId).emit('jamo_state_snapshot', hostSnapshot);
  }
};

export const recordDraftSubmission = async (
  room: JamoRoom,
  player: Player & JamoPlayerData,
  rawInput: string
): Promise<{ accepted: boolean; draft?: JamoDraftSubmission }> => {
  ensureGameData(room);
  if (room.gameData.phase !== 'discuss') {
    return { accepted: false };
  }

  const submittedAt = Date.now();
  const trimmed = rawInput?.trim() ?? '';
  if (!trimmed) {
    return { accepted: false };
  }

  const board: Record<number, string> = room.gameData.board ?? {};
  const numbers = parseNumberList(trimmed);
  const parsedOk = Boolean(numbers);
  const parsedNumbers = numbers ?? [];
  const jamos = parsedOk
    ? parsedNumbers.map((num) => board[num]).filter(Boolean)
    : [];
  const jamosOk = parsedOk && jamos.length === parsedNumbers.length;
  const word = jamosOk ? composeWordFromJamo(jamos as string[]) : null;
  const score = parsedOk ? parsedNumbers.reduce((sum, num) => sum + num, 0) : 0;
  const dictOk =
    word && word.length >= 2 ? getCachedDictionaryResult(word) : false;

  const draft: JamoDraftSubmission = {
    playerId: player.id,
    playerName: player.name,
    raw: trimmed,
    numbers: parsedNumbers,
    jamos: jamosOk ? (jamos as string[]) : [],
    word,
    dictOk,
    score,
    submittedAt,
    parsedOk: parsedOk && jamosOk,
  };

  room.gameData.draftByPlayerId ??= {};
  room.gameData.draftByPlayerId[player.id] = draft;

  if (word) {
    room.gameData.wordFirstByPlayerId ??= {};
    room.gameData.wordFirstByPlayerId[player.id] ??= {};
    if (!room.gameData.wordFirstByPlayerId[player.id][word]) {
      room.gameData.wordFirstByPlayerId[player.id][word] = submittedAt;
    }
  }

  return { accepted: true, draft };
};

export const emitJamoPhaseUpdate = (
  room: JamoRoom,
  io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
  io.to(room.roomId).emit('jamo_round_phase_changed', {
    phase: room.gameData.phase,
    timeLeft: room.gameData.timeLeft,
    endsAt: room.gameData.endsAt ?? null,
    roundNo: room.gameData.roundNo,
    maxRounds: room.gameData.maxRounds,
    roundDuration: room.gameData.roundDuration,
  });
};
