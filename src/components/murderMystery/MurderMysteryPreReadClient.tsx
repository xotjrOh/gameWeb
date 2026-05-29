'use client';

import { Box, Chip, Stack, Typography } from '@mui/material';
import MurderMysteryRulebookReader from '@/components/murderMystery/MurderMysteryRulebookReader';

interface MurderMysteryPreReadClientProps {
  token: string;
  scenarioTitle: string;
  roleDisplayName: string;
  rolePublicText: string;
  portraitSrc?: string;
  portraitAlt?: string;
  introText: string;
  secretText: string;
  secretTextHighlights?: string[];
}

export default function MurderMysteryPreReadClient({
  token,
  scenarioTitle,
  roleDisplayName,
  rolePublicText,
  portraitSrc,
  portraitAlt,
  introText,
  secretText,
  secretTextHighlights = [],
}: MurderMysteryPreReadClientProps) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        px: { xs: 1.5, sm: 3 },
        py: { xs: 2, sm: 4 },
        background:
          'radial-gradient(circle at 50% 0%, rgba(62,91,78,0.62), transparent 34%), #101918',
        color: '#f7f1de',
      }}
    >
      <Stack spacing={1.4} sx={{ maxWidth: 720, mx: 'auto' }}>
        <Stack spacing={0.7}>
          <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
            사전 읽기
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 24, sm: 32 },
              fontWeight: 950,
              lineHeight: 1.18,
            }}
          >
            {scenarioTitle}
          </Typography>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            <Chip
              label="머더미스터리"
              sx={{
                color: '#241b12',
                backgroundColor: '#f5ecd5',
                fontWeight: 850,
              }}
            />
            <Chip label={roleDisplayName} color="warning" />
          </Stack>
        </Stack>

        <MurderMysteryRulebookReader
          storageKey={`murderMystery:preReadProgress:${token}`}
          roleDisplayName={roleDisplayName}
          rolePublicText={rolePublicText}
          portraitSrc={portraitSrc}
          portraitAlt={portraitAlt}
          introText={introText}
          secretText={secretText}
          secretTextHighlights={secretTextHighlights}
          footerText="이 링크는 방 상태와 관계없이 사전 룰지만 보여줍니다."
        />
      </Stack>
    </Box>
  );
}
