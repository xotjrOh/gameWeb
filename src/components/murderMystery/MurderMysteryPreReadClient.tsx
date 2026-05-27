'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
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
import RulebookRichText from '@/components/murderMystery/RulebookRichText';
import {
  getRulebookPageHeading,
  normalizeRulebookText,
  useMeasuredRulebookPages,
} from '@/components/murderMystery/rulebookPagination';

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
  secretTextHighlights?: string[];
}

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
  secretTextHighlights = [],
}: MurderMysteryPreReadClientProps) {
  const secretMeasureRef = useRef<HTMLParagraphElement | null>(null);
  const prologuePages = useMemo(
    () => [normalizeRulebookText(introText) || '읽을 내용이 없습니다.'],
    [introText]
  );
  const { pages: secretPages, isPaginating: isSecretPaginating } =
    useMeasuredRulebookPages(secretText, secretMeasureRef, {
      highlights: secretTextHighlights,
    });
  const storageKey = `murderMystery:preReadProgress:${token}`;
  const [section, setSection] = useState<PreReadSection>('rolebook');
  const [pageIndex, setPageIndex] = useState(0);
  const [previewRatio, setPreviewRatio] = useState<number | null>(null);
  const [isScrubbingProgress, setIsScrubbingProgress] = useState(false);
  const pageCount =
    section === 'rolebook' ? secretPages.length + 1 : prologuePages.length;
  const maxPageIndex = Math.max(pageCount - 1, 0);
  const isRolebookCover = section === 'rolebook' && pageIndex === 0;
  const clampPageIndex = (nextPageIndex: number) =>
    Math.min(Math.max(nextPageIndex, 0), maxPageIndex);
  const getProgressRatioForPage = (targetPageIndex: number) =>
    pageCount > 0 ? (clampPageIndex(targetPageIndex) + 1) / pageCount : 0;
  const getPageIndexForProgressRatio = (ratio: number) =>
    clampPageIndex(Math.round(ratio * pageCount - 1));
  const progressRatio = getProgressRatioForPage(pageIndex);
  const previewProgressRatio = previewRatio ?? progressRatio;
  const progress = Math.round(previewProgressRatio * 100);
  const canScrubProgress =
    pageCount > 1 && !(section === 'rolebook' && isSecretPaginating);
  const progressMarkers = useMemo(
    () =>
      section === 'rolebook'
        ? secretPages
            .map((page, index) => {
              const heading = getRulebookPageHeading(page);
              return heading
                ? {
                    pageIndex: index + 1,
                    label: heading,
                    isPrimary: heading.includes('당일의 기억'),
                  }
                : null;
            })
            .filter(
              (
                marker
              ): marker is {
                pageIndex: number;
                label: string;
                isPrimary: boolean;
              } => Boolean(marker)
            )
        : [],
    [section, secretPages]
  );

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
        if (savedSection !== 'rolebook' || !isSecretPaginating) {
          setPageIndex(
            Math.min(
              Math.max(savedPageIndex, 0),
              Math.max(savedPageCount - 1, 0)
            )
          );
        }
      }
    } catch {
      setSection('rolebook');
      setPageIndex(0);
    }
  }, [
    isSecretPaginating,
    prologuePages.length,
    secretPages.length,
    storageKey,
  ]);

  useEffect(() => {
    if (section === 'rolebook' && isSecretPaginating) {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ section, pageIndex, updatedAt: Date.now() })
      );
    } catch {
      // 읽기 위치 저장은 편의 기능이므로 실패해도 진행을 막지 않는다.
    }
  }, [isSecretPaginating, pageIndex, section, storageKey]);

  const goTo = (nextPageIndex: number) => {
    setPageIndex(clampPageIndex(nextPageIndex));
  };

  const getProgressRatio = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  const getSnappedProgress = (clientX: number, target: HTMLElement) => {
    const pageIndexForPosition = getPageIndexForProgressRatio(
      getProgressRatio(clientX, target)
    );
    return {
      pageIndex: pageIndexForPosition,
      ratio: getProgressRatioForPage(pageIndexForPosition),
    };
  };

  const goToProgressPosition = (clientX: number, target: HTMLElement) => {
    if (!canScrubProgress) {
      return;
    }

    goTo(getSnappedProgress(clientX, target).pageIndex);
  };

  const handleProgressClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (isScrubbingProgress) {
      return;
    }
    goToProgressPosition(event.clientX, event.currentTarget);
  };

  const handleProgressPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!canScrubProgress) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsScrubbingProgress(true);
    setPreviewRatio(
      getSnappedProgress(event.clientX, event.currentTarget).ratio
    );
  };

  const handleProgressPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!isScrubbingProgress || !canScrubProgress) {
      return;
    }

    setPreviewRatio(
      getSnappedProgress(event.clientX, event.currentTarget).ratio
    );
  };

  const endProgressScrub = (event: ReactPointerEvent<HTMLElement>) => {
    if (!isScrubbingProgress) {
      return;
    }

    if (canScrubProgress) {
      goToProgressPosition(event.clientX, event.currentTarget);
    }
    setIsScrubbingProgress(false);
    setPreviewRatio(null);
  };

  const handleProgressKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      goTo(maxPageIndex);
    }
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

        <Box
          role="slider"
          aria-label="페이지 진행바"
          aria-valuemin={1}
          aria-valuemax={pageCount}
          aria-valuenow={pageIndex + 1}
          tabIndex={0}
          onClick={handleProgressClick}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={endProgressScrub}
          onPointerCancel={endProgressScrub}
          onKeyDown={handleProgressKeyDown}
          sx={{
            position: 'relative',
            height: 22,
            cursor: canScrubProgress ? 'pointer' : 'default',
            outline: 'none',
            touchAction: 'none',
            userSelect: 'none',
            '&:focus-visible': {
              borderRadius: 999,
              boxShadow: '0 0 0 2px rgba(245,158,11,0.62)',
            },
          }}
          title="클릭해서 해당 위치의 페이지로 이동"
        >
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 7,
              transform: 'translateY(-50%)',
              borderRadius: 999,
              backgroundColor: 'rgba(247,241,222,0.16)',
              '& .MuiLinearProgress-bar': {
                backgroundColor:
                  previewRatio !== null ? 'rgba(245, 158, 11, 0.5)' : '#f59e0b',
                transition: isScrubbingProgress
                  ? 'transform 90ms ease-out'
                  : undefined,
              },
            }}
          />
          {previewRatio !== null && (
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: '50%',
                left: 0,
                width: `${previewProgressRatio * 100}%`,
                height: 7,
                transform: 'translateY(-50%)',
                borderRadius: 999,
                backgroundColor: 'rgba(245, 158, 11, 0.18)',
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.2)',
                pointerEvents: 'none',
                transition: 'width 90ms ease-out',
              }}
            />
          )}
          {progressMarkers.map((marker) => (
            <Box
              key={`${marker.pageIndex}:${marker.label}`}
              component="button"
              type="button"
              title={`${marker.label}로 이동`}
              aria-label={`${marker.label}로 이동`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                goTo(marker.pageIndex);
              }}
              sx={{
                position: 'absolute',
                left: `${getProgressRatioForPage(marker.pageIndex) * 100}%`,
                top: marker.isPrimary ? 1 : 4,
                width: marker.isPrimary ? 12 : 10,
                height: marker.isPrimary ? 20 : 15,
                p: 0,
                border: 0,
                borderRadius: 999,
                background: 'transparent',
                transform: 'translateX(-50%)',
                cursor: 'pointer',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  width: marker.isPrimary ? 3 : 2,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: marker.isPrimary
                    ? '#fff7dc'
                    : 'rgba(247,241,222,0.72)',
                  boxShadow: marker.isPrimary
                    ? '0 0 0 1px rgba(245,158,11,0.45), 0 0 10px rgba(245,158,11,0.5)'
                    : '0 0 0 1px rgba(16,25,24,0.38)',
                  transform: 'translateX(-50%)',
                },
                '&:focus-visible': {
                  outline: '2px solid #f59e0b',
                  outlineOffset: 2,
                },
              }}
            />
          ))}
        </Box>

        <Box
          sx={{
            position: 'relative',
            height: { xs: '76dvh', sm: 'clamp(780px, 84dvh, 960px)' },
            overflow: 'hidden',
            p: { xs: 1.7, sm: 3 },
            borderRadius: 2,
            backgroundColor: '#f5ecd5',
            color: '#241b12',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          }}
        >
          <Box
            sx={{ position: 'relative', height: '100%', overflow: 'hidden' }}
          >
            {isRolebookCover ? (
              <CharacterBookCover
                displayName={roleDisplayName}
                publicText={rolePublicText}
                portraitSrc={portraitSrc}
                portraitAlt={portraitAlt}
                sx={{ height: '100%', minHeight: 0 }}
              />
            ) : section === 'prologue' ? (
              <Typography
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontSize: { xs: 15, sm: 17 },
                  lineHeight: { xs: 1.55, sm: 1.78 },
                  wordBreak: 'keep-all',
                  height: '100%',
                  overflowY: 'auto',
                }}
              >
                {prologuePages[pageIndex]}
              </Typography>
            ) : isSecretPaginating ? (
              <Typography
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  height: '100%',
                  color: '#6b5639',
                  fontWeight: 800,
                }}
              >
                페이지를 맞추는 중입니다.
              </Typography>
            ) : (
              <Typography
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontSize: { xs: 15, sm: 17 },
                  lineHeight: { xs: 1.55, sm: 1.78 },
                  wordBreak: 'keep-all',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <RulebookRichText
                  text={secretPages[pageIndex - 1] ?? ''}
                  highlights={secretTextHighlights}
                />
              </Typography>
            )}
            <Typography
              ref={secretMeasureRef}
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: -1,
                visibility: 'hidden',
                pointerEvents: 'none',
                whiteSpace: 'pre-wrap',
                fontSize: { xs: 15, sm: 17 },
                lineHeight: { xs: 1.55, sm: 1.78 },
                wordBreak: 'keep-all',
                height: '100%',
                overflow: 'hidden',
              }}
            />
          </Box>
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
