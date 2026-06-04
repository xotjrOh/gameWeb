'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
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
  Article as ArticleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  HowToVote as HowToVoteIcon,
  Inventory2 as Inventory2Icon,
  IosShare as IosShareIcon,
  Lock as LockIcon,
  Logout as LogoutIcon,
  Map as MapIcon,
  MusicNote as MusicNoteIcon,
  PushPin as PushPinIcon,
  RestartAlt as RestartAltIcon,
  SkipNext as SkipNextIcon,
  Style as StyleIcon,
  TaskAlt as TaskAltIcon,
  Timer as TimerIcon,
  VolumeOff as VolumeOffIcon,
  VolumeUp as VolumeUpIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import {
  MurderMysteryCardScenario,
  MurderMysteryClueVaultCardView,
  MurderMysteryFinalVoteOptionScenario,
  MurderMysteryInvestigationBackCardView,
  MurderMysteryInvestigationMapSceneScenario,
  MurderMysteryInvestigationTargetView,
  MurderMysteryPublicPlayerView,
  MurderMysteryPublicScriptView,
  MurderMysteryReportableSpecialEventView,
  MurderMysteryRoleSheetView,
  MurderMysterySeatPosition,
  MurderMysterySpecialEventOutcome,
  MurderMysteryStateSnapshot,
  MurderMysteryStepKind,
} from '@/types/murderMystery';
import CharacterPortraitFrame from '@/components/murderMystery/CharacterPortraitFrame';
import MurderMysteryRulebookReader from '@/components/murderMystery/MurderMysteryRulebookReader';
import RulebookRichText from '@/components/murderMystery/RulebookRichText';

interface MurderMysteryTableExperienceProps {
  roomId: string;
  sessionId: string;
  isHostView: boolean;
  snapshot: MurderMysteryStateSnapshot;
  onLeaveRoom: () => void;
  onNextPhase: () => void;
  onMarkRoleSheetRead: () => void;
  onFinalizeVote: () => void;
  onSubmitRolePreferences: (roleIds: string[]) => void;
  onClearRolePreferences: () => void;
  onShareRoleSheet: (roleId: string) => void;
  onUpdateSeatPosition: (
    playerId: string,
    position: MurderMysterySeatPosition
  ) => Promise<boolean>;
  onResetSeatLayout: () => void;
  onSubmitInvestigationByTarget: (targetId: string) => void;
  onSubmitInvestigationByBack: (backId: string) => void;
  onSetReservation: (backId: string) => void;
  onClearReservation: () => void;
  pendingReservationBackId: string | null;
  onRevealMyClue: (cardId: string) => void;
  onSubmitVote: (voteOptionId: string) => void;
  onSubmitEndingChoice: (choiceId: string, optionId: string) => void;
  onReportSpecialEvent: (
    eventId: string,
    outcome: MurderMysterySpecialEventOutcome
  ) => void;
}

type PhaseKind = MurderMysteryStepKind | 'lobby';
type AnyClueCard = MurderMysteryClueVaultCardView | MurderMysteryCardScenario;
type ParticipantLabelSource = {
  name?: string | null;
  displayName?: string | null;
  roleDisplayName?: string | null;
};
type InvestigationTargetGroup = {
  id: string;
  label: string;
  order: number;
  totalClues: number;
  remainingClues: number;
  isOwnedByViewer: boolean;
  canInvestigateByViewer: boolean;
  investigationRestrictionReason?: string;
  isOwnedFallbackForViewer: boolean;
  targets: MurderMysteryInvestigationTargetView[];
};
type ClueTakeNotice = {
  id: string;
  playerId: string;
  playerLabel: string;
  backLabel: string;
  targetLabel: string;
};
type CardViewerState = {
  sourceId: string;
  cards: AnyClueCard[];
  index: number;
};
type TurnOrderMarker = {
  rank: number;
  isCurrent: boolean;
};
type SpecialEventActionRequest = {
  eventId: string;
  label: string;
  outcome: MurderMysterySpecialEventOutcome;
};
type BgmTrack = {
  src: string;
  label: string;
};
type BgmPlaybackState = {
  blocked: boolean;
  playing: boolean;
  muted: boolean;
  label: string | null;
};

const CARD_BACK_LABEL = '조사 카드';
const MURDER_MYSTERY_BGM_BY_SCENARIO: Record<
  string,
  {
    roleReading: BgmTrack;
    duringPlay: BgmTrack;
  }
