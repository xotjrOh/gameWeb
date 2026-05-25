'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  AutoStories as AutoStoriesIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  HowToVote as HowToVoteIcon,
  Inventory2 as Inventory2Icon,
  Lock as LockIcon,
  Logout as LogoutIcon,
  PlayArrow as PlayArrowIcon,
  PushPin as PushPinIcon,
  RestartAlt as RestartAltIcon,
  SkipNext as SkipNextIcon,
  Style as StyleIcon,
  TaskAlt as TaskAltIcon,
  Timer as TimerIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
  MurderMysteryCardScenario,
  MurderMysteryClueVaultCardView,
  MurderMysteryFinalVoteOptionScenario,
  MurderMysteryInvestigationBackCardView,
  MurderMysteryPublicPlayerView,
  MurderMysteryRoleSheetView,
  MurderMysterySpecialEventOutcome,
  MurderMysteryStateSnapshot,
  MurderMysteryStepKind,
} from '@/types/murderMystery';

interface MurderMysteryTableExperienceProps {
  roomId: string;
  sessionId: string;
  isHostView: boolean;
  snapshot: MurderMysteryStateSnapshot;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onNextPhase: () => void;
  onFinalizeVote: () => void;
  onSubmitInvestigationByTarget: (targetId: string) => void;
  onSubmitInvestigationByBack: (backId: string) => void;
  onSetReservation: (backId: string) => void;
  onClearReservation: () => void;
  onSubmitVote: (voteOptionId: string) => void;
  onReportSpecialEvent: (
    eventId: string,
    outcome: MurderMysterySpecialEventOutcome
  ) => void;
}

interface SeatPosition {
  x: number;
  y: number;
}

type PhaseKind = MurderMysteryStepKind | 'lobby';
type AnyClueCard = MurderMysteryClueVaultCardView | MurderMysteryCardScenario;

