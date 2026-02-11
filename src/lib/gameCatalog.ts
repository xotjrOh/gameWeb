export const GAME_CATALOG = [
  { id: 'horse', label: '🐎 경마게임' },
  { id: 'shuffle', label: '🔀 뒤죽박죽' },
  { id: 'animal', label: '🦁 동물 능력전' },
  { id: 'jamo', label: '🔤 단어게임' },
  { id: 'murder_mystery', label: '🕵️ 반장을 죽였다' },
] as const;

export type GameId = (typeof GAME_CATALOG)[number]['id'];

export const DEFAULT_GAME_ID: GameId = GAME_CATALOG[0].id;

export const isGameId = (value: string): value is GameId =>
  GAME_CATALOG.some((game) => game.id === value);