> = {
  'rabbit-turtle-finish-line-night': {
    roleReading: {
      src: '/audio/murder-mystery/rabbit-turtle-finish-line-night/role-reading.mp3',
      label: '룰지 읽기 BGM',
    },
    duringPlay: {
      src: '/audio/murder-mystery/rabbit-turtle-finish-line-night/during-play.mp3',
      label: '플레이 BGM',
    },
  },
};
const ROLE_RANK_COLORS = [
  {
    background: '#f59e0b',
    border: '#fbbf24',
    text: '#241706',
  },
  {
    background: '#2563eb',
    border: '#60a5fa',
    text: '#f8fbff',
  },
  {
    background: '#16a34a',
    border: '#4ade80',
    text: '#f5fff8',
  },
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const RECTANGULAR_SEAT_POSITIONS: MurderMysterySeatPosition[] = [
  { x: 50, y: 18 },
  { x: 24, y: 82 },
  { x: 76, y: 82 },
  { x: 24, y: 18 },
  { x: 76, y: 18 },
  { x: 50, y: 88 },
];

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
  return playerIds.reduce<Record<string, MurderMysterySeatPosition>>(
    (acc, playerId, index) => {
      if (count <= RECTANGULAR_SEAT_POSITIONS.length) {
        acc[playerId] =
          RECTANGULAR_SEAT_POSITIONS[index] ?? RECTANGULAR_SEAT_POSITIONS[0];
        return acc;
      }

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
  savedLayout: Record<string, MurderMysterySeatPosition> | null
) => {
  const defaults = buildDefaultLayout(playerIds);
  return playerIds.reduce<Record<string, MurderMysterySeatPosition>>(
    (acc, playerId) => {
      const saved = savedLayout?.[playerId];
      acc[playerId] = saved
        ? {
            x: clamp(saved.x, 8, 92),
            y: clamp(saved.y, 10, 90),
          }
        : defaults[playerId];
      return acc;
    },
    {}
  );
};

const getSeatRelationLabel = (
  position: MurderMysterySeatPosition,
  isSelf: boolean
) => {
  if (isSelf) {
    return '내 자리';
  }
  if (position.y < 35) {
    return '맞은편';
  }
  if (position.y > 66) {
    return '내 근처';
  }
  if (position.x < 38) {
    return '왼쪽';
  }
  if (position.x > 62) {
    return '오른쪽';
  }
  return '대각선';
};

const getCardSourceText = (card: AnyClueCard) => {
  const clueCard = card as MurderMysteryClueVaultCardView;
  if (clueCard.sourceTargetLabels?.length) {
    return clueCard.sourceTargetLabels.join(', ');
  }
  return '';
};

const getClueVaultCardState = (card: AnyClueCard) => {
  const clueCard = card as MurderMysteryClueVaultCardView;
  return {
    isPublic: clueCard.isPublic === true,
    canRevealPublicly:
      clueCard.canRevealPublicly === true && Boolean(clueCard.backId),
  };
};

const TextOnlyClueMedia = ({
  dense = false,
  detail = false,
}: {
  dense?: boolean;
  detail?: boolean;
}) => (
  <Stack
    spacing={detail ? 0.8 : 0.35}
    alignItems="center"
    justifyContent="center"
    sx={{
      position: 'relative',
      height: detail ? { xs: 124, sm: 144 } : dense ? 70 : 108,
      overflow: 'hidden',
      background:
        'linear-gradient(135deg, #e8dcc2 0%, #f8f1de 52%, #d4c29f 100%)',
      color: '#5f4b2e',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: detail ? 14 : 8,
        border: '1px solid rgba(95, 75, 46, 0.22)',
        borderRadius: detail ? 1.4 : 0.8,
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        opacity: 0.36,
        background:
          'radial-gradient(circle at 18% 22%, rgba(255,255,255,0.5), transparent 28%), radial-gradient(circle at 84% 72%, rgba(95,75,46,0.16), transparent 32%)',
      },
    }}
  >
    <ArticleIcon
      fontSize={detail ? 'large' : dense ? 'small' : 'medium'}
      sx={{ position: 'relative', zIndex: 1, opacity: 0.86 }}
    />
    {!dense || detail ? (
      <Typography
        variant="caption"
        fontWeight={950}
        sx={{
          position: 'relative',
          zIndex: 1,
          letterSpacing: 0,
          color: '#5b472b',
        }}
      >
        조사 기록
      </Typography>
    ) : null}
  </Stack>
);

const formatParticipantLabel = (player?: ParticipantLabelSource | null) => {
  const roleLabel = player?.roleDisplayName ?? player?.displayName ?? '';
  const nickname = player?.name ?? '';
  if (roleLabel && nickname && roleLabel !== nickname) {
    return `${roleLabel} (${nickname})`;
  }
  return roleLabel || nickname || '알 수 없음';
};

const buildInvestigationTargetGroups = (
  targets: MurderMysteryInvestigationTargetView[]
): InvestigationTargetGroup[] => {
  const groups = new Map<string, InvestigationTargetGroup>();

  targets.forEach((target) => {
    const groupId = target.containerId ?? `target:${target.id}`;
    const current = groups.get(groupId);
    if (current) {
      current.targets.push(target);
      current.order = Math.min(
        current.order,
        target.order ?? Number.MAX_SAFE_INTEGER
      );
      current.totalClues += target.totalClues;
      current.remainingClues += target.remainingClues;
      current.isOwnedByViewer =
        current.isOwnedByViewer || target.isOwnedByViewer;
      current.canInvestigateByViewer =
        current.canInvestigateByViewer || target.canInvestigateByViewer;
      current.investigationRestrictionReason ??=
        target.investigationRestrictionReason;
      current.isOwnedFallbackForViewer =
        current.isOwnedFallbackForViewer || target.isOwnedFallbackForViewer;
      return;
    }

    groups.set(groupId, {
      id: groupId,
      label: target.containerLabel ?? target.label,
      order: target.order ?? Number.MAX_SAFE_INTEGER,
      totalClues: target.totalClues,
      remainingClues: target.remainingClues,
      isOwnedByViewer: target.isOwnedByViewer,
      canInvestigateByViewer: target.canInvestigateByViewer,
      investigationRestrictionReason: target.investigationRestrictionReason,
      isOwnedFallbackForViewer: target.isOwnedFallbackForViewer,
      targets: [target],
    });
  });

  return [...groups.values()].sort(
    (a, b) => a.order - b.order || a.label.localeCompare(b.label)
  );
};

const formatInvestigationCountText = ({
  remainingClues,
}: {
  remainingClues: number;
}) => (remainingClues > 0 ? '조사 가능' : '조사 완료');

const getRoleRankColor = (rankIndex: number) =>
  ROLE_RANK_COLORS[rankIndex] ?? ROLE_RANK_COLORS[ROLE_RANK_COLORS.length - 1];

const getMurderMysteryBgmTrack = (
  snapshot: MurderMysteryStateSnapshot
): BgmTrack | null => {
  const bgmConfig = MURDER_MYSTERY_BGM_BY_SCENARIO[snapshot.scenario.id];
  if (!bgmConfig || snapshot.phase === 'LOBBY') {
    return null;
  }

  const currentPhaseIndex = snapshot.phaseOrder.indexOf(snapshot.phase);
  const roleReadingPhaseIndex = snapshot.phaseOrder.indexOf('ROLE_READING');
  if (
    currentPhaseIndex >= 0 &&
    roleReadingPhaseIndex >= 0 &&
    currentPhaseIndex <= roleReadingPhaseIndex
  ) {
    return bgmConfig.roleReading;
  }

  return bgmConfig.duringPlay;
};

const BgmControl = ({
  track,
  startRequest = 0,
  onPlaybackStateChange,
}: {
  track: BgmTrack | null;
  startRequest?: number;
  onPlaybackStateChange?: (state: BgmPlaybackState) => void;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [userEnabled, setUserEnabled] = useState(true);

  const startBgm = useCallback(() => {
    setUserEnabled(true);
    const audio = audioRef.current;
    if (!audio || !track) {
      return;
    }
    const nextSrc = new URL(track.src, window.location.href).href;
    if (audio.src !== nextSrc) {
      audio.src = track.src;
      audio.currentTime = 0;
    }
    audio.loop = true;
    audio.volume = 0.38;
    audio.muted = muted;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsBlocked(false);
      })
      .catch(() => {
        setIsPlaying(false);
        setIsBlocked(true);
      });
  }, [muted, track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.loop = true;
    audio.volume = 0.38;
    audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!track || !userEnabled) {
      audio.pause();
      setIsPlaying(false);
      setIsBlocked(false);
      return;
    }

    const nextSrc = new URL(track.src, window.location.href).href;
    if (audio.src !== nextSrc) {
      audio.src = track.src;
      audio.currentTime = 0;
    }
    audio.loop = true;
    audio.volume = 0.38;
    audio.muted = muted;

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsBlocked(false);
      })
      .catch(() => {
        setIsPlaying(false);
        setIsBlocked(true);
      });
  }, [muted, track, userEnabled]);

  useEffect(() => {
    onPlaybackStateChange?.({
      blocked: isBlocked,
      playing: isPlaying,
      muted,
      label: track?.label ?? null,
    });
  }, [isBlocked, isPlaying, muted, onPlaybackStateChange, track?.label]);

  useEffect(() => {
    if (startRequest > 0) {
      startBgm();
    }
  }, [startBgm, startRequest]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    []
  );

  if (!track) {
    return <audio ref={audioRef} preload="auto" loop />;
  }

  return (
    <Stack direction="row" spacing={0.6} alignItems="center">
      <audio ref={audioRef} preload="auto" loop />
      {isBlocked || !isPlaying ? (
        <Button
          size="small"
          variant="contained"
          color="warning"
          startIcon={<MusicNoteIcon />}
          onClick={startBgm}
          sx={{ fontWeight: 900 }}
        >
          BGM 시작
        </Button>
      ) : (
        <Chip
          icon={<MusicNoteIcon />}
          label={track.label}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            color: '#f8f1de',
            fontWeight: 800,
          }}
        />
      )}
      <Tooltip title={muted ? 'BGM 소리 켜기' : 'BGM 음소거'}>
        <IconButton
          size="small"
          onClick={() => setMuted((current) => !current)}
          sx={{ color: '#f8f1de' }}
        >
          {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

const FloatingActionDock = ({
  title,
  description,
  chips,
  actions,
  auxiliaryActions,
  bottomOffset,
}: {
  title: string;
  description?: string;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  auxiliaryActions?: React.ReactNode;
  bottomOffset: { xs: number; md: number };
}) => (
  <Box
    sx={{
      position: 'fixed',
      left: { xs: 10, md: '50%' },
      right: { xs: 10, md: 'auto' },
      bottom: { xs: bottomOffset.xs, md: bottomOffset.md },
      transform: { xs: 'none', md: 'translateX(-50%)' },
      zIndex: 1500,
      width: { xs: 'auto', md: 'min(760px, calc(100vw - 320px))' },
      maxWidth: { md: 760 },
      pointerEvents: 'auto',
    }}
  >
    <Box
      sx={{
        p: { xs: 1.05, md: 1.2 },
        borderRadius: 2,
        border: '1px solid rgba(245, 197, 66, 0.48)',
        background:
          'linear-gradient(180deg, rgba(38, 31, 23, 0.97), rgba(18, 22, 25, 0.97))',
        color: '#f8f1de',
        boxShadow: '0 18px 44px rgba(0,0,0,0.46)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.7} alignItems="center" useFlexGap>
            <Typography
              fontWeight={950}
              sx={{
                fontSize: { xs: 14, md: 15 },
                lineHeight: 1.25,
                wordBreak: 'keep-all',
              }}
            >
              {title}
            </Typography>
            {chips}
          </Stack>
          {description ? (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.2,
                color: '#d8d0bd',
                lineHeight: 1.35,
                wordBreak: 'keep-all',
              }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>
        {actions || auxiliaryActions ? (
          <Stack
            direction="row"
            spacing={0.7}
            alignItems="center"
            justifyContent={{ xs: 'stretch', md: 'flex-end' }}
            flexWrap="wrap"
            useFlexGap
            sx={{
              '& > .MuiButton-root': {
                flex: { xs: '1 1 auto', md: '0 0 auto' },
                fontWeight: 900,
              },
            }}
          >
            {actions}
            {auxiliaryActions}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  </Box>
);

const ClueTakeOverlay = ({ notice }: { notice: ClueTakeNotice | null }) => {
  if (!notice) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        left: { xs: 10, md: '50%' },
        right: { xs: 10, md: 'auto' },
        top: { xs: 72, md: 78 },
        transform: { xs: 'none', md: 'translateX(-50%)' },
        zIndex: 1600,
        width: { xs: 'auto', md: 'min(720px, calc(100vw - 320px))' },
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          p: { xs: 1.1, md: 1.25 },
          borderRadius: 2,
          border: '1px solid rgba(142, 202, 230, 0.78)',
          background:
            'linear-gradient(180deg, rgba(10, 18, 24, 0.98), rgba(31, 43, 47, 0.98))',
          color: '#f8f1de',
          boxShadow: '0 18px 44px rgba(0,0,0,0.48)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <StyleIcon sx={{ color: '#8ecae6', flex: '0 0 auto' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              fontWeight={950}
              sx={{ fontSize: { xs: 14, md: 16 }, lineHeight: 1.35 }}
            >
              {notice.playerLabel}이 ‘{notice.backLabel}’ 뒷면 단서를
              가져갔습니다.
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', color: '#d8d0bd', mt: 0.2 }}
            >
              출처: {notice.targetLabel}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

const EvidenceCardFace = ({
  card,
  dense = false,
  onOpen,
  showPublicRevealControl = false,
  onRevealPublicly,
}: {
  card: AnyClueCard;
  dense?: boolean;
  onOpen: (card: AnyClueCard) => void;
  showPublicRevealControl?: boolean;
  onRevealPublicly?: (cardId: string) => void;
}) => {
  const sourceText = getCardSourceText(card);
  const { isPublic, canRevealPublicly } = getClueVaultCardState(card);

  return (
    <Stack spacing={0.8} sx={{ width: dense ? 112 : 174, flex: '0 0 auto' }}>
      <Box
        component="button"
        type="button"
        onClick={() => onOpen(card)}
        sx={{
          border: 0,
          width: '100%',
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
            position: 'relative',
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
          {card.extraInvestigationOnReveal ? (
            <Chip
              size="small"
              label="추가 조사"
              color="info"
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                zIndex: 1,
                height: 20,
                fontSize: 11,
                fontWeight: 900,
              }}
            />
          ) : null}
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
            <TextOnlyClueMedia dense={dense} />
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
                <RulebookRichText
                  text={card.text}
                  highlights={card.textHighlights}
                />
              </Typography>
            ) : null}
          </Stack>
        </Box>
      </Box>
      {showPublicRevealControl ? (
        canRevealPublicly ? (
          <Button
            size="small"
            variant="contained"
            color="warning"
            onClick={() => onRevealPublicly?.(card.id)}
            sx={{ fontWeight: 900 }}
          >
            전체공개하기
          </Button>
        ) : isPublic ? (
          <Chip size="small" color="success" label="공개됨" />
        ) : null
      ) : null}
    </Stack>
  );
};

const InvestigationCardBack = ({
  back,
  canActNow,
  disabled = false,
  disabledReason,
  isPendingReservation = false,
  onTake,
  onReserve,
  onClearReservation,
}: {
  back: MurderMysteryInvestigationBackCardView;
  canActNow: boolean;
  disabled?: boolean;
  disabledReason?: string;
  isPendingReservation?: boolean;
  onTake: (backId: string) => void;
  onReserve: (backId: string) => void;
  onClearReservation: () => void;
}) => {
  const isReserved = back.isReservedByMe || isPendingReservation;
  const handleClick = () => {
    if (disabled) {
      return;
    }
    if (isReserved) {
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
        disabled
          ? (disabledReason ?? '지금은 선택할 수 없습니다.')
          : isReserved
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
        disabled={disabled}
        sx={{
          width: 88,
          height: 124,
          border: 0,
          p: 0,
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'inherit',
          opacity: disabled ? 0.48 : 1,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 1,
            overflow: 'hidden',
            border: isReserved
              ? '2px solid #f5c542'
              : disabled
                ? '1px solid rgba(255,255,255,0.18)'
                : canActNow
                  ? '2px solid #8ecae6'
                  : '1px solid rgba(255,255,255,0.35)',
            background:
              'repeating-linear-gradient(135deg, #29323f 0, #29323f 7px, #1d2430 7px, #1d2430 14px)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.32)',
            transform: isReserved ? 'rotate(-3deg)' : 'rotate(1deg)',
            transition: 'transform 140ms ease',
            '&:hover': disabled
              ? undefined
              : {
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
          {back.extraInvestigationOnReveal ? (
            <Chip
              size="small"
              label="추가 조사"
              color="info"
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                height: 20,
                fontSize: 11,
                fontWeight: 900,
                zIndex: 2,
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
            {isReserved ? (
              <PushPinIcon fontSize="small" sx={{ color: '#f5c542' }} />
            ) : disabled ? (
              <LockIcon fontSize="small" sx={{ color: '#9ca3af' }} />
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
              {isPendingReservation
                ? '예약 처리 중'
                : back.isReservedByMe
                  ? '내 예약'
                  : (back.shortLabel ?? CARD_BACK_LABEL)}
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Tooltip>
  );
};

const HeldCardBackFace = ({
  back,
}: {
  back: MurderMysteryInvestigationBackCardView;
}) => (
  <Box
    sx={{
      width: 92,
      minWidth: 92,
      height: 128,
      borderRadius: 1,
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid rgba(46, 37, 26, 0.36)',
      background:
        'repeating-linear-gradient(135deg, #29323f 0, #29323f 7px, #1d2430 7px, #1d2430 14px)',
      boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
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
          opacity: 0.9,
        }}
      />
    ) : null}
    <Stack
      spacing={0.45}
      alignItems="center"
      justifyContent="center"
      sx={{
        position: 'absolute',
        inset: 0,
        p: 0.9,
        textAlign: 'center',
        color: '#fff',
        backgroundColor: back.imageSrc ? 'rgba(5, 9, 14, 0.36)' : 'none',
        textShadow: '0 1px 4px rgba(0,0,0,0.64)',
      }}
    >
      <LockIcon fontSize="small" sx={{ color: '#e9dcc2' }} />
      <Typography variant="caption" fontWeight={950} sx={{ lineHeight: 1.18 }}>
        {back.shortLabel ?? CARD_BACK_LABEL}
      </Typography>
      <Typography variant="caption" sx={{ lineHeight: 1.15, opacity: 0.86 }}>
        {back.targetLabel}
      </Typography>
    </Stack>
  </Box>
);

const SeatMarker = ({
  player,
  isSelf,
  canDrag,
  isClueTakeHighlighted,
  turnOrderMarker,
  position,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  player: MurderMysteryPublicPlayerView;
  isSelf: boolean;
  canDrag: boolean;
  isClueTakeHighlighted: boolean;
  turnOrderMarker?: TurnOrderMarker;
  position: MurderMysterySeatPosition;
  isDragging: boolean;
  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    playerId: string
  ) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
}) => {
  const visualPosition = {
    x: clamp(position.x, 14, 86),
    y: clamp(position.y, 14, 86),
  };
  const relationLabel = getSeatRelationLabel(visualPosition, isSelf);

  return (
    <Box
      onPointerDown={(event) => onPointerDown(event, player.id)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      sx={{
        position: 'absolute',
        left: `${visualPosition.x}%`,
        top: `${visualPosition.y}%`,
        width: { xs: 106, md: 124 },
        transform: 'translate(-50%, -50%)',
        zIndex: isDragging ? 6 : isSelf ? 5 : 4,
        touchAction: 'none',
        cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        userSelect: 'none',
      }}
    >
      {turnOrderMarker ? (
        <Tooltip
          title={
            turnOrderMarker.isCurrent
              ? '지금 조사 차례'
              : `${turnOrderMarker.rank}번째로 남은 조사 차례`
          }
        >
          <Box
            sx={{
              position: 'absolute',
              top: -10,
              right: -8,
              zIndex: 2,
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              border: '2px solid rgba(255,255,255,0.92)',
              backgroundColor: turnOrderMarker.isCurrent
                ? '#f5c542'
                : '#2563eb',
              color: turnOrderMarker.isCurrent ? '#241706' : '#fff',
              boxShadow: '0 8px 18px rgba(0,0,0,0.36)',
              fontWeight: 950,
            }}
          >
            {turnOrderMarker.rank}
          </Box>
        </Tooltip>
      ) : null}
      <Box
        sx={{
          borderRadius: 999,
          border: isSelf
            ? '2px solid rgba(245, 197, 66, 0.98)'
            : isClueTakeHighlighted
              ? '2px solid rgba(142, 202, 230, 0.98)'
              : '1px solid rgba(255,255,255,0.3)',
          background:
            'linear-gradient(180deg, rgba(247,243,231,0.98), rgba(224,214,190,0.96))',
          color: '#2a231a',
          boxShadow: isDragging
            ? '0 14px 34px rgba(0,0,0,0.42)'
            : isClueTakeHighlighted
              ? '0 0 0 4px rgba(142,202,230,0.18), 0 14px 34px rgba(0,0,0,0.42)'
              : '0 8px 20px rgba(0,0,0,0.28)',
          px: 1,
          py: 0.7,
        }}
      >
        <Stack direction="row" spacing={0.7} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flex: '0 0 auto',
              backgroundColor: player.socketId ? '#2e7d32' : '#9e9e9e',
              boxShadow: player.socketId
                ? '0 0 0 3px rgba(46,125,50,0.18)'
                : 'none',
            }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              fontWeight={950}
              sx={{
                display: 'block',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {player.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: '#6f5635',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {player.roleDisplayName ?? relationLabel}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.35}>
            {player.heldCardBacks.length > 0 ? (
              <Chip
                size="small"
                label={player.heldCardBacks.length}
                sx={{
                  height: 20,
                  minWidth: 24,
                  fontWeight: 900,
                  backgroundColor: isClueTakeHighlighted
                    ? '#f5c542'
                    : '#2b3440',
                  color: isClueTakeHighlighted ? '#2a231a' : '#fff',
                }}
              />
            ) : null}
            {player.publicRevealedClues.length > 0 ? (
              <Chip
                size="small"
                label={player.publicRevealedClues.length}
                sx={{ height: 20, minWidth: 24, fontWeight: 900 }}
              />
            ) : null}
          </Stack>
        </Stack>
      </Box>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mt: 0.25,
          textAlign: 'center',
          color: isSelf ? '#f5c542' : '#d8d0bd',
          fontWeight: 900,
          lineHeight: 1,
          textShadow: '0 1px 4px rgba(0,0,0,0.55)',
        }}
      >
        {relationLabel}
      </Typography>
    </Box>
  );
};

const SeatTable = ({
  players,
  sessionId,
  positions,
  tableRef,
  canEdit,
  canReset,
  isCompact,
  clueTakeHighlightPlayerId,
  turnOrderMarkers,
  draggingPlayerId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onReset,
}: {
  players: MurderMysteryPublicPlayerView[];
  sessionId: string;
  positions: Record<string, MurderMysterySeatPosition>;
  tableRef: React.RefObject<HTMLDivElement>;
  canEdit: boolean;
  canReset: boolean;
  isCompact: boolean;
  clueTakeHighlightPlayerId: string | null;
  turnOrderMarkers: Record<string, TurnOrderMarker>;
  draggingPlayerId: string | null;
  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    playerId: string
  ) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onReset: () => void;
}) => {
  const defaultPositions = useMemo(
    () => buildDefaultLayout(players.map((player) => player.id)),
    [players]
  );

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(10, 18, 20, 0.82)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.26)',
        p: { xs: 1.1, md: 1.35 },
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={950}>
              {canEdit ? '자리 맞추기' : '테이블 자리'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
              {canEdit
                ? '자기 토큰을 직사각형 테이블 위 실제 자리감에 맞추세요.'
                : Object.keys(turnOrderMarkers).length > 0
                  ? '좌석 숫자 1~3은 지금부터 남은 조사 순서입니다.'
                  : '좌석을 누르면 공개정보와 카드 상태를 볼 수 있습니다.'}
            </Typography>
          </Box>
          {canReset ? (
            <Tooltip title="자리 초기화">
              <IconButton
                size="small"
                onClick={onReset}
                sx={{ color: '#f8f1de' }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>

        <Box
          ref={tableRef}
          sx={{
            position: 'relative',
            height: isCompact ? { xs: 142, md: 166 } : { xs: 226, md: 270 },
            borderRadius: 5,
            overflow: 'visible',
            background:
              'linear-gradient(135deg, rgba(113, 82, 49, 0.9), rgba(58, 74, 60, 0.82) 46%, rgba(30, 42, 38, 0.92))',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -18px 34px rgba(0,0,0,0.22)',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: '18% 15%',
              borderRadius: 4,
              background:
                'linear-gradient(180deg, rgba(248,241,222,0.12), rgba(248,241,222,0.05))',
              border: '1px dashed rgba(247,241,222,0.38)',
              pointerEvents: 'none',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 10,
              borderRadius: 4,
              border: '1px solid rgba(0,0,0,0.2)',
              pointerEvents: 'none',
            },
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: { xs: '48%', md: '52%' },
              height: { xs: '30%', md: '34%' },
              transform: 'translate(-50%, -50%)',
              borderRadius: 4,
              backgroundColor: 'rgba(247, 241, 222, 0.12)',
              border: '1px dashed rgba(247,241,222,0.42)',
              display: 'grid',
              placeItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography
              variant="caption"
              fontWeight={950}
              sx={{ color: 'rgba(248,241,222,0.76)' }}
            >
              MYSTERY TABLE
            </Typography>
          </Box>
          {players.map((player) => (
            <SeatMarker
              key={player.id}
              player={player}
              isSelf={player.id === sessionId}
              canDrag={canEdit && player.id === sessionId}
              isClueTakeHighlighted={clueTakeHighlightPlayerId === player.id}
              turnOrderMarker={turnOrderMarkers[player.id]}
              position={positions[player.id] ?? defaultPositions[player.id]}
              isDragging={draggingPlayerId === player.id}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          ))}
        </Box>
      </Stack>
    </Box>
  );
};

const RolePublicCoverCard = ({
  cover,
  currentRank,
  rankCount,
  assignedPlayerName,
  onSetRank,
}: {
  cover: MurderMysteryStateSnapshot['roleSelection']['publicCovers'][number];
  currentRank: number;
  rankCount: number;
  assignedPlayerName?: string;
  onSetRank?: (rankIndex: number) => void;
}) => {
  const canRank = Boolean(cover.selectable && onSetRank);

  return (
    <Box
      sx={{
        p: 1.1,
        borderRadius: 1.5,
        backgroundColor: cover.selectable
          ? 'rgba(247,241,222,0.11)'
          : 'rgba(109, 90, 66, 0.2)',
        border: cover.selectable
          ? '1px solid rgba(247,241,222,0.15)'
          : '1px dashed rgba(247,241,222,0.28)',
      }}
    >
      <Stack spacing={0.8}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <CharacterPortraitFrame
            src={cover.portraitSrc}
            alt={cover.portraitAlt}
            label={cover.displayName}
            variant="thumbnail"
            sx={{ width: 72 }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={950} sx={{ flex: 1 }}>
                {cover.displayName}
              </Typography>
              {assignedPlayerName ? (
                <Chip size="small" label={assignedPlayerName} />
              ) : canRank ? (
                <Chip
                  size="small"
                  label={currentRank >= 0 ? `${currentRank + 1}순위` : '미선택'}
                  sx={
                    currentRank >= 0
                      ? {
                          fontWeight: 850,
                          color: getRoleRankColor(currentRank).text,
                          backgroundColor:
                            getRoleRankColor(currentRank).background,
                          border: `1px solid ${getRoleRankColor(currentRank).border}`,
                        }
                      : undefined
                  }
                />
              ) : (
                <Chip size="small" label="NPC 용의자" />
              )}
            </Stack>
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: '#d8d0bd',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.55,
              }}
            >
              {cover.publicText}
            </Typography>
          </Box>
        </Stack>
        {canRank ? (
          <Stack direction="row" spacing={0.6} flexWrap="wrap">
            {Array.from({ length: rankCount }, (_, rankIndex) => {
              const rankColor = getRoleRankColor(rankIndex);
              const isSelected = currentRank === rankIndex;

              return (
                <Button
                  key={`${cover.id}:rank:${rankIndex}`}
                  size="small"
                  variant="outlined"
                  aria-pressed={isSelected}
                  onClick={() => onSetRank?.(rankIndex)}
                  sx={{
                    minWidth: 66,
                    fontWeight: 900,
                    color: isSelected ? rankColor.text : '#e8dec4',
                    borderColor: isSelected
                      ? rankColor.border
                      : 'rgba(248, 241, 222, 0.34)',
                    backgroundColor: isSelected
                      ? rankColor.background
                      : 'rgba(7, 11, 13, 0.42)',
                    boxShadow: isSelected
                      ? `0 0 0 2px ${rankColor.border}, 0 8px 18px rgba(0,0,0,0.28)`
                      : 'inset 0 0 0 1px rgba(0,0,0,0.22)',
                    opacity: isSelected ? 1 : 0.72,
                    transform: isSelected ? 'translateY(-1px)' : 'none',
                    transition:
                      'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, opacity 140ms ease, transform 140ms ease',
                    '&:hover': {
                      borderColor: isSelected
                        ? rankColor.border
                        : 'rgba(248, 241, 222, 0.68)',
                      backgroundColor: isSelected
                        ? rankColor.background
                        : 'rgba(248, 241, 222, 0.12)',
                      color: isSelected ? rankColor.text : '#fff6db',
                      opacity: 1,
                      filter: 'brightness(1.08)',
                    },
                  }}
                >
                  {rankIndex + 1}순위
                </Button>
              );
            })}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
};

const RoleSelectionPanel = ({
  roleSelection,
  draftRolePreferenceIds,
  onSetRoleRank,
}: {
  roleSelection: MurderMysteryStateSnapshot['roleSelection'];
  draftRolePreferenceIds: string[];
  onSetRoleRank: (roleId: string, rankIndex: number) => void;
}) => {
  const roleById = new Map(roleSelection.roles.map((role) => [role.id, role]));
  const orderedRoles = draftRolePreferenceIds
    .map((roleId) => roleById.get(roleId))
    .filter(Boolean) as MurderMysteryStateSnapshot['roleSelection']['roles'];
  const assignedPlayerNameById = new Map(
    roleSelection.players.map((player) => [player.playerId, player.playerName])
  );

  return (
    <Box
      sx={{
        p: { xs: 1.2, sm: 1.5 },
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.14)',
      }}
    >
      <Stack spacing={1.3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={950}>캐릭터 선택</Typography>
            <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
              공개 표지만 보고 동시에 선호를 제출합니다. 순위는 본인에게만
              보입니다.
            </Typography>
          </Box>
          <Chip
            color={roleSelection.status === 'locked' ? 'success' : 'default'}
            label={
              roleSelection.status === 'locked'
                ? '배정 완료'
                : `제출 ${roleSelection.submittedCount}/${roleSelection.requiredPlayerCount}`
            }
          />
        </Stack>

        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
          {roleSelection.players.map((player) => (
            <Chip
              key={player.playerId}
              size="small"
              color={player.submitted ? 'success' : 'default'}
              label={`${player.playerName} ${player.submitted ? '제출' : '대기'}`}
            />
          ))}
        </Stack>

        {roleSelection.status === 'locked' ? (
          <Stack spacing={1}>
            {roleSelection.publicCovers.map((cover) => (
              <RolePublicCoverCard
                key={cover.id}
                cover={cover}
                currentRank={-1}
                rankCount={roleSelection.roles.length}
                assignedPlayerName={
                  cover.assignedPlayerId
                    ? (assignedPlayerNameById.get(cover.assignedPlayerId) ??
                      '배정됨')
                    : cover.selectable
                      ? '미배정'
                      : undefined
                }
              />
            ))}
          </Stack>
        ) : (
          <>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                backgroundColor: 'rgba(0,0,0,0.18)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
                내 선호 순위
              </Typography>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                {orderedRoles.map((role, index) => {
                  const rankColor = getRoleRankColor(index);

                  return (
                    <Chip
                      key={role.id}
                      size="small"
                      label={`${index + 1}순위 ${role.displayName}`}
                      sx={{
                        fontWeight: 850,
                        color: rankColor.text,
                        backgroundColor: rankColor.background,
                        border: `1px solid ${rankColor.border}`,
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>

            <Stack spacing={1}>
              {roleSelection.publicCovers.map((cover) => (
                <RolePublicCoverCard
                  key={cover.id}
                  cover={cover}
                  currentRank={
                    cover.selectable
                      ? draftRolePreferenceIds.indexOf(cover.id)
                      : -1
                  }
                  rankCount={roleSelection.roles.length}
                  onSetRank={
                    cover.selectable
                      ? (rankIndex) => onSetRoleRank(cover.id, rankIndex)
                      : undefined
                  }
                />
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Box>
  );
};

const RolePreSharePanel = ({
  roles,
  onShareRoleSheet,
}: {
  roles: MurderMysteryStateSnapshot['roleSelection']['roles'];
  onShareRoleSheet: (roleId: string) => void;
}) => (
  <Box
    sx={{
      p: { xs: 1.2, sm: 1.5 },
      borderRadius: 2,
      backgroundColor: 'rgba(247,241,222,0.09)',
      border: '1px solid rgba(247,241,222,0.16)',
    }}
  >
    <Stack spacing={1.2}>
      <Box>
        <Typography fontWeight={950}>사전 룰지 공유</Typography>
        <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
          카카오톡 링크로 프롤로그, 룰지, 규칙을 공유합니다.
        </Typography>
      </Box>
      <Stack spacing={1}>
        {roles.map((role) => (
          <Box
            key={role.id}
            sx={{
              p: 1.1,
              borderRadius: 1.5,
              backgroundColor: 'rgba(0,0,0,0.18)',
              border: '1px solid rgba(255,255,255,0.11)',
            }}
          >
            <Stack spacing={0.9}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <CharacterPortraitFrame
                  src={role.portraitSrc}
                  alt={role.portraitAlt}
                  label={role.displayName}
                  variant="thumbnail"
                  sx={{ width: 64 }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontWeight={900}>{role.displayName}</Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.3,
                      color: '#d8d0bd',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.55,
                    }}
                  >
                    {role.publicText}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<IosShareIcon />}
                  onClick={() => onShareRoleSheet(role.id)}
                >
                  카카오톡 공유
                </Button>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  </Box>
);

const MyDeskPanel = ({
  cardCount,
  publicScriptCount,
  canOpenRulebook = true,
  canOpenPublicScripts = true,
  onOpenRulebook,
  onOpenPublicScripts,
  onOpenPrivateCards,
  compact = false,
}: {
  cardCount: number;
  publicScriptCount: number;
  canOpenRulebook?: boolean;
  canOpenPublicScripts?: boolean;
  onOpenRulebook: () => void;
  onOpenPublicScripts: () => void;
  onOpenPrivateCards: () => void;
  compact?: boolean;
}) => (
  <Box
    sx={{
      p: compact ? 1 : 1.2,
      borderRadius: compact ? 0 : 2,
      backgroundColor: 'rgba(247, 241, 222, 0.94)',
      color: '#2b241c',
      boxShadow: compact ? '0 -10px 28px rgba(0,0,0,0.28)' : 'none',
    }}
  >
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
    >
      <Box
        sx={{
          minWidth: 0,
          display: compact ? { xs: 'none', sm: 'block' } : 'block',
        }}
      >
        <Typography fontWeight={950}>내 책상</Typography>
        <Typography variant="caption" sx={{ color: '#695538' }}>
          개인 정보는 내 화면에서만 열립니다.
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.8} sx={{ flex: compact ? 1 : 0 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<AutoStoriesIcon />}
          disabled={!canOpenRulebook}
          onClick={onOpenRulebook}
          sx={{ flex: compact ? 1 : undefined }}
        >
          룰북
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArticleIcon />}
          disabled={!canOpenPublicScripts}
          onClick={onOpenPublicScripts}
          sx={{ flex: compact ? 1 : undefined }}
        >
          낭독문 {publicScriptCount}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Inventory2Icon />}
          onClick={onOpenPrivateCards}
          sx={{ flex: compact ? 1 : undefined }}
        >
          카드 {cardCount}
        </Button>
      </Stack>
    </Stack>
  </Box>
);

const RulebookModal = ({
  open,
  roleSheet,
  introText,
  fullScreen,
  specialEvents,
  onReportSpecialEvent,
  onClose,
}: {
  open: boolean;
  roleSheet: MurderMysteryRoleSheetView | null;
  introText: string;
  fullScreen: boolean;
  specialEvents: MurderMysteryReportableSpecialEventView[];
  onReportSpecialEvent: (
    eventId: string,
    outcome: MurderMysterySpecialEventOutcome
  ) => void;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
    >
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
            룰북
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#f7f0df' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <MurderMysteryRulebookReader
          storageKey={
            roleSheet?.roleId
              ? `murderMystery:inGameRulebook:${roleSheet.roleId}`
              : undefined
          }
          roleDisplayName={roleSheet?.displayName ?? '역할 미배정'}
          rolePublicText={
            roleSheet?.publicText ?? '게임 시작 후 공개 정보가 표시됩니다.'
          }
          portraitSrc={roleSheet?.portraitSrc}
          portraitAlt={roleSheet?.portraitAlt}
          introText={introText}
          secretText={roleSheet?.secretText ?? ''}
          personalGoal={roleSheet?.personalGoal}
          ruleText={roleSheet?.ruleText}
          belongingHints={roleSheet?.belongingHints}
          secretTextHighlights={roleSheet?.secretTextHighlights}
          specialEvents={specialEvents}
          onReportSpecialEvent={onReportSpecialEvent}
          pageSx={{
            height: {
              xs: fullScreen ? 'calc(100svh - 206px)' : 660,
              sm: 760,
            },
          }}
          footerText="인게임 룰북은 본인 화면에서만 열립니다."
        />
      </DialogContent>
    </Dialog>
  );
};

const SpecialEventConfirmDialog = ({
  request,
  onClose,
  onConfirm,
}: {
  request: SpecialEventActionRequest | null;
  onClose: () => void;
  onConfirm: (request: SpecialEventActionRequest) => void;
}) => {
  const isReveal = request?.outcome === 'reveal';

  return (
    <Dialog open={Boolean(request)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 950 }}>
        {request?.label ?? '잠금 증언'} 확인
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ lineHeight: 1.7, wordBreak: 'keep-all' }}>
          {isReveal
            ? '여우가 아내토끼가 범인일거라고 발언한 게 맞습니까?'
            : '여우 외 인물이 먼저 아내토끼 범인 가능성을 제기했습니까?'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>취소</Button>
        <Button
          variant="contained"
          color={isReveal ? 'warning' : 'inherit'}
          onClick={() => {
            if (request) {
              onConfirm(request);
            }
          }}
        >
          {isReveal ? '공개 확정' : '폐기 확정'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const PublicScriptsDialog = ({
  open,
  scripts,
  fullScreen,
  onClose,
}: {
  open: boolean;
  scripts: MurderMysteryPublicScriptView[];
  fullScreen: boolean;
  onClose: () => void;
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="md"
    fullScreen={fullScreen}
  >
    <DialogTitle
      sx={{
        backgroundColor: '#211b17',
        color: '#f7f0df',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <ArticleIcon />
        <Typography fontWeight={950} sx={{ flex: 1 }}>
          공개 낭독문
        </Typography>
        <IconButton onClick={onClose} sx={{ color: '#f7f0df' }}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </DialogTitle>
    <DialogContent
      sx={{
        p: { xs: 1.4, sm: 2 },
        background:
          'linear-gradient(145deg, #201b18 0%, #3b3027 48%, #171c23 100%)',
        color: '#f7f0df',
      }}
    >
      {scripts.length > 0 ? (
        <Stack spacing={1.4}>
          {scripts.map((script) => (
            <Box
              key={script.stepId}
              sx={{
                p: { xs: 1.2, md: 1.6 },
                borderRadius: 2,
                border: script.current
                  ? '1px solid rgba(245, 197, 66, 0.82)'
                  : '1px solid rgba(255,255,255,0.14)',
                backgroundColor: script.current
                  ? 'rgba(245, 197, 66, 0.1)'
                  : 'rgba(255,255,255,0.06)',
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={950} sx={{ flex: 1 }}>
                    {script.label}
                  </Typography>
                  <Chip
                    size="small"
                    color={script.current ? 'warning' : 'default'}
                    label={script.current ? '현재 단계' : '공개됨'}
                  />
                </Stack>
                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.78 }}>
                  {script.readAloud}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography sx={{ color: '#d8d0bd' }}>
          아직 다시 읽을 수 있는 공개 낭독문이 없습니다.
        </Typography>
      )}
    </DialogContent>
  </Dialog>
);

const PublicCoverDialog = ({
  open,
  player,
  isSelf,
  canOpenRulebook,
  fullScreen,
  onClose,
  onOpenRulebook,
  onOpenPrivateCards,
  onOpenCard,
}: {
  open: boolean;
  player: MurderMysteryPublicPlayerView | null;
  isSelf: boolean;
  canOpenRulebook: boolean;
  fullScreen: boolean;
  onClose: () => void;
  onOpenRulebook: () => void;
  onOpenPrivateCards: () => void;
  onOpenCard: (card: AnyClueCard) => void;
}) => {
  const publicBackIds = new Set(
    (player?.publicRevealedClues ?? [])
      .map((card) => card.backId)
      .filter(Boolean) as string[]
  );
  const privateCardBacks =
    player?.heldCardBacks.filter((back) => !publicBackIds.has(back.backId)) ??
    [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AutoStoriesIcon />
          <Typography fontWeight={900} sx={{ flex: 1 }}>
            좌석 카드
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.8}>
          <Stack direction="row" spacing={1.4} alignItems="flex-start">
            <CharacterPortraitFrame
              src={player?.rolePortraitSrc ?? undefined}
              alt={player?.rolePortraitAlt ?? undefined}
              label={player?.roleDisplayName ?? '역할 미배정'}
              variant="thumbnail"
              sx={{ width: 96 }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h5" fontWeight={950}>
                {player?.roleDisplayName ?? '역할 미배정'}
              </Typography>
              <Typography color="text.secondary" fontWeight={800}>
                {player?.name}
              </Typography>
              <Stack
                direction="row"
                spacing={0.7}
                sx={{ mt: 0.8 }}
                flexWrap="wrap"
              >
                <Chip
                  size="small"
                  label={player?.socketId ? '연결' : '대기'}
                  color={player?.socketId ? 'success' : 'default'}
                />
                <Chip size="small" label={`공개 ${publicBackIds.size}장`} />
                <Chip
                  size="small"
                  label={`비공개 ${privateCardBacks.length}장`}
                />
              </Stack>
            </Box>
          </Stack>
          <Stack spacing={1}>
            <Typography fontWeight={900}>캐릭터 공개정보</Typography>
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
          </Stack>
          <Stack spacing={1}>
            <Typography fontWeight={900}>
              공개 카드 {player?.publicRevealedClues.length ?? 0}장
            </Typography>
            {player?.publicRevealedClues.length ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 112px))',
                  gap: 1,
                  alignItems: 'start',
                }}
              >
                {player.publicRevealedClues.map((card) => (
                  <EvidenceCardFace
                    key={`${player.id}:public:${card.id}`}
                    card={card}
                    dense
                    onOpen={onOpenCard}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                아직 이 자리에 공개 카드가 없습니다.
              </Typography>
            )}
          </Stack>
          <Box sx={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />
          <Stack spacing={1}>
            <Typography fontWeight={900}>
              비공개 카드 {privateCardBacks.length}장
            </Typography>
            {privateCardBacks.length ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 92px))',
                  gap: 1,
                  alignItems: 'start',
                }}
              >
                {privateCardBacks.map((back) => (
                  <HeldCardBackFace
                    key={`${player?.id}:private:${back.backId}`}
                    back={back}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                아직 이 자리에 비공개 카드가 없습니다.
              </Typography>
            )}
          </Stack>
          {isSelf ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AutoStoriesIcon />}
                disabled={!canOpenRulebook}
                onClick={onOpenRulebook}
              >
                비공개 룰북 열기
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Inventory2Icon />}
                onClick={onOpenPrivateCards}
              >
                내 개인 카드
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

const CardDetailDialog = ({
  card,
  onClose,
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
}: {
  card: AnyClueCard | null;
  onClose: () => void;
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const canNavigate = totalCount > 1;
  const hasImage = Boolean(card?.imageSrc);

  useEffect(() => {
    if (!card || !canNavigate) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNavigate, card, onNext, onPrevious]);

  const handleMediaPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!canNavigate) {
      return;
    }
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMediaPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canNavigate || !pointerStartRef.current) {
      return;
    }

    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    if (Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        onNext();
      } else {
        onPrevious();
      }
      return;
    }

    const rect = mediaRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    if (event.clientX < rect.left + rect.width / 2) {
      onPrevious();
    } else {
      onNext();
    }
  };

  return (
    <Dialog
      open={Boolean(card)}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 'min(92vw, 520px)',
          m: 1.5,
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: '#f8f1de',
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 4,
            backgroundColor: 'rgba(0,0,0,0.46)',
            color: '#fff',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.62)' },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          ref={mediaRef}
          onPointerDown={handleMediaPointerDown}
          onPointerUp={handleMediaPointerUp}
          onPointerCancel={() => {
            pointerStartRef.current = null;
          }}
          sx={{
            position: 'relative',
            cursor: canNavigate ? 'ew-resize' : 'default',
            touchAction: canNavigate ? 'pan-y' : 'auto',
            backgroundColor: hasImage ? '#171c23' : '#f8f1de',
            userSelect: 'none',
          }}
        >
          {card?.imageSrc ? (
            <Box
              component="img"
              src={card.imageSrc}
              alt={card.imageAlt ?? card.title}
              draggable={false}
              sx={{
                width: '100%',
                maxHeight: { xs: 320, sm: 380 },
                objectFit: 'contain',
                display: 'block',
              }}
            />
          ) : (
            <TextOnlyClueMedia detail />
          )}
          {canNavigate ? (
            <>
              <Chip
                size="small"
                label={`${currentIndex + 1} / ${totalCount}`}
                sx={{
                  position: 'absolute',
                  left: 10,
                  top: 10,
                  zIndex: 2,
                  fontWeight: 950,
                  backgroundColor: 'rgba(0,0,0,0.58)',
                  color: '#fff',
                }}
              />
              <IconButton
                aria-label="이전 단서"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onPrevious();
                }}
                sx={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 3,
                  color: '#fff',
                  backgroundColor: 'rgba(0,0,0,0.46)',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.62)' },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                aria-label="다음 단서"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onNext();
                }}
                sx={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 3,
                  color: '#fff',
                  backgroundColor: 'rgba(0,0,0,0.46)',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.62)' },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 10,
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  px: 1,
                  py: 0.35,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0,0,0,0.54)',
                  color: '#fff',
                  fontWeight: 850,
                  whiteSpace: 'nowrap',
                }}
              >
                좌우 클릭 또는 드래그로 넘기기
              </Typography>
            </>
          ) : null}
        </Box>
        <Stack spacing={1} sx={{ p: { xs: 1.4, sm: 1.8 } }}>
          <Typography variant="h6" fontWeight={950} sx={{ color: '#2d2419' }}>
            {card?.title}
          </Typography>
          {card && getCardSourceText(card) ? (
            <Typography
              variant="caption"
              fontWeight={900}
              sx={{ color: '#7a3324' }}
            >
              {getCardSourceText(card)}
            </Typography>
          ) : null}
          <Typography
            sx={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.75,
              color: '#2d2419',
            }}
          >
            {card ? (
              <RulebookRichText
                text={card.text}
                highlights={card.textHighlights}
              />
            ) : null}
          </Typography>
        </Stack>
      </Box>
    </Dialog>
  );
};

const MapFullscreenDialog = ({
  open,
  scene,
  fullScreen,
  onClose,
}: {
  open: boolean;
  scene: MurderMysteryInvestigationMapSceneScenario | null;
  fullScreen: boolean;
  onClose: () => void;
}) => {
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const lastGestureRef = useRef<{
    centerX: number;
    centerY: number;
    distance: number | null;
  } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    pointersRef.current.clear();
    lastGestureRef.current = null;
  }, []);

  useEffect(() => {
    if (open) {
      resetView();
    }
  }, [open, resetView]);

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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    updateGesture();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
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

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    updateGesture();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: fullScreen ? '100%' : 'min(96vw, 980px)',
          height: fullScreen ? '100%' : 'min(92vh, 760px)',
          m: fullScreen ? 0 : 1.5,
          overflow: 'hidden',
          backgroundColor: '#0b1117',
          color: '#f8f1de',
        },
      }}
    >
      <Stack sx={{ height: '100%' }}>
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
          <IconButton onClick={onClose} sx={{ color: '#f8f1de' }}>
            <CloseIcon />
          </IconButton>
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
              component="img"
              src={scene.imageSrc}
              alt={scene.alt}
              draggable={false}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center',
                transition:
                  pointersRef.current.size > 0
                    ? 'none'
                    : 'transform 120ms ease-out',
                userSelect: 'none',
              }}
            />
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
    </Dialog>
  );
};

const PrivateCardsDialog = ({
  open,
  cards,
  fullScreen,
  onClose,
  onOpenCard,
  onRevealPublicly,
}: {
  open: boolean;
  cards: MurderMysteryClueVaultCardView[];
  fullScreen: boolean;
  onClose: () => void;
  onOpenCard: (card: AnyClueCard) => void;
  onRevealPublicly: (cardId: string) => void;
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="md"
    fullScreen={fullScreen}
  >
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(156px, 174px))',
            gap: 1.4,
            alignItems: 'start',
          }}
        >
          {cards.map((card) => (
            <EvidenceCardFace
              key={card.id}
              card={card}
              onOpen={onOpenCard}
              showPublicRevealControl
              onRevealPublicly={onRevealPublicly}
            />
          ))}
        </Box>
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
  onNextPhase,
  onMarkRoleSheetRead,
  onFinalizeVote,
  onSubmitRolePreferences,
  onClearRolePreferences,
  onShareRoleSheet,
  onUpdateSeatPosition,
  onResetSeatLayout,
  onSubmitInvestigationByTarget,
  onSubmitInvestigationByBack,
  onSetReservation,
  onClearReservation,
  pendingReservationBackId,
  onRevealMyClue,
  onSubmitVote,
  onSubmitEndingChoice,
  onReportSpecialEvent,
}: MurderMysteryTableExperienceProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const tableRef = useRef<HTMLDivElement | null>(null);
  const phaseScrollRef = useRef<HTMLDivElement | null>(null);
  const seatPositionsRef = useRef<Record<string, MurderMysterySeatPosition>>(
    {}
  );
  const previousHeldBackIdsByPlayerRef = useRef<Record<
    string,
    Set<string>
  > | null>(null);
  const dragStateRef = useRef<{
    playerId: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    canDrag: boolean;
  } | null>(null);
  const modalHistoryDepthRef = useRef(0);
  const openModalCountRef = useRef(0);
  const suppressModalPopCountRef = useRef(0);
  const previousPhaseRef = useRef(snapshot.phase);
  const [seatPositions, setSeatPositions] = useState<
    Record<string, MurderMysterySeatPosition>
  >({});
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [isPublicScriptsOpen, setIsPublicScriptsOpen] = useState(false);
  const [isPrivateCardsOpen, setIsPrivateCardsOpen] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [cardViewer, setCardViewer] = useState<CardViewerState | null>(null);
  const [pendingSpecialEventAction, setPendingSpecialEventAction] =
    useState<SpecialEventActionRequest | null>(null);
  const [clueTakeNotice, setClueTakeNotice] = useState<ClueTakeNotice | null>(
    null
  );
  const [nowTick, setNowTick] = useState(Date.now());
  const [draftRolePreferenceIds, setDraftRolePreferenceIds] = useState<
    string[]
  >([]);
  const selectedCard = cardViewer?.cards[cardViewer.index] ?? null;

  const playerIdsKey = snapshot.players.map((player) => player.id).join('|');
  const roleIdsKey = snapshot.roleSelection.roles
    .map((role) => role.id)
    .join('|');
  const ownPreferenceIdsKey =
    snapshot.roleSelection.yourPreferenceRoleIds.join('|');
  const selfPlayer =
    snapshot.players.find((player) => player.id === sessionId) ?? null;
  const selectedPlayer =
    snapshot.players.find((player) => player.id === selectedPlayerId) ?? null;
  const cardViewerSources = useMemo(() => {
    const playerPublicCardIds = new Set(
      snapshot.players.flatMap((player) =>
        player.publicRevealedClues.map((card) => card.id)
      )
    );
    const sources: Record<string, AnyClueCard[]> = {
      'my-clues': snapshot.clueVault.myClues,
      'public-clues': snapshot.clueVault.publicClues,
      'discussion:table-public': snapshot.clueVault.publicClues.filter(
        (card) => !playerPublicCardIds.has(card.id)
      ),
    };
    snapshot.players.forEach((player) => {
      sources[`player:${player.id}:public`] = player.publicRevealedClues;
    });
    return sources;
  }, [
    snapshot.clueVault.myClues,
    snapshot.clueVault.publicClues,
    snapshot.players,
  ]);

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
  const isPhaseTimerExpired =
    phaseRemainingSec === 0 && snapshot.phaseTimer.durationSec !== null;
  const bgmTrack = getMurderMysteryBgmTrack(snapshot);
  const activeRound = snapshot.investigation.round;
  const activeRoundView =
    snapshot.investigation.rounds.find(
      (round) => round.round === activeRound
    ) ?? null;
  const canActNow = Boolean(snapshot.investigation.turn?.canActNow);
  const turnOrderMarkers = useMemo(() => {
    const turn = snapshot.investigation.turn;
    if (
      !turn ||
      turn.allPlayersDone ||
      turn.currentPlayerIndex < 0 ||
      !turn.currentPlayerId
    ) {
      return {};
    }

    const playersById = new Map(
      turn.players.map((player) => [player.playerId, player] as const)
    );
    const markers: Record<string, TurnOrderMarker> = {};
    let rank = 1;

    for (
      let index = turn.currentPlayerIndex;
      index < turn.orderedPlayerIds.length && rank <= 3;
      index += 1
    ) {
      const playerId = turn.orderedPlayerIds[index];
      const player = playersById.get(playerId);
      if (
        !player ||
        markers[playerId] ||
        player.completedCount >= player.requiredCount
      ) {
        continue;
      }

      markers[playerId] = {
        rank,
        isCurrent: playerId === turn.currentPlayerId,
      };
      rank += 1;
    }

    return markers;
  }, [snapshot.investigation.turn]);
  const getPlayerLabelById = useCallback(
    (playerId?: string | null) => {
      if (!playerId) {
        return null;
      }
      const turnPlayer = snapshot.investigation.turn?.players.find(
        (player) => player.playerId === playerId
      );
      const publicPlayer = snapshot.players.find(
        (player) => player.id === playerId
      );
      return formatParticipantLabel(turnPlayer ?? publicPlayer);
    },
    [snapshot.investigation.turn?.players, snapshot.players]
  );
  const currentTurnLabel = getPlayerLabelById(
    snapshot.investigation.turn?.currentPlayerId
  );
  const canUseHostTools = isHostView;
  const canEditSeatLayout = snapshot.phase === 'LOBBY';
  const hasRequiredPlayerCount =
    snapshot.hostParticipation.currentPlayerCount >=
    snapshot.hostParticipation.requiredPlayerCount;
  const isRoleSelectionLocked = snapshot.roleSelection.status === 'locked';
  const showNextPhaseTool =
    canUseHostTools &&
    phaseKind !== 'lobby' &&
    phaseKind !== 'final_vote' &&
    phaseKind !== 'endbook';
  const canAdvancePhase =
    (phaseKind !== 'role_reading' || snapshot.roleReading.allReady) &&
    (phaseKind !== 'ending_choice' || snapshot.endingChoices.allSubmitted);
  const nextPhaseTooltip =
    phaseKind === 'role_reading' && !snapshot.roleReading.allReady
      ? '모든 플레이어가 다 읽었어요를 눌러야 진행할 수 있습니다.'
      : phaseKind === 'ending_choice' && !snapshot.endingChoices.allSubmitted
        ? '모든 엔딩 선택이 제출되어야 진행할 수 있습니다.'
        : '다음 단계';
  const canFinalizeVote =
    canUseHostTools &&
    phaseKind === 'final_vote' &&
    !snapshot.finalVote.result &&
    (snapshot.canUseHostGameMasterControls ||
      snapshot.finalVote.submittedVoters >= snapshot.finalVote.totalVoters);
  const hasSubmittedRolePreferences =
    snapshot.roleSelection.yourPreferenceRoleIds.length ===
    snapshot.roleSelection.roles.length;
  const canSubmitRolePreferences =
    snapshot.roleSelection.status === 'open' &&
    draftRolePreferenceIds.length === snapshot.roleSelection.roles.length &&
    new Set(draftRolePreferenceIds).size ===
      snapshot.roleSelection.roles.length;
  const openModalCount =
    Number(isRulebookOpen) +
    Number(isPrivateCardsOpen) +
    Number(isPublicScriptsOpen) +
    Number(isMapDialogOpen) +
    Number(Boolean(pendingSpecialEventAction)) +
    Number(Boolean(selectedCard)) +
    Number(Boolean(selectedPlayer));
  const hasOpenModal = openModalCount > 0;
  const bringPhaseActionsIntoView = () => {
    setCardViewer(null);
    setSelectedPlayerId(null);
    setIsPrivateCardsOpen(false);
    setIsPublicScriptsOpen(false);
    setIsRulebookOpen(false);
    setIsMapDialogOpen(false);
    setPendingSpecialEventAction(null);
    window.setTimeout(() => {
      phaseScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };
  const openCardViewer = useCallback(
    (sourceId: string, cards: AnyClueCard[], card: AnyClueCard) => {
      if (cards.length === 0) {
        return;
      }
      const index = cards.findIndex((entry) => entry.id === card.id);
      setCardViewer({
        sourceId,
        cards,
        index: index >= 0 ? index : 0,
      });
    },
    []
  );
  const requestSpecialEventReport = useCallback(
    (eventId: string, outcome: MurderMysterySpecialEventOutcome) => {
      const event = snapshot.specialEvents.find(
        (entry) => entry.id === eventId
      );
      setPendingSpecialEventAction({
        eventId,
        label: event?.label ?? '잠금 증언',
        outcome,
      });
    },
    [snapshot.specialEvents]
  );
  const confirmSpecialEventReport = (request: SpecialEventActionRequest) => {
    setPendingSpecialEventAction(null);
    onReportSpecialEvent(request.eventId, request.outcome);
  };
  const showPreviousCard = useCallback(() => {
    setCardViewer((current) => {
      if (!current || current.cards.length <= 1) {
        return current;
      }
      return {
        ...current,
        index:
          (current.index - 1 + current.cards.length) % current.cards.length,
      };
    });
  }, []);
  const showNextCard = useCallback(() => {
    setCardViewer((current) => {
      if (!current || current.cards.length <= 1) {
        return current;
      }
      return {
        ...current,
        index: (current.index + 1) % current.cards.length,
      };
    });
  }, []);
  const closeTopModalFromHistory = useCallback(() => {
    if (pendingSpecialEventAction) {
      setPendingSpecialEventAction(null);
      return;
    }
    if (selectedCard) {
      setCardViewer(null);
      return;
    }
    if (isMapDialogOpen) {
      setIsMapDialogOpen(false);
      return;
    }
    if (isPrivateCardsOpen) {
      setIsPrivateCardsOpen(false);
      return;
    }
    if (isPublicScriptsOpen) {
      setIsPublicScriptsOpen(false);
      return;
    }
    if (isRulebookOpen) {
      setIsRulebookOpen(false);
      return;
    }
    if (selectedPlayer) {
      setSelectedPlayerId(null);
    }
  }, [
    isPrivateCardsOpen,
    isMapDialogOpen,
    isPublicScriptsOpen,
    isRulebookOpen,
    pendingSpecialEventAction,
    selectedCard,
    selectedPlayer,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    openModalCountRef.current = openModalCount;
  }, [openModalCount]);

  useEffect(() => {
    if (!isSmall) {
      return;
    }

    const handlePopState = () => {
      if (suppressModalPopCountRef.current > 0) {
        suppressModalPopCountRef.current -= 1;
        return;
      }
      if (modalHistoryDepthRef.current <= 0 || openModalCountRef.current <= 0) {
        return;
      }
      modalHistoryDepthRef.current -= 1;
      closeTopModalFromHistory();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [closeTopModalFromHistory, isSmall]);

  useEffect(() => {
    if (!isSmall) {
      return;
    }

    const currentDepth = modalHistoryDepthRef.current;
    if (openModalCount > currentDepth) {
      Array.from({ length: openModalCount - currentDepth }).forEach(
        (_, index) => {
          window.history.pushState(
            {
              murderMysteryModal: true,
              depth: currentDepth + index + 1,
            },
            '',
            window.location.href
          );
        }
      );
      modalHistoryDepthRef.current = openModalCount;
      return;
    }

    if (openModalCount < currentDepth) {
      const delta = currentDepth - openModalCount;
      suppressModalPopCountRef.current += delta;
      modalHistoryDepthRef.current = openModalCount;
      window.history.go(-delta);
    }
  }, [isSmall, openModalCount]);

  useEffect(() => {
    if (!cardViewer) {
      return;
    }

    const nextCards = cardViewerSources[cardViewer.sourceId] ?? [];
    if (nextCards.length === 0) {
      setCardViewer(null);
      return;
    }

    const currentCardId = cardViewer.cards[cardViewer.index]?.id;
    const nextIndex = Math.max(
      nextCards.findIndex((card) => card.id === currentCardId),
      0
    );
    const currentKey = cardViewer.cards.map((card) => card.id).join('|');
    const nextKey = nextCards.map((card) => card.id).join('|');

    if (currentKey !== nextKey || cardViewer.index !== nextIndex) {
      setCardViewer({
        sourceId: cardViewer.sourceId,
        cards: nextCards,
        index: nextIndex,
      });
    }
  }, [cardViewer, cardViewerSources]);

  useEffect(() => {
    const previous = previousHeldBackIdsByPlayerRef.current;
    const current: Record<string, Set<string>> = {};
    let nextNotice: ClueTakeNotice | null = null;

    snapshot.players.forEach((player) => {
      const currentBackIds = new Set(
        player.heldCardBacks.map((back) => back.backId)
      );
      const previousBackIds = previous?.[player.id];
      current[player.id] = currentBackIds;

      if (!previousBackIds) {
        return;
      }

      const addedBack = player.heldCardBacks.find(
        (back) => !previousBackIds.has(back.backId)
      );
      if (!addedBack) {
        return;
      }

      nextNotice = {
        id: `${player.id}:${addedBack.backId}:${Date.now()}`,
        playerId: player.id,
        playerLabel: formatParticipantLabel(player),
        backLabel: addedBack.shortLabel ?? addedBack.targetLabel,
        targetLabel: addedBack.targetLabel,
      };
    });

    previousHeldBackIdsByPlayerRef.current = current;
    if (nextNotice) {
      setClueTakeNotice(nextNotice);
    }
  }, [snapshot.players]);

  useEffect(() => {
    if (!clueTakeNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setClueTakeNotice((current) =>
        current?.id === clueTakeNotice.id ? null : current
      );
    }, 5200);

    return () => window.clearTimeout(timer);
  }, [clueTakeNotice]);

  useEffect(() => {
    if (
      previousPhaseRef.current === 'ROLE_READING' &&
      snapshot.phase !== 'ROLE_READING'
    ) {
      setIsRulebookOpen(false);
    }
    previousPhaseRef.current = snapshot.phase;
  }, [snapshot.phase]);

  useEffect(() => {
    seatPositionsRef.current = seatPositions;
  }, [seatPositions]);

  useEffect(() => {
    const playerIds = playerIdsKey ? playerIdsKey.split('|') : [];
    if (dragStateRef.current?.canDrag) {
      return;
    }
    setSeatPositions(mergeLayout(playerIds, snapshot.seatLayoutByPlayerId));
  }, [playerIdsKey, snapshot.seatLayoutByPlayerId]);

  useEffect(() => {
    const roleIds = roleIdsKey ? roleIdsKey.split('|') : [];
    const ownPreferenceIds = ownPreferenceIdsKey
      ? ownPreferenceIdsKey.split('|')
      : [];
    setDraftRolePreferenceIds(
      ownPreferenceIds.length === roleIds.length ? ownPreferenceIds : roleIds
    );
  }, [roleIdsKey, ownPreferenceIdsKey]);

  const setRolePreferenceRank = (roleId: string, rankIndex: number) => {
    const scenarioRoleIds = snapshot.roleSelection.roles.map((role) => role.id);
    setDraftRolePreferenceIds((current) => {
      const normalized = [
        ...current.filter(
          (currentRoleId) =>
            currentRoleId !== roleId && scenarioRoleIds.includes(currentRoleId)
        ),
      ];
      normalized.splice(
        clamp(rankIndex, 0, scenarioRoleIds.length - 1),
        0,
        roleId
      );
      scenarioRoleIds.forEach((scenarioRoleId) => {
        if (!normalized.includes(scenarioRoleId)) {
          normalized.push(scenarioRoleId);
        }
      });
      return normalized.slice(0, scenarioRoleIds.length);
    });
  };

  const updateSeatPositionFromPointer = (
    playerId: string,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const rect = tableRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 14, 86);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 14, 86);
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
    const canDrag = canEditSeatLayout && playerId === sessionId;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      playerId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      canDrag,
    };
    if (canDrag) {
      setDraggingPlayerId(playerId);
    }
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
    if (distance > 3 && state.canDrag) {
      state.moved = true;
      updateSeatPositionFromPointer(state.playerId, event);
    }
  };

  const handleSeatPointerUp = async (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!state.moved) {
      setSelectedPlayerId(state.playerId);
    }
    if (state.moved && state.canDrag) {
      const nextPosition = seatPositionsRef.current[state.playerId];
      if (nextPosition) {
        const success = await onUpdateSeatPosition(
          state.playerId,
          nextPosition
        );
        if (!success) {
          const playerIds = playerIdsKey ? playerIdsKey.split('|') : [];
          setSeatPositions(
            mergeLayout(playerIds, snapshot.seatLayoutByPlayerId)
          );
        }
      }
    }
    dragStateRef.current = null;
    setDraggingPlayerId(null);
  };

  const resetSeats = () => {
    onResetSeatLayout();
  };

  const renderIntroArea = () => {
    const introText =
      snapshot.publicScripts.find((script) => script.current)?.readAloud ??
      currentStep?.readAloud ??
      snapshot.scenario.intro.readAloud;
    const isHostReading = canUseHostTools;

    return (
      <Stack spacing={1.8}>
        <Box
          sx={{
            p: { xs: 1.6, md: 2.2 },
            borderRadius: 3,
            border: isHostReading
              ? '1px solid rgba(245, 197, 66, 0.72)'
              : '1px solid rgba(255,255,255,0.16)',
            backgroundColor: isHostReading
              ? 'rgba(245, 197, 66, 0.12)'
              : 'rgba(255,255,255,0.06)',
            boxShadow: isHostReading ? '0 18px 42px rgba(0,0,0,0.28)' : 'none',
          }}
        >
          <Stack spacing={1.4}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<ArticleIcon />}
                color={isHostReading ? 'warning' : 'default'}
                label={currentStep?.label ?? '프롤로그'}
              />
              <Chip
                icon={<TimerIcon />}
                label={
                  isPhaseTimerExpired
                    ? '권장 시간이 지났습니다'
                    : `권장 시간 ${formatSeconds(phaseRemainingSec)}`
                }
                sx={{
                  backgroundColor: isPhaseTimerExpired
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(255,255,255,0.12)',
                  color: '#f8f1de',
                }}
              />
            </Stack>

            <Box>
              <Typography
                variant="h4"
                fontWeight={950}
                sx={{
                  fontSize: { xs: 26, md: 34 },
                  lineHeight: 1.15,
                  wordBreak: 'keep-all',
                }}
              >
                {isHostReading
                  ? '방장이 소리 내어 읽어주세요'
                  : '방장이 낭독 중입니다'}
              </Typography>
              <Typography sx={{ mt: 0.8, color: '#d8d0bd', lineHeight: 1.65 }}>
                {isHostReading
                  ? '플레이어들이 같은 장면을 듣고 시작할 수 있도록 천천히 읽은 뒤 다음 단계로 넘기세요.'
                  : '지문은 함께 볼 수 있지만, 진행은 방장이 낭독을 마친 뒤 넘어갑니다.'}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            p: { xs: 1.4, md: 2 },
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.14)',
            backgroundColor: 'rgba(11, 15, 20, 0.58)',
          }}
        >
          <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.78 }}>
            {introText}
          </Typography>
        </Box>

        {!isHostReading ? (
          <Typography sx={{ color: '#d8d0bd' }}>
            방장의 진행을 기다려주세요.
          </Typography>
        ) : null}
      </Stack>
    );
  };

  const renderRoleReadingArea = () => (
    <Stack spacing={1.8}>
      <Stack spacing={0.8}>
        <Typography variant="h5" fontWeight={950}>
          비공개 룰지 읽기
        </Typography>
        <Typography sx={{ color: '#d8d0bd', lineHeight: 1.7 }}>
          {currentStep?.description ??
            '각자 비공개 룰지를 읽고, 준비가 되면 다 읽었어요를 눌러주세요.'}
        </Typography>
      </Stack>

      <Box
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.14)',
          backgroundColor: 'rgba(255,255,255,0.06)',
          p: { xs: 1.3, md: 1.6 },
        }}
      >
        <Stack spacing={1.2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<TimerIcon />}
                label={
                  isPhaseTimerExpired
                    ? '권장 시간이 지났습니다'
                    : `권장 시간 ${formatSeconds(phaseRemainingSec)}`
                }
                sx={{
                  backgroundColor: isPhaseTimerExpired
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(255,255,255,0.12)',
                  color: '#f8f1de',
                }}
              />
              <Chip
                icon={<TaskAltIcon />}
                label={`${snapshot.roleReading.readyCount}/${snapshot.roleReading.totalCount} 읽음`}
                color={snapshot.roleReading.allReady ? 'success' : 'default'}
                sx={{
                  color: snapshot.roleReading.allReady ? undefined : '#f8f1de',
                  backgroundColor: snapshot.roleReading.allReady
                    ? undefined
                    : 'rgba(255,255,255,0.12)',
                }}
              />
            </Stack>
            {snapshot.roleReading.allReady ? (
              <Typography variant="body2" sx={{ color: '#9fe3c0' }}>
                모두 준비되었습니다. 1라운드 조사 전 지문으로 이동합니다.
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
                시간이 끝나도 자동 진행되지 않습니다.
              </Typography>
            )}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {snapshot.roleReading.players.map((player) => (
              <Chip
                key={player.playerId}
                label={`${player.playerName} · ${
                  player.ready ? '읽음' : '대기'
                }`}
                color={player.ready ? 'success' : 'default'}
                variant={player.ready ? 'filled' : 'outlined'}
                sx={{
                  borderColor: player.ready
                    ? undefined
                    : 'rgba(255,255,255,0.32)',
                  color: player.ready ? undefined : '#f8f1de',
                }}
              />
            ))}
          </Stack>
        </Stack>
      </Box>

      {canUseHostTools ? (
        <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
          모두가 다 읽었어요를 누르면 자동으로 조사 전 낭독 단계로 이동합니다.
        </Typography>
      ) : null}
    </Stack>
  );

  const renderInvestigationArea = () => {
    const targetGroups = activeRoundView
      ? buildInvestigationTargetGroups(activeRoundView.targets)
      : [];
    const pendingReservation =
      pendingReservationBackId && activeRoundView
        ? (activeRoundView.targets
            .flatMap((target) => target.availableBacks)
            .find((back) => back.backId === pendingReservationBackId) ?? null)
        : null;
    const reservationView =
      snapshot.investigation.turn?.myReservation ?? pendingReservation;
    const isReservationPending =
      Boolean(pendingReservationBackId) &&
      !snapshot.investigation.turn?.myReservation;

    return (
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
              {canActNow &&
              snapshot.investigation.turn?.extraInvestigationPending
                ? '전체 공개 단서를 확인했습니다. 한 번 더 조사할 수 있습니다.'
                : canActNow
                  ? '내 차례입니다. 테이블 위 뒷면 카드 한 장을 가져가세요.'
                  : snapshot.investigation.turn?.myReservation
                    ? '예약 토큰이 꽂혀 있습니다. 내 차례가 오면 가져갈 수 있습니다.'
                    : currentTurnLabel
                      ? `${currentTurnLabel}의 단서 수집 차례입니다. 내 차례가 아니면 뒷면 카드를 눌러 예약할 수 있습니다.`
                      : '내 차례가 아니면 뒷면 카드를 눌러 예약할 수 있습니다.'}
            </Typography>
          </Box>
          <Chip
            color={canActNow ? 'warning' : 'default'}
            label={
              snapshot.investigation.turn?.currentPlayerId
                ? canActNow
                  ? '내 조사 차례'
                  : `${currentTurnLabel ?? '다른 플레이어'} 차례`
                : '조사 차례 종료'
            }
          />
        </Stack>

        {reservationView ? (
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              p: { xs: 1.15, md: 1.25 },
              borderRadius: 2,
              backgroundColor: isReservationPending ? '#17263a' : '#2b2112',
              border: isReservationPending
                ? '1px solid rgba(96, 165, 250, 0.58)'
                : '1px solid rgba(245, 197, 66, 0.72)',
              boxShadow: '0 12px 26px rgba(0,0,0,0.3)',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <PushPinIcon
                sx={{
                  color: isReservationPending ? '#93c5fd' : '#f5c542',
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={950}>
                  {isReservationPending ? '예약 처리 중' : '예약 완료'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#fff8e6',
                    lineHeight: 1.45,
                    fontWeight: 850,
                    wordBreak: 'keep-all',
                  }}
                >
                  {reservationView.targetLabel} ·{' '}
                  {reservationView.shortLabel ?? CARD_BACK_LABEL}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: isReservationPending ? '#c7ddff' : '#f5d27b',
                    lineHeight: 1.45,
                  }}
                >
                  내 차례가 오면 자동 획득됩니다.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={onClearReservation}
              >
                예약 해제
              </Button>
            </Stack>
          </Box>
        ) : null}

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
            {targetGroups.map((group) => (
              <Box
                key={group.id}
                sx={{
                  p: 1.2,
                  borderRadius: 2,
                  backgroundColor: group.isOwnedByViewer
                    ? 'rgba(80, 68, 55, 0.42)'
                    : 'rgba(255,255,255,0.07)',
                  border: group.isOwnedByViewer
                    ? '1px solid rgba(245, 197, 66, 0.36)'
                    : '1px solid rgba(255,255,255,0.14)',
                }}
              >
                <Stack spacing={1}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography fontWeight={950}>{group.label}</Typography>
                      <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
                        {formatInvestigationCountText(group)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.6} flexWrap="wrap">
                      {group.isOwnedByViewer ? (
                        <Chip
                          size="small"
                          color={
                            group.isOwnedFallbackForViewer
                              ? 'success'
                              : 'warning'
                          }
                          label={
                            group.isOwnedFallbackForViewer
                              ? '내 소지품 · 마지막 선택 가능'
                              : '내 소지품 · 조사 불가'
                          }
                        />
                      ) : null}
                      {group.targets.length > 1 ? (
                        <Chip
                          size="small"
                          label={`묶음 ${group.targets.length}개`}
                          sx={{
                            backgroundColor: 'rgba(255,255,255,0.12)',
                            color: '#f8f1de',
                          }}
                        />
                      ) : null}
                    </Stack>
                  </Stack>

                  {group.targets.map((target) => {
                    const isTurnClosed =
                      !snapshot.investigation.turn?.currentPlayerId ||
                      Boolean(snapshot.investigation.turn?.allPlayersDone);
                    const targetDisabled =
                      !target.canInvestigateByViewer ||
                      isTurnClosed ||
                      snapshot.investigation.used;
                    const disabledReason = !target.canInvestigateByViewer
                      ? (target.investigationRestrictionReason ??
                        '본인의 소지품은 조사할 수 없습니다.')
                      : isTurnClosed
                        ? '현재 조사 가능한 차례가 없습니다.'
                        : snapshot.investigation.used
                          ? '이번 라운드 조사 기회를 이미 사용했습니다.'
                          : undefined;

                    return (
                      <Box
                        key={target.id}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          backgroundColor: 'rgba(0,0,0,0.14)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={1.2}
                          alignItems={{ xs: 'stretch', md: 'center' }}
                        >
                          <Box
                            sx={{
                              minWidth: { md: 170 },
                              flex: { xs: 1, md: 0 },
                            }}
                          >
                            <Typography fontWeight={900}>
                              {target.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: '#cfc5ad' }}
                            >
                              {formatInvestigationCountText(target)}
                            </Typography>
                          </Box>
                          {target.availableBacks.length > 0 ? (
                            <Box
                              sx={{
                                display: 'flex',
                                gap: 0.9,
                                flexWrap: 'wrap',
                                minWidth: 0,
                              }}
                            >
                              {target.availableBacks.map((back) => (
                                <InvestigationCardBack
                                  key={back.backId}
                                  back={back}
                                  canActNow={canActNow}
                                  disabled={targetDisabled}
                                  disabledReason={disabledReason}
                                  isPendingReservation={
                                    pendingReservationBackId === back.backId
                                  }
                                  onTake={onSubmitInvestigationByBack}
                                  onReserve={onSetReservation}
                                  onClearReservation={onClearReservation}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Button
                              disabled={target.isExhausted || targetDisabled}
                              variant="outlined"
                              color="inherit"
                              onClick={() =>
                                onSubmitInvestigationByTarget(target.id)
                              }
                            >
                              {target.isExhausted
                                ? '소진됨'
                                : target.isOwnedByViewer &&
                                    !target.isOwnedFallbackForViewer
                                  ? '내 소지품 조사 불가'
                                  : '조사하기'}
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
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
  };

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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(156px, 174px))',
            gap: 1.25,
            alignItems: 'start',
          }}
        >
          {snapshot.clueVault.publicClues.map((card) => (
            <EvidenceCardFace
              key={`public:${card.id}`}
              card={card}
              onOpen={(openedCard) =>
                openCardViewer(
                  'public-clues',
                  snapshot.clueVault.publicClues,
                  openedCard
                )
              }
            />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
          아직 테이블 중앙에 공개된 단서가 없습니다.
        </Typography>
      )}
    </Stack>
  );

  const renderDiscussionArea = () => {
    const playerPublicCardIds = new Set(
      snapshot.players.flatMap((player) =>
        player.publicRevealedClues.map((card) => card.id)
      )
    );
    const tablePublicClues = snapshot.clueVault.publicClues.filter(
      (card) => !playerPublicCardIds.has(card.id)
    );
    const playersWithPublicCards = snapshot.players.filter(
      (player) => player.publicRevealedClues.length > 0
    );
    const hasAnyPublicCard =
      tablePublicClues.length > 0 || playersWithPublicCards.length > 0;

    return (
      <Stack spacing={1.6}>
        <Box
          sx={{
            p: { xs: 1.4, md: 1.8 },
            borderRadius: 3,
            border: '1px solid rgba(245, 197, 66, 0.72)',
            backgroundColor: 'rgba(245, 197, 66, 0.13)',
            boxShadow: '0 18px 42px rgba(0,0,0,0.28)',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="h4"
                fontWeight={950}
                sx={{
                  fontSize: { xs: 25, md: 32 },
                  lineHeight: 1.15,
                  wordBreak: 'keep-all',
                }}
              >
                회의 시간
              </Typography>
              <Typography sx={{ mt: 0.6, color: '#f5e7bf', lineHeight: 1.6 }}>
                공개된 단서와 맵을 보며 결론을 정리하세요. 시간이 끝나면 다음
                단계로 자동 진행됩니다.
              </Typography>
            </Box>
            <Chip
              icon={<TimerIcon />}
              color={isPhaseTimerExpired ? 'warning' : 'default'}
              label={
                isPhaseTimerExpired
                  ? '곧 다음 단계'
                  : `남은 시간 ${formatSeconds(phaseRemainingSec)}`
              }
              sx={{
                alignSelf: { xs: 'flex-start', sm: 'center' },
                backgroundColor: isPhaseTimerExpired
                  ? undefined
                  : 'rgba(255,255,255,0.14)',
                color: isPhaseTimerExpired ? undefined : '#f8f1de',
                fontWeight: 900,
              }}
            />
          </Stack>
        </Box>

        {snapshot.investigation.map?.scene ? (
          <Box
            component="button"
            type="button"
            onClick={() => setIsMapDialogOpen(true)}
            sx={{
              display: 'block',
              width: '100%',
              p: 0,
              textAlign: 'left',
              color: 'inherit',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#101720',
              cursor: 'zoom-in',
            }}
          >
            <Box
              component="img"
              src={snapshot.investigation.map.scene.imageSrc}
              alt={snapshot.investigation.map.scene.alt}
              sx={{
                display: 'block',
                width: '100%',
                maxHeight: { xs: 220, md: 320 },
                objectFit: 'contain',
              }}
            />
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                px: 1.2,
                py: 1,
                backgroundColor: 'rgba(0,0,0,0.32)',
              }}
            >
              <MapIcon fontSize="small" />
              <Typography fontWeight={950} sx={{ flex: 1 }}>
                맵 크게 보기
              </Typography>
              <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
                확대/이동 가능
              </Typography>
            </Stack>
          </Box>
        ) : null}

        <Stack spacing={1.2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <StyleIcon fontSize="small" />
            <Typography fontWeight={950}>회의 공개 카드</Typography>
            <Chip
              size="small"
              label={`${snapshot.clueVault.publicClues.length}장`}
            />
          </Stack>

          {!hasAnyPublicCard ? (
            <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
              아직 전체 공개된 단서가 없습니다.
            </Typography>
          ) : null}

          {tablePublicClues.length > 0 ? (
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              <Typography fontWeight={950} sx={{ mb: 1 }}>
                테이블 공개 카드
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(142px, 174px))',
                  gap: 1.2,
                  alignItems: 'start',
                }}
              >
                {tablePublicClues.map((card) => (
                  <EvidenceCardFace
                    key={`discussion:table:${card.id}`}
                    card={card}
                    onOpen={(openedCard) =>
                      openCardViewer(
                        'discussion:table-public',
                        tablePublicClues,
                        openedCard
                      )
                    }
                  />
                ))}
              </Box>
            </Box>
          ) : null}

          {playersWithPublicCards.map((player) => (
            <Box
              key={`discussion:${player.id}`}
              sx={{
                p: 1.2,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={950} sx={{ flex: 1 }}>
                    {formatParticipantLabel(player)}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${player.publicRevealedClues.length}장`}
                  />
                </Stack>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(142px, 174px))',
                    gap: 1.2,
                    alignItems: 'start',
                  }}
                >
                  {player.publicRevealedClues.map((card) => (
                    <EvidenceCardFace
                      key={`discussion:${player.id}:${card.id}`}
                      card={card}
                      onOpen={(openedCard) =>
                        openCardViewer(
                          `player:${player.id}:public`,
                          player.publicRevealedClues,
                          openedCard
                        )
                      }
                    />
                  ))}
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    );
  };

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
      ) : null}
    </Stack>
  );

  const renderEndingChoiceArea = () => {
    const endingChoices = snapshot.endingChoices;

    return (
      <Stack spacing={1.6}>
        <Box>
          <Typography variant="h5" fontWeight={950}>
            최종 선택
          </Typography>
          <Typography sx={{ color: '#d8d0bd' }}>
            최종 지목 결과에 따라 열린 선택입니다. 이 선택은 엔딩에 크게 영향을
            줍니다.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={`제출 ${endingChoices.submittedCount} / ${endingChoices.totalCount}`}
            color={endingChoices.allSubmitted ? 'success' : 'warning'}
          />
          {endingChoices.progress.map((progress) => (
            <Chip
              key={progress.choiceId}
              label={`${progress.roleDisplayName}: ${
                progress.submitted ? '제출 완료' : '대기'
              }`}
              color={progress.submitted ? 'success' : 'warning'}
            />
          ))}
        </Stack>
        {endingChoices.choices.length > 0 ? (
          endingChoices.choices.map((choice) => (
            <Box
              key={choice.id}
              sx={{
                p: 1.4,
                borderRadius: 2,
                backgroundColor: 'rgba(15, 19, 24, 0.78)',
                border: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              <Stack spacing={1.1}>
                <Box>
                  <Typography fontWeight={900}>{choice.label}</Typography>
                  <Typography sx={{ color: '#d8d0bd', whiteSpace: 'pre-wrap' }}>
                    {choice.description}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                  {choice.options.map((option) => (
                    <Button
                      key={option.id}
                      size="small"
                      variant={
                        choice.yourSelection === option.id
                          ? 'contained'
                          : 'outlined'
                      }
                      color={
                        choice.yourSelection === option.id
                          ? 'success'
                          : 'warning'
                      }
                      disabled={choice.submitted}
                      onClick={() => onSubmitEndingChoice(choice.id, option.id)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Stack>
                {choice.yourSelection ? (
                  <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
                    선택을 제출했습니다. 다른 선택을 기다리는 중입니다.
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          ))
        ) : (
          <Typography sx={{ color: '#d8d0bd' }}>
            이 단계에서 당신에게 열린 선택지는 없습니다. 필요한 선택이 제출될
            때까지 기다리세요.
          </Typography>
        )}
      </Stack>
    );
  };

  const renderFloatingActionDock = () => {
    if (hasOpenModal && !(phaseKind === 'investigate' && canActNow)) {
      return null;
    }

    let title = '';
    let description = '';
    let chips: React.ReactNode = null;
    let actions: React.ReactNode = null;

    if (phaseKind === 'lobby') {
      if (snapshot.roleSelection.status === 'locked') {
        title = '캐릭터 배정 완료';
        description = '잠시 후 방장이 프롤로그 낭독을 시작합니다.';
      } else {
        title = hasSubmittedRolePreferences
          ? '선호 제출 완료'
          : '캐릭터 선호를 제출하세요';
        description = hasSubmittedRolePreferences
          ? '배정 전까지 선호 순위를 다시 제출하거나 취소할 수 있습니다.'
          : '순위를 확인한 뒤 제출해야 캐릭터 배정이 진행됩니다.';
        chips = (
          <Chip
            size="small"
            label={`제출 ${snapshot.roleSelection.submittedCount}/${snapshot.roleSelection.requiredPlayerCount}`}
            color={hasSubmittedRolePreferences ? 'success' : 'warning'}
          />
        );
        actions = (
          <>
            <Button
              size="small"
              variant="contained"
              color="warning"
              disabled={!canSubmitRolePreferences}
              onClick={() => onSubmitRolePreferences(draftRolePreferenceIds)}
            >
              {hasSubmittedRolePreferences ? '선호 다시 제출' : '선호 제출'}
            </Button>
            {hasSubmittedRolePreferences ? (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={onClearRolePreferences}
              >
                제출 취소
              </Button>
            ) : null}
          </>
        );
      }
    } else if (phaseKind === 'intro') {
      title = canUseHostTools
        ? '방장이 낭독을 진행하세요'
        : '방장이 낭독 중입니다';
      description = canUseHostTools
        ? '지문을 소리 내어 읽은 뒤 다음 단계로 넘기세요.'
        : '지문을 함께 보며 방장의 진행을 기다려주세요.';
      actions = canUseHostTools ? (
        <Button
          size="small"
          variant="contained"
          color="warning"
          startIcon={<TaskAltIcon />}
          onClick={onNextPhase}
        >
          낭독 완료, 다음으로
        </Button>
      ) : null;
    } else if (phaseKind === 'role_reading') {
      title = snapshot.roleReading.yourReady
        ? '읽음 완료'
        : '비공개 룰지를 읽고 완료를 눌러주세요';
      description = snapshot.roleReading.yourReady
        ? '다른 플레이어가 다 읽으면 자동으로 다음 낭독 단계로 이동합니다.'
        : '룰북을 연 뒤 내용을 확인하고 다 읽었어요를 누르세요.';
      chips = (
        <Chip
          size="small"
          label={`${snapshot.roleReading.readyCount}/${snapshot.roleReading.totalCount} 읽음`}
          color={snapshot.roleReading.allReady ? 'success' : 'warning'}
        />
      );
      actions = (
        <>
          <Button
            size="small"
            variant="contained"
            startIcon={<AutoStoriesIcon />}
            disabled={!snapshot.roleSheet}
            onClick={() => setIsRulebookOpen(true)}
            sx={{
              backgroundColor: '#4655c7',
              '&:hover': { backgroundColor: '#3542a5' },
            }}
          >
            비공개 룰북 열기
          </Button>
          {!snapshot.roleReading.yourReady ? (
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<TaskAltIcon />}
              disabled={!selfPlayer}
              onClick={onMarkRoleSheetRead}
            >
              다 읽었어요
            </Button>
          ) : null}
        </>
      );
    } else if (phaseKind === 'investigate') {
      title = canActNow
        ? snapshot.investigation.turn?.extraInvestigationPending
          ? '추가 조사 가능'
          : '내 조사 차례입니다'
        : snapshot.investigation.turn?.myReservation
          ? '예약한 카드가 있습니다'
          : currentTurnLabel
            ? `${currentTurnLabel} 조사 차례입니다`
            : '다른 플레이어 조사 차례입니다';
      description = canActNow
        ? '테이블의 뒷면 카드 중 하나를 선택하세요.'
        : snapshot.investigation.turn?.myReservation
          ? '내 차례가 오면 예약한 카드를 가져갈 수 있습니다.'
          : currentTurnLabel
            ? `${currentTurnLabel}이 단서를 가져갈 차례입니다. 필요하면 내 차례 전에 카드를 예약해둘 수 있습니다.`
            : '필요하면 내 차례 전에 카드를 예약해둘 수 있습니다.';
      chips = activeRound ? (
        <Chip
          size="small"
          color={canActNow ? 'warning' : 'default'}
          label={`${activeRound}라운드`}
        />
      ) : null;
      actions = (
        <Button
          size="small"
          variant={canActNow ? 'contained' : 'outlined'}
          color={canActNow ? 'warning' : 'inherit'}
          onClick={bringPhaseActionsIntoView}
        >
          조사하러 가기
        </Button>
      );
    } else if (phaseKind === 'final_vote') {
      title = snapshot.finalVote.yourVote
        ? '최종 투표 제출 완료'
        : '최종 투표를 선택하세요';
      description = snapshot.finalVote.result
        ? '투표가 집계되었습니다.'
        : snapshot.finalVote.yourVote
          ? '다른 플레이어의 투표와 집계를 기다려주세요.'
          : '범인 지목은 엔딩 분기에 영향을 줍니다.';
      chips = (
        <Chip
          size="small"
          label={`투표 ${snapshot.finalVote.submittedVoters}/${snapshot.finalVote.totalVoters}`}
          color={snapshot.finalVote.yourVote ? 'success' : 'warning'}
        />
      );
      actions = (
        <>
          {!snapshot.finalVote.result && !snapshot.finalVote.yourVote ? (
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<HowToVoteIcon />}
              onClick={bringPhaseActionsIntoView}
            >
              투표 선택하기
            </Button>
          ) : null}
          {canFinalizeVote ? (
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<HowToVoteIcon />}
              onClick={onFinalizeVote}
            >
              투표 집계
            </Button>
          ) : null}
        </>
      );
    } else if (phaseKind === 'ending_choice') {
      const endingChoices = snapshot.endingChoices;
      const hasPendingChoice = endingChoices.choices.some(
        (choice) => !choice.submitted
      );
      title = endingChoices.allSubmitted
        ? '최종 선택 완료'
        : hasPendingChoice
          ? '엔딩 선택을 제출하세요'
          : '엔딩 선택 대기 중';
      description = endingChoices.allSubmitted
        ? '방장이 엔딩으로 진행할 수 있습니다.'
        : hasPendingChoice
          ? '당신에게 열린 선택지를 확인하고 제출하세요.'
          : '다른 인물의 선택이 제출되기를 기다리는 중입니다.';
      chips = (
        <Stack direction="row" spacing={0.5}>
          <Chip
            size="small"
            label={`제출 ${endingChoices.submittedCount}/${endingChoices.totalCount}`}
            color={endingChoices.allSubmitted ? 'success' : 'warning'}
          />
        </Stack>
      );
      actions = hasPendingChoice ? (
        <Button
          size="small"
          variant="contained"
          color="warning"
          onClick={bringPhaseActionsIntoView}
        >
          선택지 보기
        </Button>
      ) : null;
    }

    if (!title) {
      return null;
    }

    return (
      <FloatingActionDock
        title={title || '놓치면 안 되는 액션'}
        description={description}
        chips={chips}
        actions={actions}
        bottomOffset={{ xs: isSmall ? 74 : 16, md: 18 }}
      />
    );
  };

  const renderPhaseBody = () => {
    if (phaseKind === 'lobby') {
      return (
        <Stack spacing={1.5}>
          <Typography variant="h5" fontWeight={950}>
            자리와 닉네임 확인
          </Typography>
          <Typography sx={{ color: '#d8d0bd' }}>
            위쪽 자리 맞추기 테이블에서 자기 토큰을 움직여 실제 자리감을
            맞추세요.
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
          <RoleSelectionPanel
            roleSelection={snapshot.roleSelection}
            draftRolePreferenceIds={draftRolePreferenceIds}
            onSetRoleRank={setRolePreferenceRank}
          />
          {canUseHostTools ? (
            <RolePreSharePanel
              roles={snapshot.roleSelection.roles}
              onShareRoleSheet={onShareRoleSheet}
            />
          ) : null}
          {!hasRequiredPlayerCount ? (
            <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
              모든 참가자가 입장하면 캐릭터 선호 제출을 완료할 수 있습니다.
            </Typography>
          ) : !isRoleSelectionLocked ? (
            <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
              모든 참가자의 캐릭터 선호가 제출되면 배정이 공개되고 비공개 룰지
              읽기가 바로 시작됩니다.
            </Typography>
          ) : null}
        </Stack>
      );
    }

    if (phaseKind === 'intro') {
      return renderIntroArea();
    }

    if (phaseKind === 'role_reading') {
      return renderRoleReadingArea();
    }

    if (phaseKind === 'investigate') {
      return renderInvestigationArea();
    }

    if (phaseKind === 'discuss') {
      return renderDiscussionArea();
    }

    if (phaseKind === 'final_vote') {
      return renderVoteArea();
    }

    if (phaseKind === 'ending_choice') {
      return renderEndingChoiceArea();
    }

    return (
      <Stack spacing={1.6}>
        <Typography variant="h5" fontWeight={950}>
          엔딩
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72 }}>
          {snapshot.endbook
            ? `${snapshot.endbook.title}\n\n${snapshot.endbook.body}\n\n${snapshot.endbook.closingLine}`
            : '투표 집계 후 엔딩이 표시됩니다.'}
        </Typography>
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        height: '100dvh',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
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
          flexShrink: 0,
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
          <BgmControl track={bgmTrack} />
          <Chip
            icon={<TimerIcon />}
            label={formatSeconds(phaseRemainingSec)}
            sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#f8f1de' }}
          />
          {canUseHostTools && snapshot.phase === 'LOBBY' ? (
            <Tooltip title="자리 초기화">
              <IconButton onClick={resetSeats} sx={{ color: '#f8f1de' }}>
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          {showNextPhaseTool ? (
            <Tooltip title={nextPhaseTooltip}>
              <span>
                <IconButton
                  onClick={onNextPhase}
                  disabled={!canAdvancePhase}
                  sx={{ color: '#f8f1de' }}
                >
                  <SkipNextIcon />
                </IconButton>
              </span>
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
        component="main"
        sx={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            lg: '280px minmax(0, 1fr) 260px',
          },
          gridTemplateRows: {
            xs: 'auto minmax(0, 1fr)',
            lg: 'minmax(0, 1fr)',
          },
          gap: { xs: 1, lg: 1.4 },
          p: { xs: 1, md: 1.4 },
          pb: hasOpenModal ? { xs: 10, lg: 1.4 } : { xs: 22, lg: 10 },
          overflow: 'hidden',
        }}
      >
        <Stack
          spacing={1}
          sx={{
            gridColumn: { xs: '1', lg: '1' },
            gridRow: { xs: '1', lg: '1' },
            minHeight: 0,
            overflow: { xs: 'visible', lg: 'auto' },
            pr: { lg: 0.2 },
          }}
        >
          <SeatTable
            players={snapshot.players}
            sessionId={sessionId}
            positions={seatPositions}
            tableRef={tableRef}
            canEdit={canEditSeatLayout}
            canReset={canUseHostTools && snapshot.phase === 'LOBBY'}
            isCompact={phaseKind !== 'lobby'}
            clueTakeHighlightPlayerId={clueTakeNotice?.playerId ?? null}
            turnOrderMarkers={turnOrderMarkers}
            draggingPlayerId={draggingPlayerId}
            onPointerDown={handleSeatPointerDown}
            onPointerMove={handleSeatPointerMove}
            onPointerUp={handleSeatPointerUp}
            onReset={resetSeats}
          />
        </Stack>

        <Box
          ref={phaseScrollRef}
          sx={{
            gridColumn: { xs: '1', lg: '2' },
            gridRow: { xs: '2', lg: '1' },
            minHeight: 0,
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.18)',
            backgroundColor: 'rgba(14, 23, 25, 0.86)',
            boxShadow: '0 28px 70px rgba(0,0,0,0.42)',
            p: { xs: 1.3, md: 2 },
            pb: hasOpenModal ? { xs: 8.5, lg: 2 } : { xs: 18, lg: 11 },
            overflow: 'auto',
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

        {!isSmall ? (
          <Stack
            spacing={1}
            sx={{
              gridColumn: { lg: '3' },
              gridRow: { lg: '1' },
              alignSelf: 'end',
            }}
          >
            <MyDeskPanel
              cardCount={snapshot.clueVault.myClues.length}
              publicScriptCount={snapshot.publicScripts.length}
              canOpenRulebook={Boolean(snapshot.roleSheet)}
              canOpenPublicScripts={snapshot.publicScripts.length > 0}
              onOpenRulebook={() => setIsRulebookOpen(true)}
              onOpenPublicScripts={() => setIsPublicScriptsOpen(true)}
              onOpenPrivateCards={() => setIsPrivateCardsOpen(true)}
            />
          </Stack>
        ) : null}
      </Box>

      {isSmall ? (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 30,
            borderTop: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <MyDeskPanel
            compact
            cardCount={snapshot.clueVault.myClues.length}
            publicScriptCount={snapshot.publicScripts.length}
            canOpenRulebook={Boolean(snapshot.roleSheet)}
            canOpenPublicScripts={snapshot.publicScripts.length > 0}
            onOpenRulebook={() => setIsRulebookOpen(true)}
            onOpenPublicScripts={() => setIsPublicScriptsOpen(true)}
            onOpenPrivateCards={() => setIsPrivateCardsOpen(true)}
          />
        </Box>
      ) : null}

      {renderFloatingActionDock()}
      <ClueTakeOverlay notice={clueTakeNotice} />

      <PublicCoverDialog
        open={Boolean(selectedPlayer)}
        player={selectedPlayer}
        isSelf={selectedPlayer?.id === sessionId}
        canOpenRulebook={Boolean(snapshot.roleSheet)}
        fullScreen={isSmall}
        onClose={() => setSelectedPlayerId(null)}
        onOpenRulebook={() => {
          setSelectedPlayerId(null);
          setIsRulebookOpen(true);
        }}
        onOpenPrivateCards={() => {
          setSelectedPlayerId(null);
          setIsPrivateCardsOpen(true);
        }}
        onOpenCard={(card) =>
          openCardViewer(
            `player:${selectedPlayer?.id}:public`,
            selectedPlayer?.publicRevealedClues ?? [],
            card
          )
        }
      />
      <RulebookModal
        open={isRulebookOpen}
        roleSheet={snapshot.roleSheet}
        introText={snapshot.scenario.intro.readAloud}
        fullScreen={isSmall}
        specialEvents={snapshot.specialEvents}
        onReportSpecialEvent={requestSpecialEventReport}
        onClose={() => setIsRulebookOpen(false)}
      />
      <PublicScriptsDialog
        open={isPublicScriptsOpen}
        scripts={snapshot.publicScripts}
        fullScreen={isSmall}
        onClose={() => setIsPublicScriptsOpen(false)}
      />
      <PrivateCardsDialog
        open={isPrivateCardsOpen}
        cards={snapshot.clueVault.myClues}
        fullScreen={isSmall}
        onClose={() => setIsPrivateCardsOpen(false)}
        onOpenCard={(card) =>
          openCardViewer('my-clues', snapshot.clueVault.myClues, card)
        }
        onRevealPublicly={onRevealMyClue}
      />
      <CardDetailDialog
        card={selectedCard}
        currentIndex={cardViewer?.index ?? 0}
        totalCount={cardViewer?.cards.length ?? 0}
        onPrevious={showPreviousCard}
        onNext={showNextCard}
        onClose={() => setCardViewer(null)}
      />
      <MapFullscreenDialog
        open={isMapDialogOpen}
        scene={snapshot.investigation.map?.scene ?? null}
        fullScreen={isSmall}
        onClose={() => setIsMapDialogOpen(false)}
      />
      <SpecialEventConfirmDialog
        request={pendingSpecialEventAction}
        onClose={() => setPendingSpecialEventAction(null)}
        onConfirm={confirmSpecialEventReport}
      />
    </Box>
  );
}
