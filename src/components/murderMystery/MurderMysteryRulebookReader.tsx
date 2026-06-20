'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { CharacterBookCover } from '@/components/murderMystery/CharacterPortraitFrame';
import RulebookRichText from '@/components/murderMystery/RulebookRichText';
import {
  getRulebookPageHeading,
  normalizeRulebookText,
  useMeasuredRulebookPages,
} from '@/components/murderMystery/rulebookPagination';
import {
  MurderMysteryRoleBelongingHintScenario,
  MurderMysteryReportableSpecialEventView,
  MurderMysterySpecialEventOutcome,
} from '@/types/murderMystery';

type RulebookSection = 'prologue' | 'rolebook' | 'rules' | 'map';
type RulebookPageIndexBySection = Record<RulebookSection, number>;
type RulebookPageTurnDirection = 'previous' | 'next';

interface RulebookPageDragGesture {
  pointerId: number;
  startX: number;
  startY: number;
  frameWidth: number;
  hasDragged: boolean;
}

interface MurderMysteryRulebookPageStatus {
  section: RulebookSection;
  pageIndex: number;
  pageCount: number;
}

interface MurderMysteryRulebookReaderProps {
  storageKey?: string;
  roleDisplayName: string;
  rolePublicText: string;
  portraitSrc?: string;
  portraitAlt?: string;
  introText: string;
  secretText: string;
  personalGoal?: string;
  ruleText?: string;
  belongingHints?: MurderMysteryRoleBelongingHintScenario[];
  secretTextHighlights?: string[];
  pageSx?: SxProps<Theme>;
  controlsMode?: 'inline' | 'overlay';
  includePrologue?: boolean;
  includeRolebookCover?: boolean;
  showProgressMarkers?: boolean;
  showPageStatusFooter?: boolean;
  footerText?: string;
  mapContent?: ReactNode;
  specialEvents?: MurderMysteryReportableSpecialEventView[];
  onReportSpecialEvent?: (
    eventId: string,
    outcome: MurderMysterySpecialEventOutcome
  ) => void;
  onPageStatusChange?: (status: MurderMysteryRulebookPageStatus) => void;
}

const isRulebookSection = (value: unknown): value is RulebookSection =>
  value === 'prologue' ||
  value === 'rolebook' ||
  value === 'rules' ||
  value === 'map';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const defaultPageIndexBySection: RulebookPageIndexBySection = {
  prologue: 0,
  rolebook: 0,
  rules: 0,
  map: 0,
};

const pageFrameHeight = { xs: '80svh', sm: 'clamp(800px, 86dvh, 980px)' };
const pageFramePadding = { xs: 1.35, sm: 2.35 };
const pageDragActivationPx = 7;
const rulebookPageTextSx = {
  whiteSpace: 'pre-wrap',
  fontSize: { xs: 14.5, sm: 16 },
  lineHeight: { xs: 1.48, sm: 1.62 },
  wordBreak: 'keep-all',
  height: '100%',
  overflow: 'hidden',
} as const;

const getInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const isPageNavigationIgnoredTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      'button, a, input, textarea, select, [role="button"], [role="slider"], [data-rulebook-navigation-skip="true"]'
    )
  );

