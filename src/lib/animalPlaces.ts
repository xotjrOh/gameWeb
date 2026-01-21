export type PlaceId = 'A' | 'B' | 'C' | 'D';

export interface PlaceInfo {
  id: PlaceId;
  name: string;
  backgroundUrl: string;
}

export const DEFAULT_PLACES: PlaceInfo[] = [
  { id: 'A', name: 'A 숲', backgroundUrl: '/images/animal/place-forest.png' },
  {
    id: 'B',
    name: 'B 들판',
    backgroundUrl: '/images/animal/place-grass.png',
  },
  {
    id: 'C',
    name: 'C 바다',
    backgroundUrl: '/images/animal/place-sea.png',
  },
  {
    id: 'D',
    name: 'D 사막',
    backgroundUrl: '/images/animal/place-desert.png',
  },
];
