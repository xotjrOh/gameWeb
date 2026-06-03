'use client';

import { Box, Divider, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

interface CharacterPortraitFrameProps {
  src?: string;
  alt?: string;
  label: string;
  variant?: 'cover' | 'thumbnail';
  sx?: SxProps<Theme>;
}

interface CharacterBookCoverProps {
  displayName: string;
  publicText: string;
  portraitSrc?: string;
  portraitAlt?: string;
  sx?: SxProps<Theme>;
}

const getFallbackLabel = (label: string) => {
  const trimmed = label.trim();
  if (!trimmed) {
    return '?';
  }
  const words = trimmed.split(/\s+/);
  const lastWord = words[words.length - 1] ?? trimmed;
  return lastWord.slice(0, 2);
};

const toSxList = (sx?: SxProps<Theme>) =>
  Array.isArray(sx) ? sx : sx ? [sx] : [];

export default function CharacterPortraitFrame({
  src,
  alt,
  label,
  variant = 'cover',
  sx,
}: CharacterPortraitFrameProps) {
  const isThumbnail = variant === 'thumbnail';

  return (
    <Box
      sx={[
        {
          position: 'relative',
          width: isThumbnail ? 72 : 'min(100%, 300px)',
          aspectRatio: '4 / 5',
          flexShrink: 0,
          overflow: 'hidden',
          isolation: 'isolate',
          borderRadius: isThumbnail
            ? '46% 46% 10% 10% / 32% 32% 7% 7%'
            : '48% 48% 7% 7% / 34% 34% 5% 5%',
          background:
            'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.62), transparent 36%), linear-gradient(160deg, #e4d8bd 0%, #fff5dd 50%, #c7b58e 100%)',
          border: '1px solid rgba(76, 58, 39, 0.42)',
          boxShadow: isThumbnail
            ? '0 8px 18px rgba(0,0,0,0.24)'
            : '0 20px 40px rgba(45, 33, 23, 0.22)',
        },
        ...toSxList(sx),
      ]}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.22), transparent 44%), repeating-linear-gradient(0deg, rgba(72, 52, 31, 0.045) 0 1px, transparent 1px 8px)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: isThumbnail ? 5 : 10,
          zIndex: 1,
          border: '1px solid rgba(72, 49, 29, 0.36)',
          borderRadius: isThumbnail
            ? '45% 45% 9% 9% / 32% 32% 7% 7%'
            : '47% 47% 6% 6% / 34% 34% 5% 5%',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: isThumbnail ? '12% 12% 10%' : '11% 13% 9%',
          zIndex: 3,
          border: isThumbnail
            ? '1px solid rgba(56, 40, 25, 0.36)'
            : '2px solid rgba(56, 40, 25, 0.34)',
          borderRadius: '48% 48% 8% 8% / 33% 33% 6% 6%',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.48) inset, 0 14px 26px rgba(42, 31, 19, 0.12)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: isThumbnail ? '13% 13% 11%' : '12% 14% 10%',
          zIndex: 2,
          overflow: 'hidden',
          borderRadius: '48% 48% 8% 8% / 33% 33% 6% 6%',
          background:
            'linear-gradient(180deg, rgba(255,249,233,0.82), rgba(216,199,163,0.54))',
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt={alt ?? `${label} 인물 이미지`}
            sx={{
              position: 'absolute',
              left: '50%',
              bottom: '-1%',
              width: isThumbnail ? '118%' : '120%',
              height: isThumbnail ? '109%' : '110%',
              transform: 'translateX(-50%)',
              objectFit: 'contain',
              objectPosition: 'center bottom',
              mixBlendMode: 'multiply',
              opacity: 0.96,
              filter: isThumbnail
                ? 'saturate(0.9) contrast(1.03)'
                : 'saturate(0.88) contrast(1.04)',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: '24% 18% 22%',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              backgroundColor: 'rgba(39, 34, 31, 0.84)',
              color: '#fff8e8',
              fontSize: isThumbnail ? 18 : 42,
              fontWeight: 950,
            }}
          >
            {getFallbackLabel(label)}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function CharacterBookCover({
  displayName,
  publicText,
  portraitSrc,
  portraitAlt,
  sx,
}: CharacterBookCoverProps) {
  return (
    <Box
      sx={[
        {
          position: 'relative',
          overflow: 'hidden',
          minHeight: { xs: 400, sm: 540 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: { xs: 0.8, sm: 1.8 },
          px: { xs: 1.5, sm: 3.2 },
          py: { xs: 1.1, sm: 2.5 },
          borderRadius: 1.2,
          color: '#1f1710',
          background:
            'radial-gradient(circle at 52% 18%, rgba(255,255,255,0.6), transparent 28%), linear-gradient(155deg, #e1d3b7 0%, #fff3d7 46%, #d3c199 100%)',
          border: '1px solid rgba(75, 58, 37, 0.24)',
          boxShadow:
            'inset 0 0 0 1px rgba(255,255,255,0.52), 0 22px 46px rgba(49, 33, 18, 0.18)',
        },
        ...toSxList(sx),
      ]}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, rgba(55, 39, 21, 0.045) 0 1px, transparent 1px 9px), repeating-linear-gradient(90deg, rgba(55, 39, 21, 0.026) 0 1px, transparent 1px 13px), linear-gradient(90deg, rgba(255,255,255,0.28), transparent 38%)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: { xs: 12, sm: 18 },
          border: '1px solid rgba(72, 51, 32, 0.26)',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: { xs: 18, sm: 26 },
          border: '1px solid rgba(255, 255, 255, 0.42)',
          pointerEvents: 'none',
        }}
      />
      <Typography
        sx={{
          position: 'relative',
          zIndex: 1,
          justifySelf: 'start',
          px: 1.1,
          py: 0.35,
          border: '1px solid rgba(70, 49, 31, 0.38)',
          backgroundColor: 'rgba(255, 247, 226, 0.58)',
          color: '#604327',
          fontSize: { xs: 11, sm: 12 },
          fontWeight: 900,
          letterSpacing: 0,
          lineHeight: 1,
        }}
      >
        인물 설정서
      </Typography>
      <CharacterPortraitFrame
        src={portraitSrc}
        alt={portraitAlt}
        label={displayName}
        sx={{
          alignSelf: 'center',
          width: { xs: 'min(76vw, 280px)', sm: 330 },
          mt: { xs: -0.2, sm: -0.5 },
          boxShadow: '0 16px 38px rgba(49, 33, 18, 0.16)',
        }}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 1.2, sm: 1.4 },
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontSize: { xs: 29, sm: 45 },
            fontWeight: 950,
            lineHeight: 1.05,
            wordBreak: 'keep-all',
          }}
        >
          {displayName}
        </Typography>
        <Divider
          sx={{ my: { xs: 1, sm: 1.7 }, borderColor: 'rgba(75,54,33,0.26)' }}
        />
        <Typography
          variant="overline"
          sx={{
            color: '#9a3412',
            fontWeight: 950,
            letterSpacing: 0,
          }}
        >
          공개 정보
        </Typography>
        <Typography
          sx={{
            mt: 0.65,
            whiteSpace: 'pre-wrap',
            color: '#51402b',
            lineHeight: { xs: 1.48, sm: 1.68 },
            fontWeight: 760,
            wordBreak: 'keep-all',
          }}
        >
          {publicText}
        </Typography>
      </Box>
    </Box>
  );
}
