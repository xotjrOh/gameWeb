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
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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

type RulebookSection = 'prologue' | 'rolebook' | 'rules';

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
  showProgressMarkers?: boolean;
  footerText?: string;
  specialEvents?: MurderMysteryReportableSpecialEventView[];
  onReportSpecialEvent?: (
    eventId: string,
    outcome: MurderMysterySpecialEventOutcome
  ) => void;
}

const isRulebookSection = (value: unknown): value is RulebookSection =>
  value === 'prologue' || value === 'rolebook' || value === 'rules';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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
  showProgressMarkers = true,
  footerText,
  specialEvents = [],
  onReportSpecialEvent,
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
  const [pageIndex, setPageIndex] = useState(0);
  const [previewRatio, setPreviewRatio] = useState<number | null>(null);
  const [isScrubbingProgress, setIsScrubbingProgress] = useState(false);
  const pageCount =
    section === 'rolebook'
      ? secretPages.length + 1
      : section === 'rules'
        ? 1
        : prologuePages.length;
  const maxPageIndex = Math.max(pageCount - 1, 0);
  const isRolebookCover = section === 'rolebook' && pageIndex === 0;
  const clampPageIndex = (nextPageIndex: number) =>
    clamp(nextPageIndex, 0, maxPageIndex);
  const getProgressRatioForPage = (targetPageIndex: number) =>
    pageCount > 0 ? (clampPageIndex(targetPageIndex) + 1) / pageCount : 0;
  const getPageIndexForProgressRatio = (ratio: number) =>
    clampPageIndex(Math.round(ratio * pageCount - 1));
  const progressRatio = getProgressRatioForPage(pageIndex);
  const previewProgressRatio = previewRatio ?? progressRatio;
  const progress = Math.round(previewProgressRatio * 100);
  const canScrubProgress = pageCount > 1;
  const currentSecretPage =
    secretPages[clamp(pageIndex - 1, 0, secretPages.length - 1)] ?? '';
  const progressMarkers = useMemo(
    () =>
      showProgressMarkers && section === 'rolebook'
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
    [section, secretPages, showProgressMarkers]
  );

  useEffect(() => {
    if (!storageKey) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : {};
      const savedSection = isRulebookSection(saved.section)
        ? saved.section
        : 'rolebook';
      const savedPageIndex = Number(saved.pageIndex);
      setSection(savedSection);
      if (Number.isInteger(savedPageIndex)) {
        const savedPageCount =
          savedSection === 'rolebook'
            ? secretPages.length + 1
            : savedSection === 'rules'
              ? 1
              : prologuePages.length;
        setPageIndex(clamp(savedPageIndex, 0, Math.max(savedPageCount - 1, 0)));
      }
    } catch {
      setSection('rolebook');
      setPageIndex(0);
    }
  }, [prologuePages.length, secretPages.length, storageKey]);

  useEffect(() => {
    if (!storageKey) {
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
  }, [pageIndex, section, storageKey]);

  useEffect(() => {
    setPageIndex((current) => clamp(current, 0, maxPageIndex));
  }, [maxPageIndex]);

  const goTo = (nextPageIndex: number) => {
    setPageIndex(clampPageIndex(nextPageIndex));
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
    setPageIndex(0);
  };

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
      sx={{ outline: 'none' }}
    >
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
        {(['prologue', 'rolebook', 'rules'] as const).map((nextSection) => (
          <Button
            key={nextSection}
            fullWidth
            color="inherit"
            variant={section === nextSection ? 'contained' : 'text'}
            onClick={() => selectSection(nextSection)}
            sx={{
              borderRadius: 999,
              color: section === nextSection ? '#211711' : '#f7f1de',
              backgroundColor:
                section === nextSection ? '#f5ecd5' : 'transparent',
              '&:hover': {
                backgroundColor:
                  section === nextSection ? '#f5ecd5' : 'rgba(247,241,222,0.1)',
              },
            }}
          >
            {nextSection === 'prologue'
              ? '프롤로그'
              : nextSection === 'rolebook'
                ? '룰지'
                : '규칙'}
          </Button>
        ))}
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

      <Box
        sx={[
          {
            position: 'relative',
            height: { xs: '76dvh', sm: 'clamp(780px, 84dvh, 960px)' },
            overflow: 'hidden',
            p: { xs: 1.7, sm: 3 },
            borderRadius: 2,
            backgroundColor: '#f5ecd5',
            color: '#241b12',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
          },
          ...(Array.isArray(pageSx) ? pageSx : pageSx ? [pageSx] : []),
        ]}
      >
        <Box sx={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
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
              component="div"
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
                    '역할 룰지의 비밀 정보와 당일의 기억을 바탕으로, 최종 지목과 비밀 제출에서 자신에게 유리한 결론을 만드세요.'}
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
                            공개
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={() =>
                              onReportSpecialEvent?.(event.id, 'seal')
                            }
                          >
                            폐기
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
            <Typography
              component="div"
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
          <Typography
            ref={secretMeasureRef}
            component="div"
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
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
