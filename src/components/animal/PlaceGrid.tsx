'use client';

import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { Grid2 as Grid } from '@mui/material';
import { DEFAULT_PLACES, PlaceId, PlaceInfo } from '@/lib/animalPlaces';

interface PlaceGridProps {
  places?: PlaceInfo[];
  foodByPlace?: Partial<Record<PlaceId, number | null>>;
  statsByPlace?: Partial<
    Record<PlaceId, { herbivores: number | null; carnivores: number | null }>
  >;
  riskByPlace?: Partial<Record<PlaceId, 'safe' | 'risky' | 'over' | 'unknown'>>;
  selectedPlaceId?: PlaceId;
  onSelect?: (placeId: PlaceId) => void;
}

const DEFAULT_BG_OPACITY = 0.22;

export default function PlaceGrid({
  places = DEFAULT_PLACES,
  foodByPlace,
  statsByPlace,
  riskByPlace,
  selectedPlaceId,
  onSelect,
}: PlaceGridProps) {
  const riskLabels: Record<string, string> = {
    safe: '안전',
    risky: '경고',
    over: '위험',
    unknown: '정보 없음',
  };

  return (
    <Grid container spacing={2}>
      {places.map((place) => {
        const isSelected = selectedPlaceId === place.id;
        const foodCount = foodByPlace?.[place.id];
        const stats = statsByPlace?.[place.id];
        const risk = riskByPlace?.[place.id] ?? 'unknown';

        return (
          <Grid key={place.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              onClick={onSelect ? () => onSelect(place.id) : undefined}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                minHeight: 140,
                borderRadius: 3,
                cursor: onSelect ? 'pointer' : 'default',
                border: '1px solid',
                borderColor: isSelected ? 'primary.main' : 'grey.200',
                boxShadow: isSelected
                  ? '0 10px 24px rgba(37,99,235,0.2)'
                  : '0 10px 20px rgba(15,23,42,0.08)',
                transition:
                  'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                '&:hover': onSelect
                  ? {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 14px 26px rgba(15,23,42,0.12)',
                    }
                  : undefined,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${place.backgroundUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: DEFAULT_BG_OPACITY,
                  transform: 'scale(1.03)',
                }}
              />
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="textSecondary">
                    장소
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {place.name}
                  </Typography>
                  {foodCount !== undefined && (
                    <Typography variant="body2" color="textSecondary">
                      식량: {foodCount === null ? '?' : foodCount}
                    </Typography>
                  )}
                  {stats && (
                    <Typography variant="body2" color="textSecondary">
                      초식 {stats.herbivores === null ? '?' : stats.herbivores}{' '}
                      · 육식{' '}
                      {stats.carnivores === null ? '?' : stats.carnivores}
                    </Typography>
                  )}
                  {riskByPlace && (
                    <Typography
                      variant="caption"
                      color={
                        risk === 'over'
                          ? 'error.main'
                          : risk === 'risky'
                            ? 'warning.main'
                            : 'textSecondary'
                      }
                    >
                      위험도: {riskLabels[risk] ?? risk}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
