'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { CharacterBookCover } from '@/components/murderMystery/CharacterPortraitFrame';

const PAGE_CHAR_LIMIT = 840;

type PreReadSection = 'prologue' | 'rolebook';

interface MurderMysteryPreReadClientProps {
  token: string;
  scenarioTitle: string;
  roleDisplayName: string;
  rolePublicText: string;
  portraitSrc?: string;
  portraitAlt?: string;
  introText: string;
  secretText: string;
}

const splitPages = (text: string) => {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const pages: string[] = [];
  let current = '';
  paragraphs.forEach((paragraph) => {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > PAGE_CHAR_LIMIT && current) {
      pages.push(current);
      current = paragraph;
      return;
    }
    current = next;
  });

  if (current) {
    pages.push(current);
  }
  return pages.length > 0 ? pages : ['읽을 내용이 없습니다.'];
};

const isPreReadSection = (value: unknown): value is PreReadSection =>
  value === 'prologue' || value === 'rolebook';

export default function MurderMysteryPreReadClient({
  token,
  scenarioTitle,
  roleDisplayName,
  rolePublicText,
  portraitSrc,
  portraitAlt,
  introText,
  secretText,
}: MurderMysteryPreReadClientProps) {
  const prologuePages = useMemo(() => splitPages(introText), [introText]);
  const secretPages = useMemo(() => splitPages(secretText), [secretText]);
  const storageKey = `murderMystery:preReadProgress:${token}`;
  const [section, setSection] = useState<PreReadSection>('rolebook');
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount =
    section === 'rolebook' ? secretPages.length + 1 : prologuePages.length;
  const maxPageIndex = Math.max(pageCount - 1, 0);
  const isRolebookCover = section === 'rolebook' && pageIndex === 0;
  const progress = Math.round(((pageIndex + 1) / pageCount) * 100);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : {};
      const savedSection = isPreReadSection(saved.section)
        ? saved.section
        : 'rolebook';
      const savedPageIndex = Number(saved.pageIndex);
      setSection(savedSection);
      if (Number.isInteger(savedPageIndex)) {
        const savedPageCount =
          savedSection === 'rolebook'
            ? secretPages.length + 1
            : prologuePages.length;
        setPageIndex(
          Math.min(Math.max(savedPageIndex, 0), Math.max(savedPageCount - 1, 0))
        );
      }
    } catch {
      setSection('rolebook');
      setPageIndex(0);
    }
  }, [prologuePages.length, secretPages.length, storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ section, pageIndex, updatedAt: Date.now() })
      );
    } catch {
      // 읽기 위치 저장은 편의 기능이므로 실패해도 진행을 막지 않는다.
    }
  }, [pageIndex, section, storageKey]);

  const goTo = (nextPageIndex: number) => {
    setPageIndex(Math.min(Math.max(nextPageIndex, 0), maxPageIndex));
  };

  const selectSection = (nextSection: PreReadSection) => {
    setSection(nextSection);
    setPageIndex(0);
  };

  return (
    <Box
      component="main"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          goTo(pageIndex - 1);
        }
        if (event.key === 'ArrowRight') {
          goTo(pageIndex + 1);
        }
      }}
      tabIndex={0}
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

        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            p: 0.45,
            borderRadius: 999,
            backgroundColor: 'rgba(247,241,222,0.11)',
            border: '1px solid rgba(247,241,222,0.16)',
          }}
        >
          <Button
            fullWidth
            color="inherit"
            variant={section === 'prologue' ? 'contained' : 'text'}
            onClick={() => selectSection('prologue')}
            sx={{
              borderRadius: 999,
              color: section === 'prologue' ? '#211711' : '#f7f1de',
              backgroundColor:
                section === 'prologue' ? '#f5ecd5' : 'transparent',
              '&:hover': {
                backgroundColor:
                  section === 'prologue' ? '#f5ecd5' : 'rgba(247,241,222,0.1)',
              },
            }}
          >
            프롤로그
          </Button>
          <Button
            fullWidth
            color="inherit"
            variant={section === 'rolebook' ? 'contained' : 'text'}
            onClick={() => selectSection('rolebook')}
            sx={{
              borderRadius: 999,
              color: section === 'rolebook' ? '#211711' : '#f7f1de',
              backgroundColor:
                section === 'rolebook' ? '#f5ecd5' : 'transparent',
              '&:hover': {
                backgroundColor:
                  section === 'rolebook' ? '#f5ecd5' : 'rgba(247,241,222,0.1)',
              },
            }}
          >
            인물북
          </Button>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 7,
            borderRadius: 999,
            backgroundColor: 'rgba(247,241,222,0.16)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#f59e0b',
            },
          }}
        />

        <Box
          sx={{
            minHeight: { xs: '58dvh', sm: 520 },
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            backgroundColor: '#f5ecd5',
            color: '#241b12',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          }}
        >
          {isRolebookCover ? (
            <CharacterBookCover
              displayName={roleDisplayName}
              publicText={rolePublicText}
              portraitSrc={portraitSrc}
              portraitAlt={portraitAlt}
            />
          ) : section === 'prologue' ? (
            <Typography
              sx={{
                whiteSpace: 'pre-wrap',
                fontSize: { xs: 16, sm: 17 },
                lineHeight: 1.78,
                wordBreak: 'keep-all',
              }}
            >
              {prologuePages[pageIndex]}
            </Typography>
          ) : (
            <Stack spacing={1.4}>
              <Typography
                variant="overline"
                sx={{ color: '#8b6239', fontWeight: 900 }}
              >
                비공개 룰지 {pageIndex}쪽
              </Typography>
              <Typography
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontSize: { xs: 16, sm: 17 },
                  lineHeight: 1.78,
                  wordBreak: 'keep-all',
                }}
              >
                {secretPages[pageIndex - 1]}
              </Typography>
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ChevronLeftIcon />}
            disabled={pageIndex === 0}
            onClick={() => goTo(pageIndex - 1)}
            sx={{ flex: 1 }}
          >
            이전
          </Button>
          <Typography
            variant="body2"
            sx={{ minWidth: 72, textAlign: 'center', color: '#d8d0bd' }}
          >
            {pageIndex + 1} / {pageCount}
          </Typography>
          <Button
            variant="contained"
            color="warning"
            endIcon={<ChevronRightIcon />}
            disabled={pageIndex >= maxPageIndex}
            onClick={() => goTo(pageIndex + 1)}
            sx={{ flex: 1 }}
          >
            다음
          </Button>
        </Stack>

        <Typography
          variant="caption"
          sx={{ color: '#d8d0bd', textAlign: 'center' }}
        >
          이 링크는 방 상태와 관계없이 사전 룰지만 보여줍니다.
        </Typography>
      </Stack>
    </Box>
  );
}
