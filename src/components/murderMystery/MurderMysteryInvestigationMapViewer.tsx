'use client';

import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { type SxProps, type Theme } from '@mui/material/styles';
import {
  Map as MapIcon,
  RestartAlt as RestartAltIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type {
  MurderMysteryInvestigationMapHotspotView,
  MurderMysteryInvestigationMapSceneScenario,
} from '@/types/murderMystery';

export interface MurderMysteryInvestigationMapViewerPin {
  target: {
    id: string;
    label: string;
    isExhausted: boolean;
  };
  hotspot: MurderMysteryInvestigationMapHotspotView;
  matNumber: number;
}

interface MurderMysteryInvestigationMapViewerProps {
  scene: MurderMysteryInvestigationMapSceneScenario | null;
  pins?: MurderMysteryInvestigationMapViewerPin[];
  onSelectPin?: (targetId: string) => void;
  toolbarEnd?: ReactNode;
  resetKey?: unknown;
  sx?: SxProps<Theme>;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function MurderMysteryInvestigationMapViewer({
  scene,
  pins = [],
  onSelectPin,
  toolbarEnd,
  resetKey,
  sx,
}: MurderMysteryInvestigationMapViewerProps) {
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const lastGestureRef = useRef<{
    centerX: number;
    centerY: number;
    distance: number | null;
  } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pinRadius = scene ? Math.max(scene.width, scene.height) * 0.018 : 0;

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    pointersRef.current.clear();
    lastGestureRef.current = null;
  }, []);

  useEffect(() => {
    resetView();
  }, [resetKey, resetView, scene?.imageSrc]);

  const applyScale = useCallback((nextScale: number) => {
    setScale(clamp(nextScale, 1, 4));
  }, []);

  const updateGesture = () => {
    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 0) {
      lastGestureRef.current = null;
      return;
    }
    const center = pointers.reduce(
      (acc, pointer) => ({
        x: acc.x + pointer.x / pointers.length,
        y: acc.y + pointer.y / pointers.length,
      }),
      { x: 0, y: 0 }
    );
    const distance =
      pointers.length >= 2
        ? Math.hypot(
            pointers[0].x - pointers[1].x,
            pointers[0].y - pointers[1].y
          )
        : null;
    lastGestureRef.current = {
      centerX: center.x,
      centerY: center.y,
      distance,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    updateGesture();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const previous = lastGestureRef.current;
    const pointers = [...pointersRef.current.values()];
    if (!previous || pointers.length === 0) {
      updateGesture();
      return;
    }

    const center = pointers.reduce(
      (acc, pointer) => ({
        x: acc.x + pointer.x / pointers.length,
        y: acc.y + pointer.y / pointers.length,
      }),
      { x: 0, y: 0 }
    );
    setOffset((current) => ({
      x: current.x + center.x - previous.centerX,
      y: current.y + center.y - previous.centerY,
    }));

    const previousDistance = previous.distance;
    if (pointers.length >= 2 && previousDistance) {
      const nextDistance = Math.hypot(
        pointers[0].x - pointers[1].x,
        pointers[0].y - pointers[1].y
      );
      setScale((current) =>
        clamp(current * (nextDistance / previousDistance), 1, 4)
      );
    }

    updateGesture();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    updateGesture();
  };

  return (
    <Stack
      sx={[
        {
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          backgroundColor: '#0b1117',
          color: '#f8f1de',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          p: 1,
          borderBottom: '1px solid rgba(255,255,255,0.14)',
          backgroundColor: 'rgba(11,17,23,0.96)',
        }}
      >
        <MapIcon />
        <Typography fontWeight={950} sx={{ flex: 1 }}>
          사건 맵
        </Typography>
        <Tooltip title="축소">
          <IconButton
            onClick={() => applyScale(scale - 0.25)}
            sx={{ color: '#f8f1de' }}
          >
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="확대">
          <IconButton
            onClick={() => applyScale(scale + 0.25)}
            sx={{ color: '#f8f1de' }}
          >
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="원래 크기">
          <IconButton onClick={resetView} sx={{ color: '#f8f1de' }}>
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
        {toolbarEnd}
      </Stack>
      <Box
        onWheel={(event) => {
          event.preventDefault();
          applyScale(scale + (event.deltaY < 0 ? 0.18 : -0.18));
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          touchAction: 'none',
          cursor: scale > 1 ? 'grab' : 'zoom-in',
          backgroundColor: '#0b1117',
        }}
      >
        {scene ? (
          <Box
            component="svg"
            viewBox={`0 0 ${scene.width} ${scene.height}`}
            role="img"
            aria-label={scene.alt}
            preserveAspectRatio="xMidYMid meet"
            sx={{
              width: '100%',
              height: '100%',
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center',
              transition:
                pointersRef.current.size > 0
                  ? 'none'
                  : 'transform 120ms ease-out',
              userSelect: 'none',
            }}
          >
            <image
              href={scene.imageSrc}
              width={scene.width}
              height={scene.height}
              preserveAspectRatio="xMidYMid meet"
            />
            {pins.map(({ hotspot, matNumber, target }) => {
              const cx =
                ((hotspot.xPct + hotspot.widthPct / 2) / 100) * scene.width;
              const cy =
                ((hotspot.yPct + hotspot.heightPct / 2) / 100) * scene.height;

              return (
                <Box
                  key={hotspot.id}
                  component="g"
                  role="button"
                  tabIndex={0}
                  aria-label={`${target.label} 단서로 이동`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerMove={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectPin?.(target.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') {
                      return;
                    }
                    event.preventDefault();
                    onSelectPin?.(target.id);
                  }}
                  sx={{
                    cursor: 'pointer',
                    outline: 'none',
                    '&:focus-visible circle': {
                      stroke: '#ffffff',
                      strokeWidth: pinRadius * 0.24,
                    },
                  }}
                >
                  <title>{`${target.label} 단서로 이동`}</title>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={pinRadius}
                    fill={
                      target.isExhausted
                        ? 'rgba(71,85,105,0.94)'
                        : 'rgba(245,197,66,0.96)'
                    }
                    stroke="rgba(255,248,230,0.92)"
                    strokeWidth={pinRadius * 0.16}
                  />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={target.isExhausted ? '#f8f1de' : '#2b2112'}
                    fontSize={pinRadius * 0.95}
                    fontWeight={950}
                    pointerEvents="none"
                  >
                    {matNumber}
                  </text>
                </Box>
              );
            })}
          </Box>
        ) : null}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 12,
            transform: 'translateX(-50%)',
            px: 1.2,
            py: 0.45,
            borderRadius: 999,
            backgroundColor: 'rgba(0,0,0,0.62)',
            color: '#fff',
            fontWeight: 850,
            whiteSpace: 'nowrap',
          }}
        >
          드래그로 이동 · 핀치/휠로 확대
        </Typography>
      </Box>
    </Stack>
  );
}