const SEAT_WIDTH = 230;
const CARD_BACK_LABEL = '조사 카드';
const PAGE_CHAR_LIMIT = 760;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatSeconds = (seconds: number | null) => {
  if (seconds === null) {
    return '--:--';
  }
  const safe = Math.max(seconds, 0);
  const minute = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const second = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${minute}:${second}`;
};

const buildDefaultLayout = (playerIds: string[]) => {
  const count = Math.max(playerIds.length, 1);
  return playerIds.reduce<Record<string, SeatPosition>>(
    (acc, playerId, index) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
      acc[playerId] = {
        x: 50 + Math.cos(angle) * 39,
        y: 50 + Math.sin(angle) * 32,
      };
      return acc;
    },
    {}
  );
};

const mergeLayout = (
  playerIds: string[],
  savedLayout: Record<string, SeatPosition> | null
) => {
  const defaults = buildDefaultLayout(playerIds);
  return playerIds.reduce<Record<string, SeatPosition>>((acc, playerId) => {
    const saved = savedLayout?.[playerId];
    acc[playerId] = saved
      ? {
          x: clamp(saved.x, 8, 92),
          y: clamp(saved.y, 10, 90),
        }
      : defaults[playerId];
    return acc;
  }, {});
};

const getCardSourceText = (card: AnyClueCard) => {
  const clueCard = card as MurderMysteryClueVaultCardView;
  if (clueCard.sourceTargetLabels?.length) {
    return clueCard.sourceTargetLabels.join(', ');
  }
  return '';
};

const splitRulebookPages = (text: string) => {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const pages: string[] = [];
  let current = '';

  paragraphs.forEach((paragraph) => {
    const isSectionHeading =
      paragraph.length <= 40 &&
      !paragraph.includes('.') &&
      !paragraph.includes('。') &&
      !paragraph.includes('?') &&
      !paragraph.includes('!');
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (
      current &&
      (next.length > PAGE_CHAR_LIMIT ||
        (isSectionHeading && current.length > 240))
    ) {
      pages.push(current);
      current = paragraph;
      return;
    }

    current = next;
  });

  if (current) {
    pages.push(current);
  }

  return pages.length > 0 ? pages : ['비공개 룰지가 아직 배정되지 않았습니다.'];
};

const EvidenceCardFace = ({
  card,
  dense = false,
  onOpen,
}: {
  card: AnyClueCard;
  dense?: boolean;
  onOpen: (card: AnyClueCard) => void;
}) => {
  const sourceText = getCardSourceText(card);

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen(card)}
      sx={{
        border: 0,
        width: dense ? 112 : 174,
        minHeight: dense ? 146 : 224,
        p: 0,
        backgroundColor: 'transparent',
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <Box
        sx={{
          height: '100%',
          minHeight: dense ? 146 : 224,
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: '#f8f1de',
          border: '1px solid rgba(53, 43, 30, 0.35)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.28)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 140ms ease, box-shadow 140ms ease',
          '&:hover': {
            transform: 'translateY(-4px) rotate(-1deg)',
            boxShadow: '0 18px 32px rgba(0,0,0,0.36)',
          },
        }}
      >
        {card.imageSrc ? (
          <Box
            component="img"
            src={card.imageSrc}
            alt={card.imageAlt ?? card.title}
            sx={{
              width: '100%',
              height: dense ? 70 : 108,
              objectFit: 'cover',
              backgroundColor: '#ddd3bb',
            }}
          />
        ) : (
          <Box
            sx={{
              height: dense ? 70 : 108,
              display: 'grid',
              placeItems: 'center',
              background:
                'linear-gradient(135deg, #e7ddc3 0%, #f8f1de 48%, #d1c3a2 100%)',
            }}
          >
            <StyleIcon sx={{ color: '#695538' }} />
          </Box>
        )}
        <Stack spacing={0.55} sx={{ p: dense ? 1 : 1.2, flex: 1 }}>
          <Typography
            variant={dense ? 'caption' : 'body2'}
            fontWeight={900}
            sx={{
              color: '#2d2419',
              lineHeight: 1.25,
              wordBreak: 'keep-all',
            }}
          >
            {card.title}
          </Typography>
          {sourceText ? (
            <Typography
              variant="caption"
              sx={{
                color: '#7a3324',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {sourceText}
            </Typography>
          ) : null}
          {!dense ? (
            <Typography
              variant="caption"
              sx={{
                color: '#514538',
                lineHeight: 1.45,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 4,
                overflow: 'hidden',
              }}
            >
              {card.text}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
};

const InvestigationCardBack = ({
  back,
  canActNow,
  onTake,
  onReserve,
  onClearReservation,
}: {
  back: MurderMysteryInvestigationBackCardView;
  canActNow: boolean;
  onTake: (backId: string) => void;
  onReserve: (backId: string) => void;
  onClearReservation: () => void;
}) => {
  const handleClick = () => {
    if (back.isReservedByMe) {
      onClearReservation();
      return;
    }
    if (canActNow) {
      onTake(back.backId);
      return;
    }
    onReserve(back.backId);
  };

  return (
    <Tooltip
      title={
        back.isReservedByMe
          ? '예약 해제'
          : canActNow
            ? '내 조사 차례입니다. 이 카드를 가져옵니다.'
            : '내 차례 전까지 이 카드를 예약합니다.'
      }
    >
      <Box
        component="button"
        type="button"
        onClick={handleClick}
        sx={{
          width: 88,
          height: 124,
          border: 0,
          p: 0,
          background: 'transparent',
          cursor: 'pointer',
          color: 'inherit',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 1,
            overflow: 'hidden',
            border: back.isReservedByMe
              ? '2px solid #f5c542'
              : canActNow
                ? '2px solid #8ecae6'
                : '1px solid rgba(255,255,255,0.35)',
            background:
              'repeating-linear-gradient(135deg, #29323f 0, #29323f 7px, #1d2430 7px, #1d2430 14px)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.32)',
            transform: back.isReservedByMe ? 'rotate(-3deg)' : 'rotate(1deg)',
            transition: 'transform 140ms ease',
            '&:hover': {
              transform: 'translateY(-4px) rotate(0deg)',
            },
          }}
        >
          {back.imageSrc ? (
            <Box
              component="img"
              src={back.imageSrc}
              alt={back.shortLabel ?? CARD_BACK_LABEL}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.88,
              }}
            />
          ) : null}
          <Stack
            spacing={0.5}
            alignItems="center"
            justifyContent="center"
            sx={{
              position: 'absolute',
              inset: 0,
              p: 0.8,
              textAlign: 'center',
              backgroundColor: back.imageSrc ? 'rgba(5, 9, 14, 0.35)' : 'none',
            }}
          >
            {back.isReservedByMe ? (
              <PushPinIcon fontSize="small" sx={{ color: '#f5c542' }} />
            ) : canActNow ? (
              <TaskAltIcon fontSize="small" sx={{ color: '#8ecae6' }} />
            ) : (
              <LockIcon fontSize="small" sx={{ color: '#d7e1ea' }} />
            )}
            <Typography
              variant="caption"
              fontWeight={900}
              sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
            >
              {back.shortLabel ?? CARD_BACK_LABEL}
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Tooltip>
  );
};

const SeatToken = ({
  player,
  isSelf,
  position,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onOpenRulebook,
  onOpenPrivateCards,
  onOpenCover,
  onOpenCard,
}: {
  player: MurderMysteryPublicPlayerView;
  isSelf: boolean;
  position: SeatPosition;
  isDragging: boolean;
  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    playerId: string
  ) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onOpenRulebook: () => void;
  onOpenPrivateCards: () => void;
  onOpenCover: () => void;
  onOpenCard: (card: AnyClueCard) => void;
}) => (
  <Box
    onPointerDown={(event) => onPointerDown(event, player.id)}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    sx={{
      position: 'absolute',
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: { xs: 178, md: SEAT_WIDTH },
      transform: 'translate(-50%, -50%)',
      zIndex: isDragging ? 12 : isSelf ? 8 : 7,
      touchAction: 'none',
      cursor: isDragging ? 'grabbing' : 'grab',
      userSelect: 'none',
    }}
  >
    <Box
      sx={{
        borderRadius: 2,
        border: isSelf
          ? '2px solid rgba(245, 197, 66, 0.95)'
          : '1px solid rgba(255,255,255,0.28)',
        background:
          'linear-gradient(180deg, rgba(247,243,231,0.96), rgba(226,216,194,0.94))',
        color: '#2a231a',
        boxShadow: isDragging
          ? '0 22px 42px rgba(0,0,0,0.42)'
          : '0 12px 28px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}
    >
      <Stack spacing={0.8} sx={{ p: { xs: 1, md: 1.2 } }}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              fontWeight={900}
              sx={{ lineHeight: 1.15, wordBreak: 'keep-all' }}
            >
              {player.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: '#695538',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {player.roleDisplayName ?? '역할 배정 전'}
            </Typography>
          </Box>
          {isSelf ? <Chip size="small" label="나" color="warning" /> : null}
        </Stack>

        <Box
          sx={{
            borderRadius: 1,
            p: 0.9,
            backgroundColor: 'rgba(91, 69, 39, 0.11)',
            minHeight: 62,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 3,
              overflow: 'hidden',
              color: '#372c1f',
              lineHeight: 1.35,
              whiteSpace: 'pre-wrap',
            }}
          >
            {player.rolePublicText ?? '게임 시작 후 공개 정보가 배치됩니다.'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.6} alignItems="center">
          <Chip
            size="small"
            label={player.socketId ? '연결' : '대기'}
            color={player.socketId ? 'success' : 'default'}
          />
          <Chip size="small" label={player.statusText} />
          <Tooltip title="표지 보기">
            <IconButton
              data-seat-action
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onOpenCover();
              }}
              sx={{ ml: 'auto' }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {player.publicRevealedClues.length > 0 ? (
          <Stack
            direction="row"
            spacing={0.7}
            sx={{ overflowX: 'auto', pb: 0.3 }}
          >
            {player.publicRevealedClues.slice(0, 4).map((card) => (
              <Box
                key={`${player.id}:${card.id}`}
                data-seat-action
                onPointerDown={(event) => event.stopPropagation()}
              >
                <EvidenceCardFace card={card} dense onOpen={onOpenCard} />
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ color: '#6b6256' }}>
            아직 이 자리에 공개 단서가 없습니다.
          </Typography>
        )}

        {isSelf ? (
          <Stack direction="row" spacing={0.7} data-seat-action>
            <Button
              size="small"
              variant="contained"
              startIcon={<AutoStoriesIcon />}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpenRulebook();
              }}
              sx={{ flex: 1, minWidth: 0 }}
            >
              룰북
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Inventory2Icon />}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpenPrivateCards();
              }}
              sx={{ flex: 1, minWidth: 0 }}
            >
              내 카드
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  </Box>
);

const RulebookModal = ({
  open,
  roleSheet,
  playerName,
  onClose,
}: {
  open: boolean;
  roleSheet: MurderMysteryRoleSheetView | null;
  playerName: string;
  onClose: () => void;
}) => {
  const pages = useMemo(
    () => splitRulebookPages(roleSheet?.secretText ?? ''),
    [roleSheet?.secretText]
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    setPageIndex(0);
  }, [roleSheet?.roleId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowRight') {
        setDirection(1);
        setPageIndex((current) => Math.min(current + 1, pages.length));
      }
      if (event.key === 'ArrowLeft') {
        setDirection(-1);
        setPageIndex((current) => Math.max(current - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, pages.length]);

  const goTo = (nextIndex: number) => {
    setDirection(nextIndex > pageIndex ? 1 : -1);
    setPageIndex(clamp(nextIndex, 0, pages.length));
  };

  const isCover = pageIndex === 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogContent
        sx={{
          p: { xs: 1.2, sm: 2.2 },
          background:
            'linear-gradient(145deg, #201b18 0%, #3f3226 48%, #171c23 100%)',
          color: '#f7f0df',
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography fontWeight={900} sx={{ flex: 1 }}>
            비공개 룰북
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#f7f0df' }}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box
          sx={{
            perspective: '1600px',
            minHeight: { xs: 520, sm: 600 },
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Box
            key={`${roleSheet?.roleId ?? 'empty'}:${pageIndex}`}
            sx={{
              width: 'min(100%, 720px)',
              minHeight: { xs: 500, sm: 560 },
              borderRadius: 1,
              backgroundColor: '#fbf4df',
              color: '#2b241c',
              boxShadow: '0 28px 64px rgba(0,0,0,0.48)',
              border: '1px solid rgba(81, 61, 38, 0.55)',
              transformStyle: 'preserve-3d',
              animation:
                direction === 1
                  ? 'rulebookNext 260ms ease'
                  : 'rulebookPrev 260ms ease',
              '@keyframes rulebookNext': {
                '0%': {
                  opacity: 0.72,
                  transform: 'rotateY(-13deg) translateX(12px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'rotateY(0deg) translateX(0)',
                },
              },
              '@keyframes rulebookPrev': {
                '0%': {
                  opacity: 0.72,
                  transform: 'rotateY(13deg) translateX(-12px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'rotateY(0deg) translateX(0)',
                },
              },
            }}
          >
            <Box
              sx={{
                minHeight: { xs: 500, sm: 560 },
                p: { xs: 2.2, sm: 4 },
                background:
                  'linear-gradient(90deg, rgba(89,66,43,0.13) 0, rgba(89,66,43,0.02) 8%, transparent 18%)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {isCover ? (
                <Stack spacing={2.2} sx={{ flex: 1 }}>
                  <Chip
                    icon={<AutoStoriesIcon />}
                    label="룰북 표지"
                    sx={{ alignSelf: 'flex-start', fontWeight: 800 }}
                  />
                  <Box
                    sx={{ flex: 1, display: 'grid', alignContent: 'center' }}
                  >
                    <Typography
                      variant="h3"
                      fontWeight={950}
                      sx={{
                        fontSize: { xs: 34, sm: 52 },
                        lineHeight: 1.05,
                        wordBreak: 'keep-all',
                      }}
                    >
                      {roleSheet?.displayName ?? '역할 미배정'}
                    </Typography>
                    <Typography
                      sx={{ mt: 1.4, color: '#6c4d33', fontWeight: 800 }}
                    >
                      {playerName}
                    </Typography>
                    <Divider
                      sx={{ my: 2.4, borderColor: 'rgba(75,54,33,0.25)' }}
                    />
                    <Typography
                      sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.75,
                        color: '#392f25',
                      }}
                    >
                      {roleSheet?.publicText ??
                        '게임 시작 후 공개 정보가 표시됩니다.'}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={1.8} sx={{ flex: 1 }}>
                  <Typography
                    variant="overline"
                    sx={{ color: '#8b6239', fontWeight: 900 }}
                  >
                    {roleSheet?.displayName} / {pageIndex}쪽
                  </Typography>
                  <Typography
                    sx={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.72,
                      fontSize: { xs: 14.5, sm: 16 },
                      wordBreak: 'keep-all',
                    }}
                  >
                    {pages[pageIndex - 1]}
                  </Typography>
                </Stack>
              )}

              <Stack
                direction="row"
                alignItems="center"
                spacing={1.2}
                sx={{ mt: 3 }}
              >
                <Button
                  startIcon={<ChevronLeftIcon />}
                  disabled={pageIndex === 0}
                  onClick={() => goTo(pageIndex - 1)}
                >
                  이전
                </Button>
                <Typography
                  variant="caption"
                  sx={{ flex: 1, textAlign: 'center', color: '#6f5d49' }}
                >
                  {pageIndex + 1} / {pages.length + 1}
                </Typography>
                <Button
                  endIcon={<ChevronRightIcon />}
                  disabled={pageIndex >= pages.length}
                  onClick={() => goTo(pageIndex + 1)}
                >
                  다음
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const PublicCoverDialog = ({
  open,
  player,
  isSelf,
  onClose,
  onOpenRulebook,
}: {
  open: boolean;
  player: MurderMysteryPublicPlayerView | null;
  isSelf: boolean;
  onClose: () => void;
  onOpenRulebook: () => void;
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>
      <Stack direction="row" alignItems="center" spacing={1}>
        <AutoStoriesIcon />
        <Typography fontWeight={900} sx={{ flex: 1 }}>
          공개 룰지 표지
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </DialogTitle>
    <DialogContent>
      <Stack spacing={1.8}>
        <Box>
          <Typography variant="h5" fontWeight={950}>
            {player?.roleDisplayName ?? '역할 미배정'}
          </Typography>
          <Typography color="text.secondary" fontWeight={800}>
            {player?.name}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(85, 64, 37, 0.08)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.7,
          }}
        >
          {player?.rolePublicText ?? '게임 시작 후 공개 정보가 표시됩니다.'}
        </Box>
        {isSelf ? (
          <Button
            variant="contained"
            startIcon={<AutoStoriesIcon />}
            onClick={onOpenRulebook}
          >
            비공개 룰북 열기
          </Button>
        ) : null}
      </Stack>
    </DialogContent>
  </Dialog>
);

const CardDetailDialog = ({
  card,
  onClose,
}: {
  card: AnyClueCard | null;
  onClose: () => void;
}) => (
  <Dialog open={Boolean(card)} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>
      <Stack direction="row" alignItems="center" spacing={1}>
        <StyleIcon />
        <Typography fontWeight={900} sx={{ flex: 1 }}>
          {card?.title}
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </DialogTitle>
    <DialogContent>
      {card?.imageSrc ? (
        <Box
          component="img"
          src={card.imageSrc}
          alt={card.imageAlt ?? card.title}
          sx={{
            width: '100%',
            maxHeight: 360,
            objectFit: 'contain',
            borderRadius: 1,
            backgroundColor: '#171c23',
            mb: 2,
          }}
        />
      ) : null}
      <Stack spacing={1}>
        {card ? (
          <Typography
            variant="caption"
            fontWeight={900}
            sx={{ color: 'primary.main' }}
          >
            {getCardSourceText(card)}
          </Typography>
        ) : null}
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
          {card?.text}
        </Typography>
      </Stack>
    </DialogContent>
  </Dialog>
);

const PrivateCardsDialog = ({
  open,
  cards,
  onClose,
  onOpenCard,
}: {
  open: boolean;
  cards: MurderMysteryClueVaultCardView[];
  onClose: () => void;
  onOpenCard: (card: AnyClueCard) => void;
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Inventory2Icon />
        <Typography fontWeight={900} sx={{ flex: 1 }}>
          내 개인 카드
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </DialogTitle>
    <DialogContent>
      {cards.length === 0 ? (
        <Typography color="text.secondary">
          아직 개인 카드가 없습니다.
        </Typography>
      ) : (
        <Stack direction="row" spacing={1.4} sx={{ overflowX: 'auto', pb: 2 }}>
          {cards.map((card) => (
            <EvidenceCardFace key={card.id} card={card} onOpen={onOpenCard} />
          ))}
        </Stack>
      )}
    </DialogContent>
  </Dialog>
);

const VoteOptionButton = ({
  option,
  selected,
  resultWinner,
  disabled,
  onVote,
}: {
  option: MurderMysteryFinalVoteOptionScenario;
  selected: boolean;
  resultWinner: boolean;
  disabled: boolean;
  onVote: (optionId: string) => void;
}) => (
  <Button
    variant={selected || resultWinner ? 'contained' : 'outlined'}
    color={resultWinner ? 'success' : selected ? 'primary' : 'inherit'}
    disabled={disabled}
    startIcon={<HowToVoteIcon />}
    onClick={() => onVote(option.id)}
    sx={{
      justifyContent: 'flex-start',
      py: 1.2,
      borderColor: 'rgba(255,255,255,0.45)',
      color: selected || resultWinner ? undefined : '#f8f1de',
    }}
  >
    {option.label}
  </Button>
);

export default function MurderMysteryTableExperience({
  roomId,
  sessionId,
  isHostView,
  snapshot,
  onLeaveRoom,
  onStartGame,
  onNextPhase,
  onFinalizeVote,
  onSubmitInvestigationByTarget,
  onSubmitInvestigationByBack,
  onSetReservation,
  onClearReservation,
  onSubmitVote,
  onReportSpecialEvent,
}: MurderMysteryTableExperienceProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const tableRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    playerId: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [seatPositions, setSeatPositions] = useState<
    Record<string, SeatPosition>
  >({});
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [isPrivateCardsOpen, setIsPrivateCardsOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AnyClueCard | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const playerIdsKey = snapshot.players.map((player) => player.id).join('|');
  const layoutKey = `murderMystery:seatLayout:${roomId}:${sessionId}`;
  const selfPlayer =
    snapshot.players.find((player) => player.id === sessionId) ?? null;
  const selectedPlayer =
    snapshot.players.find((player) => player.id === selectedPlayerId) ?? null;

  const currentStep =
    snapshot.phase === 'LOBBY'
      ? null
      : (snapshot.scenario.flow.steps.find(
          (step) => step.id === snapshot.phase
        ) ?? null);
  const phaseKind: PhaseKind =
    snapshot.phase === 'LOBBY' ? 'lobby' : (currentStep?.kind ?? 'lobby');
  const phaseLabel =
    snapshot.phase === 'LOBBY'
      ? '대기'
      : (currentStep?.label ?? snapshot.phase);
  const phaseRemainingSec =
    snapshot.phaseTimer.durationSec && snapshot.phaseTimer.startedAt
      ? Math.max(
          snapshot.phaseTimer.durationSec -
            Math.floor((nowTick - snapshot.phaseTimer.startedAt) / 1000),
          0
        )
      : null;
  const activeRound = snapshot.investigation.round;
  const activeRoundView =
    snapshot.investigation.rounds.find(
      (round) => round.round === activeRound
    ) ?? null;
  const canActNow = Boolean(snapshot.investigation.turn?.canActNow);
  const canUseHostTools = isHostView;
  const showNextPhaseTool =
    canUseHostTools &&
    phaseKind !== 'lobby' &&
    phaseKind !== 'final_vote' &&
    phaseKind !== 'endbook';
  const canFinalizeVote =
    canUseHostTools &&
    phaseKind === 'final_vote' &&
    !snapshot.finalVote.result &&
    (snapshot.canUseHostGameMasterControls ||
      snapshot.finalVote.submittedVoters >= snapshot.finalVote.totalVoters);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const playerIds = playerIdsKey ? playerIdsKey.split('|') : [];
    let savedLayout: Record<string, SeatPosition> | null = null;
    try {
      const raw = window.localStorage.getItem(layoutKey);
      savedLayout = raw
        ? (JSON.parse(raw) as Record<string, SeatPosition>)
        : null;
    } catch {
      savedLayout = null;
    }
    setSeatPositions(mergeLayout(playerIds, savedLayout));
    setLayoutLoaded(true);
  }, [layoutKey, playerIdsKey]);

  useEffect(() => {
    if (!layoutLoaded) {
      return;
    }
    window.localStorage.setItem(layoutKey, JSON.stringify(seatPositions));
  }, [layoutKey, layoutLoaded, seatPositions]);

  const updateSeatPositionFromPointer = (
    playerId: string,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const rect = tableRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 8, 92);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 10, 90);
    setSeatPositions((current) => ({
      ...current,
      [playerId]: { x, y },
    }));
  };

  const handleSeatPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    playerId: string
  ) => {
    if ((event.target as HTMLElement).closest('[data-seat-action]')) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      playerId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    setDraggingPlayerId(playerId);
  };

  const handleSeatPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    const distance = Math.hypot(
      event.clientX - state.startX,
      event.clientY - state.startY
    );
    if (distance > 3) {
      state.moved = true;
      updateSeatPositionFromPointer(state.playerId, event);
    }
  };

  const handleSeatPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!state.moved) {
      setSelectedPlayerId(state.playerId);
    }
    dragStateRef.current = null;
    setDraggingPlayerId(null);
  };

  const resetSeats = () => {
    const playerIds = playerIdsKey ? playerIdsKey.split('|') : [];
    setSeatPositions(buildDefaultLayout(playerIds));
  };

  const renderInvestigationArea = () => (
    <Stack spacing={1.6}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.4}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={950}>
            {activeRound ? `${activeRound}라운드 조사` : '조사 대기'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
            {canActNow
              ? '내 차례입니다. 테이블 위 뒷면 카드 한 장을 가져가세요.'
              : snapshot.investigation.turn?.myReservation
                ? '예약 토큰이 꽂혀 있습니다. 내 차례가 오면 가져갈 수 있습니다.'
                : '내 차례가 아니면 뒷면 카드를 눌러 예약할 수 있습니다.'}
          </Typography>
        </Box>
        <Chip
          color={canActNow ? 'warning' : 'default'}
          label={
            snapshot.investigation.turn?.currentPlayerId
              ? canActNow
                ? '내 조사 차례'
                : '다른 플레이어 차례'
              : '조사 차례 종료'
          }
        />
      </Stack>

      {snapshot.investigation.map?.scene.imageSrc ? (
        <Box
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.16)',
            backgroundColor: '#101720',
            maxHeight: { xs: 240, md: 330 },
          }}
        >
          <Box
            component="img"
            src={snapshot.investigation.map.scene.imageSrc}
            alt={snapshot.investigation.map.scene.alt}
            sx={{
              display: 'block',
              width: '100%',
              height: '100%',
              maxHeight: { xs: 240, md: 330 },
              objectFit: 'contain',
            }}
          />
        </Box>
      ) : null}

      {activeRoundView ? (
        <Stack spacing={1.2}>
          {activeRoundView.targets.map((target) => (
            <Box
              key={target.id}
              sx={{
                p: 1.2,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.2}
                alignItems={{ xs: 'stretch', md: 'center' }}
              >
                <Box sx={{ minWidth: { md: 170 }, flex: { xs: 1, md: 0 } }}>
                  <Typography fontWeight={900}>{target.label}</Typography>
                  <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
                    남은 카드 {target.remainingClues} / 전체 {target.totalClues}
                  </Typography>
                </Box>
                {target.availableBacks.length > 0 ? (
                  <Stack
                    direction="row"
                    spacing={0.9}
                    sx={{ overflowX: 'auto', pb: 0.4 }}
                  >
                    {target.availableBacks.map((back) => (
                      <InvestigationCardBack
                        key={back.backId}
                        back={back}
                        canActNow={canActNow}
                        onTake={onSubmitInvestigationByBack}
                        onReserve={onSetReservation}
                        onClearReservation={onClearReservation}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Button
                    disabled={target.isExhausted || snapshot.investigation.used}
                    variant="outlined"
                    color="inherit"
                    onClick={() => onSubmitInvestigationByTarget(target.id)}
                  >
                    {target.isExhausted ? '소진됨' : '조사하기'}
                  </Button>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography sx={{ color: '#d8d0bd' }}>
          현재 라운드에 배치된 조사 카드가 없습니다.
        </Typography>
      )}
    </Stack>
  );

  const renderPublicClues = () => (
    <Stack spacing={1.2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <StyleIcon fontSize="small" />
        <Typography fontWeight={950}>공개된 단서</Typography>
        <Chip
          size="small"
          label={`${snapshot.clueVault.publicClues.length}장`}
        />
      </Stack>
      {snapshot.clueVault.publicClues.length > 0 ? (
        <Stack direction="row" spacing={1.25} sx={{ overflowX: 'auto', pb: 1 }}>
          {snapshot.clueVault.publicClues.map((card) => (
            <EvidenceCardFace
              key={`public:${card.id}`}
              card={card}
              onOpen={setSelectedCard}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
          아직 테이블 중앙에 공개된 단서가 없습니다.
        </Typography>
      )}
    </Stack>
  );

  const renderVoteArea = () => (
    <Stack spacing={1.6}>
      <Box>
        <Typography variant="h5" fontWeight={950}>
          최종 투표
        </Typography>
        <Typography sx={{ color: '#d8d0bd' }}>
          {snapshot.finalVote.question}
        </Typography>
      </Box>
      <Stack spacing={1}>
        {snapshot.finalVote.options.map((option) => (
          <VoteOptionButton
            key={option.id}
            option={option}
            selected={snapshot.finalVote.yourVote === option.id}
            resultWinner={snapshot.finalVote.result?.voteOptionId === option.id}
            disabled={Boolean(snapshot.finalVote.result)}
            onVote={onSubmitVote}
          />
        ))}
      </Stack>
      <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
        제출 {snapshot.finalVote.submittedVoters} /{' '}
        {snapshot.finalVote.totalVoters}
      </Typography>
      {snapshot.finalVote.result ? (
        <Box
          sx={{
            p: 1.4,
            borderRadius: 2,
            backgroundColor: snapshot.finalVote.result.matched
              ? 'rgba(83, 158, 110, 0.24)'
              : 'rgba(192, 84, 74, 0.24)',
            border: '1px solid rgba(255,255,255,0.16)',
          }}
        >
          <Typography fontWeight={900}>
            {snapshot.finalVote.result.matched
              ? '투표 결과는 정답입니다.'
              : '투표 결과는 오답입니다.'}
          </Typography>
        </Box>
      ) : canFinalizeVote ? (
        <Button
          variant="contained"
          color="warning"
          startIcon={<HowToVoteIcon />}
          onClick={onFinalizeVote}
        >
          투표 집계
        </Button>
      ) : null}
    </Stack>
  );

  const renderPhaseBody = () => {
    if (phaseKind === 'lobby') {
      return (
        <Stack spacing={1.5}>
          <Typography variant="h5" fontWeight={950}>
            자리와 닉네임 확인
          </Typography>
          <Typography sx={{ color: '#d8d0bd' }}>
            각자 실제 앉은 위치에 맞게 닉네임 좌석을 드래그하세요.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {snapshot.players.map((player) => (
              <Chip
                key={player.id}
                label={`${player.name} ${player.socketId ? '연결' : '대기'}`}
                color={player.socketId ? 'success' : 'default'}
              />
            ))}
          </Stack>
          {canUseHostTools ? (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={onStartGame}
              disabled={
                snapshot.hostParticipation.currentPlayerCount <
                snapshot.hostParticipation.requiredPlayerCount
              }
            >
              게임 시작
            </Button>
          ) : null}
        </Stack>
      );
    }

    if (phaseKind === 'intro') {
      return (
        <Stack spacing={1.6}>
          <Typography variant="h5" fontWeight={950}>
            프롤로그
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
            {snapshot.scenario.intro.readAloud}
          </Typography>
        </Stack>
      );
    }

    if (phaseKind === 'investigate') {
      return renderInvestigationArea();
    }

    if (phaseKind === 'discuss') {
      return (
        <Stack spacing={1.6}>
          <Typography variant="h5" fontWeight={950}>
            토론
          </Typography>
          <Typography sx={{ color: '#d8d0bd' }}>
            각자 획득한 단서의 공개 여부를 판단하고, 공개된 단서를 테이블 중앙에
            놓고 대화하세요.
          </Typography>
          {renderPublicClues()}
        </Stack>
      );
    }

    if (phaseKind === 'final_vote') {
      return renderVoteArea();
    }

    return (
      <Stack spacing={1.6}>
        <Typography variant="h5" fontWeight={950}>
          엔딩
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72 }}>
          {snapshot.endbook
            ? `${snapshot.endbook.common}\n\n${snapshot.endbook.variant}\n\n${snapshot.endbook.closingLine}`
            : '투표 집계 후 엔딩이 표시됩니다.'}
        </Typography>
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 50% 42%, #244a42 0%, #183a36 42%, #171c23 100%)',
        color: '#f8f1de',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(90deg, rgba(92,61,37,0.38) 0, rgba(92,61,37,0.05) 12%, rgba(0,0,0,0) 50%, rgba(92,61,37,0.24) 100%)',
        }}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{
          position: 'relative',
          zIndex: 20,
          px: { xs: 1, md: 2 },
          py: 1,
          backgroundColor: 'rgba(9,13,18,0.58)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            fontWeight={950}
            sx={{
              fontSize: { xs: 17, md: 20 },
              lineHeight: 1.2,
              wordBreak: 'keep-all',
            }}
          >
            {snapshot.scenario.title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
            방 {roomId} · {phaseLabel}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.8}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <Chip
            icon={<TimerIcon />}
            label={formatSeconds(phaseRemainingSec)}
            sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#f8f1de' }}
          />
          <Tooltip title="자리 초기화">
            <IconButton onClick={resetSeats} sx={{ color: '#f8f1de' }}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
          {canUseHostTools && snapshot.phase === 'LOBBY' ? (
            <Tooltip title="게임 시작">
              <span>
                <IconButton
                  onClick={onStartGame}
                  disabled={
                    snapshot.hostParticipation.currentPlayerCount <
                    snapshot.hostParticipation.requiredPlayerCount
                  }
                  sx={{ color: '#f8f1de' }}
                >
                  <PlayArrowIcon />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          {showNextPhaseTool ? (
            <Tooltip title="다음 단계">
              <IconButton onClick={onNextPhase} sx={{ color: '#f8f1de' }}>
                <SkipNextIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          {canFinalizeVote ? (
            <Tooltip title="투표 집계">
              <IconButton onClick={onFinalizeVote} sx={{ color: '#f8f1de' }}>
                <HowToVoteIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="방 나가기">
            <IconButton onClick={onLeaveRoom} sx={{ color: '#f8f1de' }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box
        ref={tableRef}
        sx={{
          position: 'relative',
          height: {
            xs: 'calc(100vh - 96px)',
            md: 'calc(100vh - 58px)',
          },
          minHeight: { xs: 720, md: 700 },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: { xs: '88vw', md: '58vw' },
            maxWidth: 900,
            minWidth: { xs: 330, md: 620 },
            maxHeight: { xs: '62vh', md: '70vh' },
            transform: 'translate(-50%, -50%)',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.18)',
            backgroundColor: 'rgba(14, 23, 25, 0.86)',
            boxShadow: '0 28px 70px rgba(0,0,0,0.42)',
            p: { xs: 1.3, md: 2 },
            overflow: 'auto',
            zIndex: 4,
          }}
        >
          <Stack spacing={1.8}>
            {renderPhaseBody()}
            {phaseKind !== 'discuss' && phaseKind !== 'final_vote' ? (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.14)' }} />
                {renderPublicClues()}
              </>
            ) : null}
          </Stack>
        </Box>

        {snapshot.specialEvents.length > 0 ? (
          <Stack
            spacing={1}
            sx={{
              position: 'absolute',
              left: { xs: 12, md: 24 },
              bottom: { xs: 16, md: 24 },
              width: { xs: 260, md: 330 },
              zIndex: 15,
            }}
          >
            {snapshot.specialEvents.map((event) => (
              <Box
                key={event.id}
                sx={{
                  p: 1.2,
                  borderRadius: 2,
                  backgroundColor: 'rgba(15, 19, 24, 0.88)',
                  border: '1px solid rgba(255,255,255,0.16)',
                }}
              >
                <Typography fontWeight={900}>{event.label}</Typography>
                <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
                  {event.description}
                </Typography>
                <Stack direction="row" spacing={0.7} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={() => onReportSpecialEvent(event.id, 'reveal')}
                  >
                    공개
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => onReportSpecialEvent(event.id, 'seal')}
                  >
                    폐기
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : null}

        {!isSmall ? (
          <Box
            sx={{
              position: 'absolute',
              right: 24,
              bottom: 24,
              width: 250,
              zIndex: 15,
              p: 1.2,
              borderRadius: 2,
              backgroundColor: 'rgba(247, 241, 222, 0.94)',
              color: '#2b241c',
              boxShadow: '0 14px 30px rgba(0,0,0,0.32)',
            }}
          >
            <Typography fontWeight={950}>내 책상</Typography>
            <Typography variant="caption" sx={{ color: '#695538' }}>
              개인 카드와 비공개 룰북은 이 화면에서만 열립니다.
            </Typography>
            <Stack direction="row" spacing={0.8} sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="contained"
                startIcon={<AutoStoriesIcon />}
                onClick={() => setIsRulebookOpen(true)}
              >
                룰북
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Inventory2Icon />}
                onClick={() => setIsPrivateCardsOpen(true)}
              >
                카드 {snapshot.clueVault.myClues.length}
              </Button>
            </Stack>
          </Box>
        ) : null}

        {snapshot.players.map((player) => (
          <SeatToken
            key={player.id}
            player={player}
            isSelf={player.id === sessionId}
            position={
              seatPositions[player.id] ??
              buildDefaultLayout(snapshot.players.map((entry) => entry.id))[
                player.id
              ]
            }
            isDragging={draggingPlayerId === player.id}
            onPointerDown={handleSeatPointerDown}
            onPointerMove={handleSeatPointerMove}
            onPointerUp={handleSeatPointerUp}
            onOpenRulebook={() => setIsRulebookOpen(true)}
            onOpenPrivateCards={() => setIsPrivateCardsOpen(true)}
            onOpenCover={() => setSelectedPlayerId(player.id)}
            onOpenCard={setSelectedCard}
          />
        ))}
      </Box>

      <PublicCoverDialog
        open={Boolean(selectedPlayer)}
        player={selectedPlayer}
        isSelf={selectedPlayer?.id === sessionId}
        onClose={() => setSelectedPlayerId(null)}
        onOpenRulebook={() => {
          setSelectedPlayerId(null);
          setIsRulebookOpen(true);
        }}
      />
      <RulebookModal
        open={isRulebookOpen}
        roleSheet={snapshot.roleSheet}
        playerName={selfPlayer?.name ?? ''}
        onClose={() => setIsRulebookOpen(false)}
      />
      <PrivateCardsDialog
        open={isPrivateCardsOpen}
        cards={snapshot.clueVault.myClues}
        onClose={() => setIsPrivateCardsOpen(false)}
        onOpenCard={setSelectedCard}
      />
      <CardDetailDialog
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </Box>
  );
}