export default function MurderMysteryRulebookReader({
  storageKey,
  roleDisplayName,
  rolePublicText,
  portraitSrc,
  portraitAlt,
  introText,
  secretText,
  personalGoal,
  ruleText,
  belongingHints = [],
  secretTextHighlights = [],
  pageSx,
  controlsMode = 'inline',
  includePrologue = true,
  includeRolebookCover = true,
  showProgressMarkers = true,
  showPageStatusFooter = true,
  footerText,
  mapContent,
  specialEvents = [],
  onReportSpecialEvent,
  onPageStatusChange,
}: MurderMysteryRulebookReaderProps) {
  const secretMeasureRef = useRef<HTMLDivElement | null>(null);
  const prologuePages = useMemo(
    () => [normalizeRulebookText(introText) || '읽을 내용이 없습니다.'],
    [introText]
  );
  const { pages: secretPages, isPaginating: isSecretPaginating } =
    useMeasuredRulebookPages(secretText, secretMeasureRef, {
      highlights: secretTextHighlights,
    });
  const [section, setSection] = useState<RulebookSection>('rolebook');
  const [pageIndexBySection, setPageIndexBySection] =
    useState<RulebookPageIndexBySection>(defaultPageIndexBySection);
  const [previewRatio, setPreviewRatio] = useState<number | null>(null);
  const [isScrubbingProgress, setIsScrubbingProgress] = useState(false);
  const [pageTurn, setPageTurn] = useState<{
    direction: RulebookPageTurnDirection;
    serial: number;
  } | null>(null);
  const [areReaderControlsOpen, setAreReaderControlsOpen] = useState(false);
  const [pageDragOffset, setPageDragOffset] = useState(0);
  const [isPageDragging, setIsPageDragging] = useState(false);
  const loadedStorageKeyRef = useRef<string | null>(null);
  const pageDragGestureRef = useRef<RulebookPageDragGesture | null>(null);
  const suppressNextPageClickRef = useRef(false);
  const hasMapSection = Boolean(mapContent);
  const sectionTabs = useMemo<readonly RulebookSection[]>(
    () => [
      ...(includePrologue ? (['prologue'] as const) : []),
      'rolebook',
      'rules',
      ...(hasMapSection ? (['map'] as const) : []),
    ],
    [hasMapSection, includePrologue]
  );

  const getSectionPageCount = useCallback(
    (targetSection: RulebookSection) => {
      if (targetSection === 'rules' || targetSection === 'map') {
        return 1;
      }
      if (targetSection === 'prologue' && includePrologue) {
        return prologuePages.length;
      }
      return secretPages.length + (includeRolebookCover ? 1 : 0);
    },
    [
      includePrologue,
      includeRolebookCover,
      prologuePages.length,
      secretPages.length,
    ]
  );

  const pageCount = getSectionPageCount(section);
  const maxPageIndex = Math.max(pageCount - 1, 0);
  const pageIndex = clamp(pageIndexBySection[section] ?? 0, 0, maxPageIndex);
  const rolebookPageOffset = includeRolebookCover ? 1 : 0;
  const isRolebookCover =
    section === 'rolebook' && includeRolebookCover && pageIndex === 0;
  const clampPageIndex = useCallback(
    (nextPageIndex: number, targetSection: RulebookSection = section) =>
      clamp(
        nextPageIndex,
        0,
        Math.max(getSectionPageCount(targetSection) - 1, 0)
      ),
    [getSectionPageCount, section]
  );
  const getProgressRatioForPage = (targetPageIndex: number) =>
    pageCount > 0 ? (clampPageIndex(targetPageIndex) + 1) / pageCount : 0;
  const getPageIndexForProgressRatio = (ratio: number) =>
    clampPageIndex(Math.round(ratio * pageCount - 1));
  const progressRatio = getProgressRatioForPage(pageIndex);
  const previewProgressRatio = previewRatio ?? progressRatio;
  const progress = Math.round(previewProgressRatio * 100);
  const canScrubProgress = pageCount > 1;
  const useOverlayControls = controlsMode === 'overlay';
  const isMapSection = section === 'map' && hasMapSection;
  const currentSecretPageIndex = includeRolebookCover
    ? pageIndex - 1
    : pageIndex;
  const currentSecretPage =
    secretPages[clamp(currentSecretPageIndex, 0, secretPages.length - 1)] ?? '';
  const progressMarkers = useMemo(
    () =>
      showProgressMarkers && section === 'rolebook'
        ? secretPages
            .map((page, index) => {
              const heading = getRulebookPageHeading(page);
              return heading
                ? {
                    pageIndex: index + rolebookPageOffset,
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
              } =>
                marker !== null &&
                (includeRolebookCover || marker.pageIndex > 0)
            )
        : [],
    [
      includeRolebookCover,
      rolebookPageOffset,
      section,
      secretPages,
      showProgressMarkers,
    ]
  );

  useEffect(() => {
    if (!storageKey) {
      return;
    }
    if (loadedStorageKeyRef.current === storageKey) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : {};
      const savedSectionCandidate: unknown = saved.section;
      const savedSection: RulebookSection =
        isRulebookSection(savedSectionCandidate) &&
        sectionTabs.includes(savedSectionCandidate)
          ? savedSectionCandidate
          : 'rolebook';
      const savedPageIndexBySection: Partial<Record<RulebookSection, unknown>> =
        typeof saved.pageIndexBySection === 'object' &&
        saved.pageIndexBySection !== null
          ? saved.pageIndexBySection
          : {};
      const wasSavedWithRolebookCover = saved.includeRolebookCover !== false;
      const nextPageIndexBySection: RulebookPageIndexBySection = {
        ...defaultPageIndexBySection,
      };

      sectionTabs.forEach((targetSection) => {
        const savedPageIndex = getInteger(
          savedPageIndexBySection[targetSection]
        );
        if (savedPageIndex === null) {
          return;
        }
        nextPageIndexBySection[targetSection] =
          targetSection === 'rolebook' &&
          wasSavedWithRolebookCover &&
          !includeRolebookCover
            ? Math.max(savedPageIndex - 1, 0)
            : savedPageIndex;
      });

      const legacyPageIndex = getInteger(saved.pageIndex);
      if (
        legacyPageIndex !== null &&
        nextPageIndexBySection[savedSection] === 0
      ) {
        nextPageIndexBySection[savedSection] =
          savedSection === 'rolebook' &&
          wasSavedWithRolebookCover &&
          !includeRolebookCover
            ? Math.max(legacyPageIndex - 1, 0)
            : legacyPageIndex;
      }

      setSection(savedSection);
      setPageIndexBySection(nextPageIndexBySection);
    } catch {
      setSection('rolebook');
      setPageIndexBySection(defaultPageIndexBySection);
    }
    loadedStorageKeyRef.current = storageKey;
  }, [includePrologue, includeRolebookCover, sectionTabs, storageKey]);

  useEffect(() => {
    if (!sectionTabs.includes(section)) {
      setSection('rolebook');
    }
  }, [section, sectionTabs]);

  useEffect(() => {
    onPageStatusChange?.({ section, pageIndex, pageCount });
  }, [onPageStatusChange, pageCount, pageIndex, section]);

  useEffect(() => {
    if (!storageKey || isSecretPaginating) {
      return;
    }
    try {
      const clampedPageIndexBySection: RulebookPageIndexBySection = {
        prologue: clampPageIndex(pageIndexBySection.prologue, 'prologue'),
        rolebook: clampPageIndex(pageIndexBySection.rolebook, 'rolebook'),
        rules: clampPageIndex(pageIndexBySection.rules, 'rules'),
        map: clampPageIndex(pageIndexBySection.map, 'map'),
      };
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          section,
          pageIndex,
          pageIndexBySection: clampedPageIndexBySection,
          includeRolebookCover,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // 읽기 위치 저장은 편의 기능이므로 실패해도 진행을 막지 않는다.
    }
  }, [
    clampPageIndex,
    includeRolebookCover,
    isSecretPaginating,
    pageIndex,
    pageIndexBySection,
    section,
    storageKey,
  ]);

  const goToSection = (
    nextSection: RulebookSection,
    direction: RulebookPageTurnDirection
  ) => {
    setPreviewRatio(null);
    if (useOverlayControls) {
      setAreReaderControlsOpen(nextSection === 'map');
    }
    setPageTurn((current) => ({
      direction,
      serial: (current?.serial ?? 0) + 1,
    }));
    setSection(nextSection);
  };

  const goTo = (nextPageIndex: number) => {
    if (nextPageIndex > maxPageIndex) {
      const currentSectionIndex = sectionTabs.indexOf(section);
      const nextSection = sectionTabs[currentSectionIndex + 1];
      if (nextSection) {
        goToSection(nextSection, 'next');
      }
      return;
    }

    if (nextPageIndex < 0) {
      const currentSectionIndex = sectionTabs.indexOf(section);
      const previousSection = sectionTabs[currentSectionIndex - 1];
      if (previousSection) {
        goToSection(previousSection, 'previous');
      }
      return;
    }

    const resolvedPageIndex = clampPageIndex(nextPageIndex);
    if (resolvedPageIndex === pageIndex) {
      return;
    }
    if (useOverlayControls) {
      setAreReaderControlsOpen(false);
    }
    setPageTurn((current) => ({
      direction: resolvedPageIndex > pageIndex ? 'next' : 'previous',
      serial: (current?.serial ?? 0) + 1,
    }));
    setPageIndexBySection((current) => ({
      ...current,
      [section]: resolvedPageIndex,
    }));
  };

  const getProgressRatio = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1);
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

  const selectSection = (nextSection: RulebookSection) => {
    setSection(nextSection);
    setPreviewRatio(null);
    setPageTurn(null);
    setAreReaderControlsOpen(useOverlayControls && nextSection === 'map');
    setPageDragOffset(0);
    setIsPageDragging(false);
    pageDragGestureRef.current = null;
    suppressNextPageClickRef.current = false;
  };

  const resetPageDrag = () => {
    setPageDragOffset(0);
    setIsPageDragging(false);
    pageDragGestureRef.current = null;
  };

  const handlePagePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      pageCount <= 1 ||
      isPageNavigationIgnoredTarget(event.target) ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pageDragGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      frameWidth: event.currentTarget.getBoundingClientRect().width,
      hasDragged: false,
    };
    setPageTurn(null);
    setPageDragOffset(0);
    setIsPageDragging(false);
  };

  const handlePagePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = pageDragGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (!gesture.hasDragged) {
      if (
        absDeltaX < pageDragActivationPx &&
        absDeltaY < pageDragActivationPx
      ) {
        return;
      }
      if (absDeltaY > absDeltaX * 1.15) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        resetPageDrag();
        return;
      }
      gesture.hasDragged = true;
      setIsPageDragging(true);
      suppressNextPageClickRef.current = true;
    }

    event.preventDefault();
    const isBlockedDirection =
      (deltaX > 0 && pageIndex <= 0) ||
      (deltaX < 0 && pageIndex >= maxPageIndex);
    const resistedDeltaX = isBlockedDirection ? deltaX * 0.28 : deltaX;
    const maxOffset = gesture.frameWidth * 0.42;
    setPageDragOffset(clamp(resistedDeltaX, -maxOffset, maxOffset));
  };

  const finishPageDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = pageDragGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const deltaX = event.clientX - gesture.startX;
    const threshold = Math.min(96, Math.max(44, gesture.frameWidth * 0.16));
    const shouldTurn = gesture.hasDragged && Math.abs(deltaX) >= threshold;
    const nextPageIndex =
      shouldTurn && deltaX < 0
        ? pageIndex + 1
        : shouldTurn && deltaX > 0
          ? pageIndex - 1
          : pageIndex;

    resetPageDrag();

    if (nextPageIndex !== pageIndex) {
      goTo(nextPageIndex);
      return;
    }

    if (gesture.hasDragged) {
      suppressNextPageClickRef.current = true;
    }
  };

  const cancelPageDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = pageDragGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (gesture.hasDragged) {
      suppressNextPageClickRef.current = true;
    }
    resetPageDrag();
  };

  const handlePageFrameClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (suppressNextPageClickRef.current) {
      suppressNextPageClickRef.current = false;
      return;
    }

    if (isPageNavigationIgnoredTarget(event.target)) {
      return;
    }

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width;

    if (useOverlayControls && xRatio >= 0.42 && xRatio <= 0.58) {
      setAreReaderControlsOpen((current) => !current);
      return;
    }

    const nextPageIndex = xRatio < 0.5 ? pageIndex - 1 : pageIndex + 1;

    if (nextPageIndex !== pageIndex) {
      goTo(nextPageIndex);
    }
  };

  const readerControls = (
    <Stack
      spacing={0.8}
      data-rulebook-navigation-skip="true"
      sx={useOverlayControls ? { pointerEvents: 'auto' } : undefined}
    >
      <Stack direction="row" alignItems="center" spacing={0.8}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            flex: 1,
            minWidth: 0,
            p: 0.45,
            borderRadius: 999,
            backgroundColor: 'rgba(247,241,222,0.11)',
            border: '1px solid rgba(247,241,222,0.16)',
          }}
        >
          {sectionTabs.map((nextSection) => (
            <Button
              key={nextSection}
              fullWidth
              color="inherit"
              variant={section === nextSection ? 'contained' : 'text'}
              onClick={() => selectSection(nextSection)}
              sx={{
                minWidth: 0,
                borderRadius: 999,
                color: section === nextSection ? '#211711' : '#f7f1de',
                backgroundColor:
                  section === nextSection ? '#f5ecd5' : 'transparent',
                '&:hover': {
                  backgroundColor:
                    section === nextSection
                      ? '#f5ecd5'
                      : 'rgba(247,241,222,0.1)',
                },
              }}
            >
              {nextSection === 'prologue'
                ? '프롤로그'
                : nextSection === 'rolebook'
                  ? '룰지'
                  : nextSection === 'rules'
                    ? '규칙'
                    : '맵'}
            </Button>
          ))}
        </Stack>
        {useOverlayControls ? (
          <Typography
            variant="caption"
            sx={{
              flex: '0 0 auto',
              px: 1,
              py: 0.55,
              borderRadius: 999,
              backgroundColor: 'rgba(247,240,223,0.16)',
              border: '1px solid rgba(247,240,223,0.18)',
              color: '#f7f0df',
              fontWeight: 900,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {pageIndex + 1} / {pageCount}
          </Typography>
        ) : null}
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
    </Stack>
  );

  return (
    <Stack
      spacing={1.4}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          goTo(pageIndex - 1);
        }
        if (event.key === 'ArrowRight') {
          goTo(pageIndex + 1);
        }
      }}
      tabIndex={0}
      sx={{ position: 'relative', outline: 'none' }}
    >
      {!useOverlayControls ? readerControls : null}

      <Box
        onClick={handlePageFrameClick}
        onPointerDown={handlePagePointerDown}
        onPointerMove={handlePagePointerMove}
        onPointerUp={finishPageDrag}
        onPointerCancel={cancelPageDrag}
        aria-label="페이지 영역"
        sx={[
          {
            position: 'relative',
            // 모바일 브라우저 UI가 접히고 펼쳐져도 룰지 페이지가 재분할되지 않게 한다.
            height: pageFrameHeight,
            overflow: 'hidden',
            p: pageFramePadding,
            borderRadius: 2,
            backgroundColor: '#f5ecd5',
            color: '#241b12',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
            cursor:
              pageCount > 1 && !isMapSection
                ? isPageDragging
                  ? 'grabbing'
                  : 'grab'
                : 'default',
            touchAction: isMapSection ? 'none' : 'pan-y',
            userSelect: isPageDragging ? 'none' : undefined,
          },
          ...(Array.isArray(pageSx) ? pageSx : pageSx ? [pageSx] : []),
          ...(isRolebookCover
            ? [
                {
                  p: 0,
                  overflow: 'visible',
                  backgroundColor: 'transparent',
                  border: 0,
                  boxShadow: 'none',
                },
              ]
            : []),
          ...(isMapSection
            ? [
                {
                  p: 0,
                  overflow: 'hidden',
                  backgroundColor: 'transparent',
                  border: 0,
                  boxShadow: 'none',
                },
              ]
            : []),
        ]}
      >
        {useOverlayControls ? (
          <>
            {areReaderControlsOpen ? (
              <Box
                data-rulebook-navigation-skip="true"
                sx={{
                  position: 'absolute',
                  top: { xs: 8, sm: 12 },
                  left: { xs: 8, sm: 12 },
                  right: { xs: 8, sm: 12 },
                  zIndex: 8,
                  p: { xs: 0.75, sm: 1 },
                  borderRadius: 2,
                  backgroundColor: 'rgba(32,27,24,0.86)',
                  border: '1px solid rgba(247,240,223,0.16)',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.28)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {readerControls}
              </Box>
            ) : null}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                left: '50%',
                bottom: { xs: 6, sm: 8 },
                zIndex: 7,
                width: 38,
                height: 4,
                borderRadius: 999,
                backgroundColor: areReaderControlsOpen
                  ? 'rgba(245,158,11,0.72)'
                  : 'rgba(36,27,18,0.22)',
                boxShadow: areReaderControlsOpen
                  ? '0 0 12px rgba(245,158,11,0.38)'
                  : 'none',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                transition:
                  'background-color 120ms ease-out, box-shadow 120ms ease-out',
              }}
            />
          </>
        ) : null}
        <Box
          key={`${section}:${pageIndex}:${pageTurn?.serial ?? 0}`}
          sx={{
            position: 'relative',
            height: '100%',
            minHeight: isRolebookCover ? 0 : undefined,
            overflow: isRolebookCover ? 'visible' : 'hidden',
            transform:
              pageDragOffset !== 0
                ? `translate3d(${pageDragOffset}px, 0, 0)`
                : undefined,
            opacity:
              pageDragOffset !== 0
                ? clamp(1 - Math.abs(pageDragOffset) / 520, 0.86, 1)
                : undefined,
            transition: isPageDragging
              ? 'none'
              : 'transform 120ms ease-out, opacity 120ms ease-out',
            animation:
              pageTurn && pageDragOffset === 0
                ? `${pageTurn.direction === 'previous' ? 'reader-page-enter-previous' : 'reader-page-enter-next'} 110ms ease-out both`
                : undefined,
            willChange:
              pageTurn || isPageDragging ? 'transform, opacity' : undefined,
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              transition: 'none',
            },
            '@keyframes reader-page-enter-next': {
              '0%': {
                opacity: 0.88,
                transform: 'translate3d(34px, 0, 0)',
              },
              '100%': {
                opacity: 1,
                transform: 'translate3d(0, 0, 0)',
              },
            },
            '@keyframes reader-page-enter-previous': {
              '0%': {
                opacity: 0.88,
                transform: 'translate3d(-34px, 0, 0)',
              },
              '100%': {
                opacity: 1,
                transform: 'translate3d(0, 0, 0)',
              },
            },
          }}
        >
          {isRolebookCover ? (
            <CharacterBookCover
              displayName={roleDisplayName}
              publicText={rolePublicText}
              portraitSrc={portraitSrc}
              portraitAlt={portraitAlt}
              sx={{ height: '100%', minHeight: '100%' }}
            />
          ) : section === 'prologue' && includePrologue ? (
            <Typography
              component="div"
              sx={{
                ...rulebookPageTextSx,
                overflowY: 'auto',
              }}
            >
              {prologuePages[pageIndex]}
            </Typography>
          ) : isMapSection ? (
            <Box
              data-rulebook-navigation-skip="true"
              sx={{ height: '100%', minHeight: 0 }}
            >
              {mapContent}
            </Box>
          ) : section === 'rules' ? (
            <Stack
              spacing={1.4}
              sx={{
                height: '100%',
                overflowY: 'auto',
                pr: 0.5,
                wordBreak: 'keep-all',
              }}
            >
              <Box>
                <Typography fontWeight={950} sx={{ mb: 0.7 }}>
                  내 목표
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72 }}>
                  {personalGoal ||
                    '역할 룰지의 비공개 정보와 당일의 기억을 바탕으로, 최종 지목과 마지막 선택에서 자신에게 유리한 결론을 만드세요.'}
                </Typography>
              </Box>
              {ruleText ? (
                <>
                  <Divider sx={{ borderColor: 'rgba(36,27,18,0.16)' }} />
                  <Box>
                    <Typography fontWeight={950} sx={{ mb: 0.7 }}>
                      내 행동 지침
                    </Typography>
                    <Typography
                      sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72 }}
                    >
                      {ruleText}
                    </Typography>
                  </Box>
                </>
              ) : null}
              <Divider sx={{ borderColor: 'rgba(36,27,18,0.16)' }} />
              <Box>
                <Typography fontWeight={950} sx={{ mb: 0.7 }}>
                  내 소지품 메모
                </Typography>
                {belongingHints.length > 0 ? (
                  <Stack spacing={0.8}>
                    {belongingHints.map((item) => (
                      <Box
                        key={`${item.label}:${item.hint}`}
                        sx={{
                          p: 1.1,
                          borderRadius: 1.5,
                          backgroundColor: 'rgba(36,27,18,0.06)',
                          border: '1px solid rgba(36,27,18,0.14)',
                        }}
                      >
                        <Typography fontWeight={900}>{item.label}</Typography>
                        <Typography
                          variant="body2"
                          sx={{ mt: 0.3, lineHeight: 1.62 }}
                        >
                          {item.hint}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ color: '#6b5639', lineHeight: 1.68 }}>
                    이 역할에 별도 소지품 메모가 없습니다.
                  </Typography>
                )}
              </Box>
              <Divider sx={{ borderColor: 'rgba(36,27,18,0.16)' }} />
              <Box>
                <Typography fontWeight={950} sx={{ mb: 0.7 }}>
                  조사와 공개 규칙
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72 }}>
                  {[
                    '각 조사 라운드에서 정해진 순서대로 2회 조사합니다.',
                    '자신의 소지품은 원칙적으로 조사할 수 없지만, 남은 비소유 조사 카드가 없으면 마지막 선택으로 조사할 수 있습니다.',
                    '예약한 카드는 내 차례가 되면 자동으로 가져오며, 같은 카드를 다시 누르면 예약이 취소됩니다.',
                    '조사로 가져간 단서의 앞면은 본인만 확인합니다.',
                    '본인이 전체공개하기를 누른 단서와 추가조사 단서는 모두가 공개 카드에서 볼 수 있습니다.',
                    '공개하지 않은 단서는 다른 플레이어에게 뒷면 출처만 보입니다.',
                  ].join('\n')}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: 'rgba(36,27,18,0.16)' }} />
              <Box>
                <Typography fontWeight={950} sx={{ mb: 0.7 }}>
                  잠금 증언
                </Typography>
                {specialEvents.length > 0 ? (
                  <Stack spacing={1}>
                    {specialEvents.map((event) => (
                      <Box
                        key={event.id}
                        sx={{
                          p: 1.2,
                          borderRadius: 1.5,
                          backgroundColor: 'rgba(36,27,18,0.07)',
                          border: '1px solid rgba(36,27,18,0.16)',
                        }}
                      >
                        <Typography fontWeight={950}>{event.label}</Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.5,
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.65,
                          }}
                        >
                          {event.description}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.8}
                          sx={{ mt: 1 }}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            onClick={() =>
                              onReportSpecialEvent?.(event.id, 'reveal')
                            }
                          >
                            여우 발언으로 공개
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={() =>
                              onReportSpecialEvent?.(event.id, 'seal')
                            }
                          >
                            다른 사람이 먼저 말해 폐기
                          </Button>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ color: '#6b5639', lineHeight: 1.68 }}>
                    현재 처리할 잠금 증언 조건이 없습니다.
                  </Typography>
                )}
              </Box>
            </Stack>
          ) : (
            <Typography component="div" sx={rulebookPageTextSx}>
              <RulebookRichText
                text={currentSecretPage}
                highlights={secretTextHighlights}
              />
              {isSecretPaginating ? (
                <Chip
                  size="small"
                  label="페이지 조정 중"
                  sx={{
                    mt: 1.2,
                    backgroundColor: 'rgba(36,27,18,0.08)',
                    color: '#6b5639',
                    fontWeight: 800,
                  }}
                />
              ) : null}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        aria-hidden
        sx={[
          {
            position: 'absolute',
            top: 0,
            left: -10000,
            width: '100%',
            height: pageFrameHeight,
            overflow: 'hidden',
            p: pageFramePadding,
            opacity: 0,
            pointerEvents: 'none',
          },
          ...(Array.isArray(pageSx) ? pageSx : pageSx ? [pageSx] : []),
        ]}
      >
        <Typography
          ref={secretMeasureRef}
          component="div"
          sx={rulebookPageTextSx}
        />
      </Box>

      {showPageStatusFooter ? (
        <Typography
          variant="body2"
          sx={{ minWidth: 72, textAlign: 'center', color: '#d8d0bd' }}
        >
          {pageIndex + 1} / {pageCount}
        </Typography>
      ) : null}

      {footerText ? (
        <Typography
          variant="caption"
          sx={{ color: '#d8d0bd', textAlign: 'center' }}
        >
          {footerText}
        </Typography>
      ) : null}
    </Stack>
  );
}
