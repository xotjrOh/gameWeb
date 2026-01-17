import fs from 'fs';
import path from 'path';
import { GAME_CATALOG } from '@/lib/gameCatalog';

interface LeaderboardEntry {
  wins: number;
  lastWinAt: string;
}

interface LeaderboardStore {
  version: 1;
  updatedAt: string;
  games: Record<string, Record<string, LeaderboardEntry>>;
}

interface LeaderboardRankingItem {
  rank: number;
  name: string;
  wins: number;
  lastWinAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

const createEmptyStore = (): LeaderboardStore => {
  const games: Record<string, Record<string, LeaderboardEntry>> = {};
  GAME_CATALOG.forEach((game) => {
    games[game.id] = {};
  });

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    games,
  };
};

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const normalizeStore = (raw: unknown): LeaderboardStore => {
  const base = createEmptyStore();
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const rawStore = raw as Partial<LeaderboardStore>;
  if (typeof rawStore.updatedAt === 'string') {
    base.updatedAt = rawStore.updatedAt;
  }

  if (typeof rawStore.version === 'number') {
    base.version = 1;
  }

  const rawGames = rawStore.games;
  if (!rawGames || typeof rawGames !== 'object') {
    return base;
  }

  const normalizedGames: Record<string, Record<string, LeaderboardEntry>> = {
    ...base.games,
  };

  Object.entries(rawGames).forEach(([gameId, rawGame]) => {
    if (!rawGame || typeof rawGame !== 'object') {
      return;
    }

    const entries: Record<string, LeaderboardEntry> = {};
    Object.entries(rawGame).forEach(([name, entry]) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const wins = Number((entry as LeaderboardEntry).wins ?? 0);
      const lastWinAt =
        typeof (entry as LeaderboardEntry).lastWinAt === 'string'
          ? (entry as LeaderboardEntry).lastWinAt
          : '';

      if (!Number.isFinite(wins) || wins <= 0) {
        return;
      }

      entries[name] = {
        wins,
        lastWinAt,
      };
    });

    normalizedGames[gameId] = entries;
  });

  base.games = normalizedGames;

  return base;
};

const loadStoreFromDisk = (): LeaderboardStore => {
  try {
    if (!fs.existsSync(LEADERBOARD_FILE)) {
      return createEmptyStore();
    }

    const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeStore(parsed);
  } catch (error) {
    console.error('[leaderboard] failed to load leaderboard file', error);
    return createEmptyStore();
  }
};

const saveStoreToDisk = (store: LeaderboardStore) => {
  ensureDataDir();
  const payload = JSON.stringify(store, null, 2);
  const tempPath = `${LEADERBOARD_FILE}.tmp`;
  fs.writeFileSync(tempPath, payload, 'utf8');
  fs.renameSync(tempPath, LEADERBOARD_FILE);
};

export const recordGameWinners = (gameId: string, names: string[]) => {
  const trimmedNames = names
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  if (trimmedNames.length === 0) {
    return;
  }

  const store = loadStoreFromDisk();
  const gameStore = store.games[gameId] ?? (store.games[gameId] = {});
  const now = new Date().toISOString();

  trimmedNames.forEach((name) => {
    const entry = gameStore[name] ?? { wins: 0, lastWinAt: now };
    entry.wins += 1;
    entry.lastWinAt = now;
    gameStore[name] = entry;
  });

  store.updatedAt = now;
  saveStoreToDisk(store);
};

export const getGameLeaderboard = (
  gameId: string,
  limit = 100
): { game: string; updatedAt: string; rankings: LeaderboardRankingItem[] } => {
  const store = loadStoreFromDisk();
  const gameStore = store.games[gameId] ?? {};
  const entries = Object.entries(gameStore).map(([name, entry]) => ({
    name,
    wins: entry.wins,
    lastWinAt: entry.lastWinAt,
  }));

  entries.sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    if (b.lastWinAt !== a.lastWinAt) {
      return b.lastWinAt.localeCompare(a.lastWinAt);
    }

    return a.name.localeCompare(b.name);
  });

  const sliced = entries.slice(0, limit);
  const rankings = sliced.map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));

  return {
    game: gameId,
    updatedAt: store.updatedAt,
    rankings,
  };
};
