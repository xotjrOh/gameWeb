import _ from 'lodash';
import { Server } from 'socket.io';
import { GAME_STATUS } from '../utils/constants';
import { JamoRoom, Player } from '@/types/room';
import {
  JamoChatMessage,
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
const JAMO_SUBMISSION_LIMIT = 10;
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
const DICT_API_URL = 'https://krdict.korean.go.kr/api/search';

type WordCacheEntry = { exists: boolean; expiresAt: number };
const wordCache = new Map<string, WordCacheEntry>();
let dictKeyWarned = false;

const makeId = () =>
  `jamo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const ensureGameData = (room: JamoRoom) => {
  room.gameData.board ??= {};
  room.gameData.assignmentsByPlayerId ??= {};
  room.gameData.submissionCounts ??= {};
  room.gameData.usedWords ??= {};
  room.gameData.successLog ??= [];
  room.gameData.chatLog ??= [];
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

export const createJamoBoard = () => {
  const shuffled = _.shuffle(JAMO_POOL);
  const board: Record<number, string> = {};
  shuffled.forEach((jamo, index) => {
    board[index + 1] = jamo;
  });
  return board;
};

export const assignJamoToPlayers = (room: JamoRoom) => {
  const playerCount = room.players.length;
  const perPlayer = playerCount > 0 ? Math.floor(24 / playerCount) : 0;
  const positions = _.shuffle(Array.from({ length: 24 }, (_, i) => i + 1));
  const assignments: Record<string, number[]> = {};

  room.players.forEach((player, index) => {
    const start = index * perPlayer;
    const assigned = positions.slice(start, start + perPlayer);
    assignments[player.id] = assigned;
  });

  return assignments;
};

export const startJamoRound = (room: JamoRoom, duration: number) => {
  const nextDuration = duration > 0 ? duration : room.gameData.roundDuration;
  room.status = GAME_STATUS.IN_PROGRESS;
  room.gameData.phase = 'discuss';
  room.gameData.roundNo += 1;
  room.gameData.roundDuration = nextDuration;
  room.gameData.timeLeft = nextDuration;
  room.gameData.endsAt = Date.now() + nextDuration * 1000;

  ensureGameData(room);
  room.gameData.board = createJamoBoard();
  room.gameData.assignmentsByPlayerId = assignJamoToPlayers(room);
  room.gameData.submissionCounts = {};
  room.gameData.usedWords = {};
  room.gameData.successLog = [];
  room.gameData.chatLog = [];
  room.gameData.lastRoundResult = undefined;

  room.players.forEach((player) => {
    const jamoPlayer = player as Player & JamoPlayerData;
    jamoPlayer.score = 0;
    jamoPlayer.successCount = 0;
    jamoPlayer.firstSuccessAt = null;
  });
};

export const endJamoRound = (room: JamoRoom): JamoRoundResult => {
  const players = room.players as (Player & JamoPlayerData)[];
  const successPlayers = players.filter((player) => player.successCount > 0);
  const successPlayerCount = successPlayers.length;

  let winner: {
    playerId: string;
    playerName: string;
    score: number;
    firstSuccessAt: number;
  } | null = null;
  successPlayers.forEach((player) => {
    const playerTime = player.firstSuccessAt ?? Number.MAX_SAFE_INTEGER;
    if (
      !winner ||
      player.score > winner.score ||
      (player.score === winner.score && playerTime < winner.firstSuccessAt)
    ) {
      winner = {
        playerId: player.id,
        playerName: player.name,
        score: player.score,
        firstSuccessAt: playerTime,
      };
    }
  });

  return {
    roundNo: room.gameData.roundNo,
    successPlayerCount,
    winner: winner
      ? {
          playerId: winner.playerId,
          playerName: winner.playerName,
          score: winner.score,
        }
      : null,
    successes: room.gameData.successLog ?? [],
  };
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
  const submissionCounts: Record<string, number> =
    room.gameData.submissionCounts ?? {};
  const playersView = room.players.map((player) => {
    const jamoPlayer = player as Player & JamoPlayerData;
    return {
      id: player.id,
      name: player.name,
      socketId: player.socketId,
      score: jamoPlayer.score ?? 0,
      successCount: jamoPlayer.successCount ?? 0,
      submissionCount: submissionCounts[player.id] ?? 0,
    };
  });

  const you =
    playersView.find((player) => player.id === viewerId) ??
    ({
      id: viewerId,
      name: room.host.name,
      socketId: room.host.socketId,
      score: 0,
      successCount: 0,
      submissionCount: submissionCounts[viewerId] ?? 0,
    } as const);

  const boardView: Record<number, string | null> = {};
  for (let index = 1; index <= 24; index += 1) {
    if (isHostView || assignedNumbers.includes(index)) {
      boardView[index] = board[index] ?? null;
    } else {
      boardView[index] = null;
    }
  }

  return {
    you: {
      ...you,
      assignedNumbers,
    },
    players: playersView,
    board: boardView,
    gameData: {
      phase: room.gameData.phase,
      roundNo: room.gameData.roundNo,
      roundDuration: room.gameData.roundDuration,
      timeLeft: room.gameData.timeLeft,
      endsAt: room.gameData.endsAt ?? null,
    },
    successLog: room.gameData.successLog ?? [],
    chatLog: room.gameData.chatLog ?? [],
    submissionLimit: JAMO_SUBMISSION_LIMIT,
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

export const appendChatMessage = (
  room: JamoRoom,
  player: Player,
  message: string
) => {
  ensureGameData(room);
  const entry: JamoChatMessage = {
    id: makeId(),
    playerId: player.id,
    playerName: player.name,
    message,
    sentAt: Date.now(),
  };
  room.gameData.chatLog?.push(entry);
  if ((room.gameData.chatLog?.length ?? 0) > 200) {
    room.gameData.chatLog = room.gameData.chatLog?.slice(-200) ?? [];
  }
  return entry;
};

export const processSubmission = async (
  room: JamoRoom,
  player: Player & JamoPlayerData,
  numbersInput: string
): Promise<{ accepted: boolean; entry?: JamoSuccessEntry }> => {
  ensureGameData(room);
  if (room.gameData.phase !== 'discuss') {
    return { accepted: false };
  }

  const submissionCounts = room.gameData.submissionCounts ?? {};
  const currentCount = submissionCounts[player.id] ?? 0;
  if (currentCount >= JAMO_SUBMISSION_LIMIT) {
    return { accepted: false };
  }
  submissionCounts[player.id] = currentCount + 1;
  room.gameData.submissionCounts = submissionCounts;

  const numbers = parseNumberList(numbersInput);
  if (!numbers) {
    return { accepted: false };
  }

  const board: Record<number, string> = room.gameData.board ?? {};
  const jamos = numbers.map((num) => board[num]).filter(Boolean) as string[];
  if (jamos.length !== numbers.length) {
    return { accepted: false };
  }

  const word = composeWordFromJamo(jamos);
  if (!word || word.length < 2) {
    return { accepted: false };
  }

  if (room.gameData.usedWords?.[word]) {
    return { accepted: false };
  }

  const exists = await checkDictionary(word);
  if (!exists) {
    return { accepted: false };
  }

  room.gameData.usedWords ??= {};
  room.gameData.usedWords[word] = true;

  const score = numbers.reduce((sum, num) => sum + num, 0);
  const submittedAt = Date.now();

  const entry: JamoSuccessEntry = {
    id: makeId(),
    playerId: player.id,
    playerName: player.name,
    word,
    numbers,
    score,
    submittedAt,
  };

  room.gameData.successLog ??= [];
  room.gameData.successLog.push(entry);

  player.score += score;
  player.successCount += 1;
  if (!player.firstSuccessAt) {
    player.firstSuccessAt = submittedAt;
  }

  return { accepted: true, entry };
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
    roundDuration: room.gameData.roundDuration,
  });
};
