export type PlaceId = 'A' | 'B' | 'C' | 'D';

export interface PlaceInfo {
  id: PlaceId;
  name: string;
  backgroundUrl: string;
}

export const DEFAULT_PLACE_BG = '/images/animal/place-default.webp';

export const DEFAULT_PLACES: PlaceInfo[] = [
  { id: 'A', name: 'A 숲', backgroundUrl: DEFAULT_PLACE_BG },
  { id: 'B', name: 'B 들판', backgroundUrl: DEFAULT_PLACE_BG },
  { id: 'C', name: 'C 바다', backgroundUrl: DEFAULT_PLACE_BG },
  { id: 'D', name: 'D 사막', backgroundUrl: DEFAULT_PLACE_BG },
];
