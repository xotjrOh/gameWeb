import type { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_GAME_ID } from '@/lib/gameCatalog';
import { getGameLeaderboard } from './socket/state/leaderboardState';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const gameParam = Array.isArray(req.query.game)
    ? req.query.game[0]
    : req.query.game;
  const limitParam = Array.isArray(req.query.limit)
    ? req.query.limit[0]
    : req.query.limit;

  const gameId =
    typeof gameParam === 'string' && gameParam.trim().length > 0
      ? gameParam
      : DEFAULT_GAME_ID;

  const limitValue = Number.parseInt(String(limitParam ?? ''), 10);
  const limit = Number.isFinite(limitValue)
    ? Math.min(Math.max(limitValue, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const leaderboard = getGameLeaderboard(gameId, limit);
  return res.status(200).json(leaderboard);
}
