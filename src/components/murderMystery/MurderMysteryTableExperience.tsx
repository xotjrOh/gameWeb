'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  ExpandMore as ExpandMoreIcon,
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
  MurderMysteryEndbookEvidenceQnaScenario,
  MurderMysteryEndbookEvidenceReferenceScenario,
  MurderMysteryFinalVoteOptionScenario,
  MurderMysteryInvestigationBackCardView,
  MurderMysteryInvestigationMapHotspotView,
  MurderMysteryInvestigationMapSceneScenario,
  MurderMysteryInvestigationTargetView,
  MurderMysteryPublicPlayerView,
  MurderMysteryPublicScriptView,
  MurderMysteryReportableSpecialEventView,
  MurderMysteryRoleSheetView,
  MurderMysterySpecialEventOutcome,
  MurderMysteryStateSnapshot,
  MurderMysteryStepKind,
} from '@/types/murderMystery';
import CharacterPortraitFrame from '@/components/murderMystery/CharacterPortraitFrame';
import MurderMysteryRulebookReader from '@/components/murderMystery/MurderMysteryRulebookReader';
import RulebookRichText from '@/components/murderMystery/RulebookRichText';

interface MurderMysteryTableExperienceProps {
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
type RoleSelectionPublicCover =
  MurderMysteryStateSnapshot['roleSelection']['publicCovers'][number];
type EndbookEvidenceReference = MurderMysteryEndbookEvidenceReferenceScenario;
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
type InvestigationCardMatEntry = {
  target: MurderMysteryInvestigationTargetView;
  matNumber?: number;
};
type InvestigationCardMatGroup = {
  id: string;
  label: string;
  order: number;
  targets: InvestigationCardMatEntry[];
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
type PinnedClueReference = {
  sourceId: string;
  cardId: string;
};
type FloatingFabDockSide = 'left' | 'right';
type FloatingFabPosition = {
  side: FloatingFabDockSide;
  yRatio: number;
};
type FloatingFabViewport = {
  width: number;
  height: number;
};
type FloatingFabDragPosition = {
  left: number;
  top: number;
};
type PinnedClueDockSide = FloatingFabDockSide;
type PinnedClueFabPosition = FloatingFabPosition;
type PinnedClueFabViewport = FloatingFabViewport;
type PinnedClueFabDragPosition = FloatingFabDragPosition;
type InvestigationMapTargetPin = {
  target: MurderMysteryInvestigationTargetView;
  hotspot: MurderMysteryInvestigationMapHotspotView;
  matNumber: number;
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
const EXTRA_INVESTIGATION_LABEL = '전체공개 후 추가조사';
const EXTRA_INVESTIGATION_DESCRIPTION =
  '이 표식이 있는 카드는 획득 즉시 전체 공개되고, 조사자가 같은 라운드에서 한 번 더 조사합니다.';
const FLOATING_FAB_SIZE = 64;
const FLOATING_FAB_EDGE_OFFSET = 12;
const FLOATING_FAB_TOP_SAFE_OFFSET = 50;
const FLOATING_FAB_DRAG_THRESHOLD = 5;
const PINNED_CLUE_FAB_SIZE = FLOATING_FAB_SIZE;
const PINNED_CLUE_FAB_EDGE_OFFSET = FLOATING_FAB_EDGE_OFFSET;
const PINNED_CLUE_FAB_TOP_SAFE_OFFSET = FLOATING_FAB_TOP_SAFE_OFFSET;
const PINNED_CLUE_FAB_DRAG_THRESHOLD = FLOATING_FAB_DRAG_THRESHOLD;
const PINNED_CLUE_FAB_STORAGE_KEY = 'murderMystery:pinnedClueFabPosition:v1';
const MAP_FAB_STORAGE_KEY = 'murderMystery:mapFabPosition:v1';
const DEFAULT_PINNED_CLUE_FAB_POSITION: FloatingFabPosition = {
  side: 'right',
  yRatio: 1,
};
const DEFAULT_MAP_FAB_POSITION: FloatingFabPosition = {
  side: 'right',
  yRatio: 0.46,
};
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

const splitScenarioTitle = (title: string) => {
  const normalizedTitle = title.trim();
  const colonIndex = normalizedTitle.indexOf(':');
  const fullWidthColonIndex = normalizedTitle.indexOf('：');
  const separatorIndex =
    colonIndex >= 0 && fullWidthColonIndex >= 0
      ? Math.min(colonIndex, fullWidthColonIndex)
      : Math.max(colonIndex, fullWidthColonIndex);

  if (separatorIndex <= 0 || separatorIndex >= normalizedTitle.length - 1) {
    return { mainTitle: normalizedTitle, subtitle: null };
  }

  return {
    mainTitle: normalizedTitle.slice(0, separatorIndex).trim(),
    subtitle: normalizedTitle.slice(separatorIndex + 1).trim() || null,
  };
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

const getPlayerInitial = (name: string) =>
  Array.from(name.trim()).find((char) => char.trim()) ?? '?';

const getRolePreferenceShortName = (displayName: string) => {
  const trimmed = displayName.trim();
  const firstToken = trimmed.split(/\s+/)[0] ?? trimmed;
  return firstToken.replace(/^(남편|아내)/, '') || firstToken || '역할';
};

const getRoleShareDisplayName = (displayName: string) => {
  const trimmed = displayName.trim();
  const [firstToken = '', ...restTokens] = trimmed.split(/\s+/);
  const roleToken = firstToken.replace(/^(남편|아내)/, '') || firstToken;
  return [roleToken, ...restTokens].filter(Boolean).join(' ') || '캐릭터';
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

const isRumorInvestigationTarget = (
  target: MurderMysteryInvestigationTargetView
) => target.label.includes('소문');

const isBelongingsInvestigationTarget = (
  target: MurderMysteryInvestigationTargetView
) => {
  return (
    target.containerId?.startsWith('belongings') ||
    target.containerLabel?.includes('소지품') ||
    target.label.includes('소지품')
  );
};

const getInvestigationCardMatCategory = (
  target: MurderMysteryInvestigationTargetView,
  mappedTargetIds: Set<string>
) => {
  if (target.targetType === 'location' && mappedTargetIds.has(target.id)) {
    return { id: 'map', label: '지도 위치 단서', order: 10 };
  }
  if (isRumorInvestigationTarget(target)) {
    return { id: 'rumor', label: '소문', order: 30 };
  }
  if (isBelongingsInvestigationTarget(target)) {
    return { id: 'belongings', label: '소지품', order: 20 };
  }
  return { id: 'other', label: '기타 단서', order: 40 };
};

const buildInvestigationCardMatGroups = (
  targets: MurderMysteryInvestigationTargetView[],
  mappedTargetIds: Set<string>,
  matNumberByTargetId: Map<string, number>
): InvestigationCardMatGroup[] => {
  const groups = new Map<string, InvestigationCardMatGroup>();

  targets.forEach((target) => {
    const category = getInvestigationCardMatCategory(target, mappedTargetIds);
    const current =
      groups.get(category.id) ??
      ({
        id: category.id,
        label: category.label,
        order: category.order,
        targets: [],
      } satisfies InvestigationCardMatGroup);

    current.targets.push({
      target,
      matNumber: matNumberByTargetId.get(target.id),
    });
    groups.set(category.id, current);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      targets: group.targets.sort(
        (a, b) =>
          (a.matNumber ?? a.target.order ?? Number.MAX_SAFE_INTEGER) -
            (b.matNumber ?? b.target.order ?? Number.MAX_SAFE_INTEGER) ||
          a.target.label.localeCompare(b.target.label)
      ),
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
};

const buildInvestigationMapTargetPins = (
  targets: MurderMysteryInvestigationTargetView[] | undefined,
  hotspots: MurderMysteryInvestigationMapHotspotView[] | undefined
): InvestigationMapTargetPin[] => {
  if (!targets?.length || !hotspots?.length) {
    return [];
  }

  const hotspotByTargetId = new Map(
    hotspots.map((hotspot) => [hotspot.targetId, hotspot] as const)
  );

  return (
    targets
      .filter((target) => target.targetType === 'location')
      .map((target) => {
        const hotspot = hotspotByTargetId.get(target.id);
        return hotspot ? { target, hotspot } : null;
      })
      .filter(Boolean) as Array<{
      target: MurderMysteryInvestigationTargetView;
      hotspot: MurderMysteryInvestigationMapHotspotView;
    }>
  )
    .sort(
      (a, b) =>
        (a.target.order ?? Number.MAX_SAFE_INTEGER) -
          (b.target.order ?? Number.MAX_SAFE_INTEGER) ||
        a.target.label.localeCompare(b.target.label)
    )
    .map((entry, index) => ({ ...entry, matNumber: index + 1 }));
};

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

  const shouldStart = isBlocked || !isPlaying;
  const tooltip = shouldStart
    ? `${track.label} 시작`
    : muted
      ? `${track.label} 소리 켜기`
      : `${track.label} 음소거`;

  return (
    <Fragment>
      <audio ref={audioRef} preload="auto" loop />
      <Tooltip title={tooltip}>
        <IconButton
          size="small"
          aria-label={tooltip}
          onClick={
            shouldStart ? startBgm : () => setMuted((current) => !current)
          }
          sx={{
            color: '#f8f1de',
            backgroundColor: shouldStart
              ? 'rgba(245, 197, 66, 0.18)'
              : 'rgba(255,255,255,0.08)',
            '&:hover': {
              backgroundColor: shouldStart
                ? 'rgba(245, 197, 66, 0.26)'
                : 'rgba(255,255,255,0.14)',
            },
          }}
        >
          {shouldStart ? (
            <MusicNoteIcon fontSize="small" />
          ) : muted ? (
            <VolumeOffIcon fontSize="small" />
          ) : (
            <VolumeUpIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Fragment>
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

const ClueTakeOverlay = ({
  notice,
  topOffset,
}: {
  notice: ClueTakeNotice | null;
  topOffset: { xs: number; md: number };
}) => {
  if (!notice) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        left: { xs: 10, md: '50%' },
        right: { xs: 10, md: 'auto' },
        top: { xs: topOffset.xs, md: topOffset.md },
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

const getPinnedClueFabBounds = (
  viewport: PinnedClueFabViewport,
  bottomOffset: number
) => {
  const maxTop = Math.max(
    PINNED_CLUE_FAB_EDGE_OFFSET,
    viewport.height - bottomOffset - PINNED_CLUE_FAB_SIZE
  );
  const minTop = Math.min(PINNED_CLUE_FAB_TOP_SAFE_OFFSET, maxTop);
  const maxLeft = Math.max(
    PINNED_CLUE_FAB_EDGE_OFFSET,
    viewport.width - PINNED_CLUE_FAB_SIZE - PINNED_CLUE_FAB_EDGE_OFFSET
  );

  return {
    minTop,
    maxTop,
    minLeft: PINNED_CLUE_FAB_EDGE_OFFSET,
    maxLeft,
  };
};

const getPinnedClueFabTop = (
  position: PinnedClueFabPosition,
  viewport: PinnedClueFabViewport,
  bottomOffset: number
) => {
  const bounds = getPinnedClueFabBounds(viewport, bottomOffset);
  return (
    bounds.minTop +
    (bounds.maxTop - bounds.minTop) * clamp(position.yRatio, 0, 1)
  );
};

const getPinnedClueFabLeft = (
  position: PinnedClueFabPosition,
  viewport: PinnedClueFabViewport
) => {
  const bounds = getPinnedClueFabBounds(viewport, 0);
  return position.side === 'left' ? bounds.minLeft : bounds.maxLeft;
};

const readPinnedClueFabPosition = (): PinnedClueFabPosition => {
  try {
    const raw = window.localStorage.getItem(PINNED_CLUE_FAB_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    const side: unknown = saved?.side;
    const yRatio = Number(saved?.yRatio);

    if ((side === 'left' || side === 'right') && Number.isFinite(yRatio)) {
      return { side, yRatio: clamp(yRatio, 0, 1) };
    }
  } catch {
    // 위치 저장은 편의 기능이므로 실패해도 기본 위치로 동작한다.
  }

  return DEFAULT_PINNED_CLUE_FAB_POSITION;
};

const savePinnedClueFabPosition = (position: PinnedClueFabPosition) => {
  try {
    window.localStorage.setItem(
      PINNED_CLUE_FAB_STORAGE_KEY,
      JSON.stringify(position)
    );
  } catch {
    // 위치 저장 실패는 단서 열기 동작을 막지 않는다.
  }
};

const readMapFabPosition = (): FloatingFabPosition => {
  try {
    const raw = window.localStorage.getItem(MAP_FAB_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    const side: unknown = saved?.side;
    const yRatio = Number(saved?.yRatio);

    if ((side === 'left' || side === 'right') && Number.isFinite(yRatio)) {
      return { side, yRatio: clamp(yRatio, 0, 1) };
    }
  } catch {
    // 위치 저장은 편의 기능이므로 실패해도 기본 위치로 동작한다.
  }

  return DEFAULT_MAP_FAB_POSITION;
};

const saveMapFabPosition = (position: FloatingFabPosition) => {
  try {
    window.localStorage.setItem(MAP_FAB_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // 위치 저장 실패는 지도 열기 동작을 막지 않는다.
  }
};

const PinnedClueFab = ({
  card,
  bottomOffset,
  onOpen,
}: {
  card: AnyClueCard;
  bottomOffset: number;
  onOpen: () => void;
}) => {
  const pointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    moved: boolean;
  } | null>(null);
  const [position, setPosition] = useState<PinnedClueFabPosition>(
    DEFAULT_PINNED_CLUE_FAB_POSITION
  );
  const [viewport, setViewport] = useState<PinnedClueFabViewport | null>(null);
  const [dragPosition, setDragPosition] =
    useState<PinnedClueFabDragPosition | null>(null);
  const resolvedTop =
    viewport && !dragPosition
      ? getPinnedClueFabTop(position, viewport, bottomOffset)
      : null;
  const resolvedLeft =
    viewport && !dragPosition ? getPinnedClueFabLeft(position, viewport) : null;
  const tooltipPlacement = position.side === 'left' ? 'right' : 'left';

  useEffect(() => {
    setPosition(readPinnedClueFabPosition());
  }, []);

  useEffect(() => {
    const updateViewport = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const getDragPosition = (event: React.PointerEvent<HTMLElement>) => {
    if (!viewport || !pointerRef.current) {
      return null;
    }

    const bounds = getPinnedClueFabBounds(viewport, bottomOffset);
    const nextLeft = clamp(
      pointerRef.current.startLeft + event.clientX - pointerRef.current.startX,
      bounds.minLeft,
      bounds.maxLeft
    );
    const nextTop = clamp(
      pointerRef.current.startTop + event.clientY - pointerRef.current.startY,
      bounds.minTop,
      bounds.maxTop
    );

    return { left: nextLeft, top: nextTop };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!viewport) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - pointer.startX,
      event.clientY - pointer.startY
    );
    if (distance < PINNED_CLUE_FAB_DRAG_THRESHOLD && !pointer.moved) {
      return;
    }

    pointer.moved = true;
    const nextDragPosition = getDragPosition(event);
    if (nextDragPosition) {
      setDragPosition(nextDragPosition);
    }
    event.preventDefault();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // 포인터 캡처가 이미 해제된 경우에는 후속 처리를 계속한다.
    }
    pointerRef.current = null;

    if (!pointer.moved || !viewport) {
      setDragPosition(null);
      onOpen();
      return;
    }

    const nextDragPosition = getDragPosition(event) ?? dragPosition;
    if (!nextDragPosition) {
      setDragPosition(null);
      return;
    }

    const bounds = getPinnedClueFabBounds(viewport, bottomOffset);
    const nextSide: PinnedClueDockSide =
      nextDragPosition.left + PINNED_CLUE_FAB_SIZE / 2 < viewport.width / 2
        ? 'left'
        : 'right';
    const nextYRatio =
      bounds.maxTop > bounds.minTop
        ? (nextDragPosition.top - bounds.minTop) /
          (bounds.maxTop - bounds.minTop)
        : DEFAULT_PINNED_CLUE_FAB_POSITION.yRatio;
    const nextPosition: PinnedClueFabPosition = {
      side: nextSide,
      yRatio: clamp(nextYRatio, 0, 1),
    };

    setPosition(nextPosition);
    savePinnedClueFabPosition(nextPosition);
    setDragPosition(null);
    event.preventDefault();
  };

  const handlePointerCancel = () => {
    pointerRef.current = null;
    setDragPosition(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    onOpen();
  };

  return (
    <Tooltip title="고정한 단서 열기" placement={tooltipPlacement}>
      <Box
        component="button"
        type="button"
        aria-label={`고정한 단서 열기: ${card.title}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        sx={{
          position: 'fixed',
          left: dragPosition?.left ?? resolvedLeft ?? 'auto',
          right:
            dragPosition || resolvedLeft !== null
              ? 'auto'
              : PINNED_CLUE_FAB_EDGE_OFFSET,
          top: dragPosition?.top ?? resolvedTop ?? 'auto',
          bottom: dragPosition || resolvedTop !== null ? 'auto' : bottomOffset,
          zIndex: 1700,
          width: PINNED_CLUE_FAB_SIZE,
          height: PINNED_CLUE_FAB_SIZE,
          p: 0,
          border: '2px solid rgba(245, 197, 66, 0.92)',
          borderRadius: '50%',
          overflow: 'hidden',
          color: '#f8f1de',
          backgroundColor: '#201b18',
          boxShadow:
            '0 14px 34px rgba(0,0,0,0.46), 0 0 0 5px rgba(245,197,66,0.15)',
          cursor: dragPosition ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
          touchAction: 'none',
          transition: dragPosition
            ? 'none'
            : 'left 190ms ease, right 190ms ease, top 190ms ease, transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
          '&:hover': {
            transform: dragPosition ? 'none' : 'translateY(-2px)',
            borderColor: '#fbbf24',
            boxShadow:
              '0 18px 40px rgba(0,0,0,0.52), 0 0 0 6px rgba(245,197,66,0.2)',
          },
          '&:focus-visible': {
            outline: '3px solid rgba(251, 191, 36, 0.72)',
            outlineOffset: 3,
          },
        }}
      >
        {card.imageSrc ? (
          <Box
            component="img"
            src={card.imageSrc}
            alt=""
            draggable={false}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(135deg, #e8dcc2 0%, #f8f1de 52%, #d4c29f 100%)',
              color: '#5f4b2e',
              pointerEvents: 'none',
            }}
          >
            <ArticleIcon />
          </Stack>
        )}
        <Box
          sx={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: 25,
            height: 25,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            backgroundColor: '#f59e0b',
            color: '#241706',
            border: '2px solid #201b18',
            pointerEvents: 'none',
          }}
        >
          <PushPinIcon sx={{ width: 15, height: 15 }} />
        </Box>
      </Box>
    </Tooltip>
  );
};

const InvestigationMapFab = ({
  scene,
  bottomOffset,
  onOpen,
}: {
  scene: MurderMysteryInvestigationMapSceneScenario;
  bottomOffset: number;
  onOpen: () => void;
}) => {
  const pointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    moved: boolean;
  } | null>(null);
  const [position, setPosition] = useState<FloatingFabPosition>(
    DEFAULT_MAP_FAB_POSITION
  );
  const [viewport, setViewport] = useState<FloatingFabViewport | null>(null);
  const [dragPosition, setDragPosition] =
    useState<FloatingFabDragPosition | null>(null);
  const resolvedTop =
    viewport && !dragPosition
      ? getPinnedClueFabTop(position, viewport, bottomOffset)
      : null;
  const resolvedLeft =
    viewport && !dragPosition ? getPinnedClueFabLeft(position, viewport) : null;
  const tooltipPlacement = position.side === 'left' ? 'right' : 'left';

  useEffect(() => {
    setPosition(readMapFabPosition());
  }, []);

  useEffect(() => {
    const updateViewport = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const getDragPosition = (event: React.PointerEvent<HTMLElement>) => {
    if (!viewport || !pointerRef.current) {
      return null;
    }

    const bounds = getPinnedClueFabBounds(viewport, bottomOffset);
    const nextLeft = clamp(
      pointerRef.current.startLeft + event.clientX - pointerRef.current.startX,
      bounds.minLeft,
      bounds.maxLeft
    );
    const nextTop = clamp(
      pointerRef.current.startTop + event.clientY - pointerRef.current.startY,
      bounds.minTop,
      bounds.maxTop
    );

    return { left: nextLeft, top: nextTop };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!viewport) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - pointer.startX,
      event.clientY - pointer.startY
    );
    if (distance < FLOATING_FAB_DRAG_THRESHOLD && !pointer.moved) {
      return;
    }

    pointer.moved = true;
    const nextDragPosition = getDragPosition(event);
    if (nextDragPosition) {
      setDragPosition(nextDragPosition);
    }
    event.preventDefault();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // 포인터 캡처가 이미 해제된 경우에는 후속 처리를 계속한다.
    }
    pointerRef.current = null;

    if (!pointer.moved || !viewport) {
      setDragPosition(null);
      onOpen();
      return;
    }

    const nextDragPosition = getDragPosition(event) ?? dragPosition;
    if (!nextDragPosition) {
      setDragPosition(null);
      return;
    }

    const bounds = getPinnedClueFabBounds(viewport, bottomOffset);
    const nextSide: FloatingFabDockSide =
      nextDragPosition.left + FLOATING_FAB_SIZE / 2 < viewport.width / 2
        ? 'left'
        : 'right';
    const nextYRatio =
      bounds.maxTop > bounds.minTop
        ? (nextDragPosition.top - bounds.minTop) /
          (bounds.maxTop - bounds.minTop)
        : DEFAULT_MAP_FAB_POSITION.yRatio;
    const nextPosition: FloatingFabPosition = {
      side: nextSide,
      yRatio: clamp(nextYRatio, 0, 1),
    };

    setPosition(nextPosition);
    saveMapFabPosition(nextPosition);
    setDragPosition(null);
    event.preventDefault();
  };

  const handlePointerCancel = () => {
    pointerRef.current = null;
    setDragPosition(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    onOpen();
  };

  return (
    <Tooltip title="조사 지도 열기" placement={tooltipPlacement}>
      <Box
        component="button"
        type="button"
        aria-label="조사 지도 열기"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        sx={{
          position: 'fixed',
          left: dragPosition?.left ?? resolvedLeft ?? 'auto',
          right:
            dragPosition || resolvedLeft !== null
              ? 'auto'
              : FLOATING_FAB_EDGE_OFFSET,
          top: dragPosition?.top ?? resolvedTop ?? 'auto',
          bottom: dragPosition || resolvedTop !== null ? 'auto' : bottomOffset,
          zIndex: 1695,
          width: FLOATING_FAB_SIZE,
          height: FLOATING_FAB_SIZE,
          p: 0,
          border: '2px solid rgba(142, 202, 230, 0.95)',
          borderRadius: '50%',
          overflow: 'hidden',
          color: '#f8f1de',
          backgroundColor: '#101720',
          boxShadow:
            '0 14px 34px rgba(0,0,0,0.44), 0 0 0 5px rgba(142,202,230,0.14)',
          cursor: dragPosition ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
          touchAction: 'none',
          transition: dragPosition
            ? 'none'
            : 'left 190ms ease, right 190ms ease, top 190ms ease, transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
          '&:hover': {
            transform: dragPosition ? 'none' : 'translateY(-2px)',
            borderColor: '#7dd3fc',
            boxShadow:
              '0 18px 40px rgba(0,0,0,0.5), 0 0 0 6px rgba(142,202,230,0.2)',
          },
          '&:focus-visible': {
            outline: '3px solid rgba(125, 211, 252, 0.72)',
            outlineOffset: 3,
          },
        }}
      >
        <Box
          component="img"
          src={scene.imageSrc}
          alt=""
          draggable={false}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter: 'saturate(0.95) contrast(1.06)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 48% 42%, transparent 38%, rgba(8,13,18,0.34) 76%)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: 25,
            height: 25,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            backgroundColor: '#0ea5e9',
            color: '#f8fbff',
            border: '2px solid #101720',
            pointerEvents: 'none',
          }}
        >
          <MapIcon sx={{ width: 15, height: 15 }} />
        </Box>
      </Box>
    </Tooltip>
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
              label={EXTRA_INVESTIGATION_LABEL}
              color="info"
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                zIndex: 1,
                height: 20,
                maxWidth: dense ? 102 : 150,
                fontSize: dense ? 9.5 : 10,
                fontWeight: 900,
                '& .MuiChip-label': {
                  px: 0.65,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
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
              ? back.extraInvestigationOnReveal
                ? `내 조사 차례입니다. 이 카드를 가져오면 ${EXTRA_INVESTIGATION_DESCRIPTION}`
                : '내 조사 차례입니다. 이 카드를 가져옵니다.'
              : back.extraInvestigationOnReveal
                ? `내 차례 전까지 이 카드를 예약합니다. ${EXTRA_INVESTIGATION_DESCRIPTION}`
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
          {back.extraInvestigationOnReveal ? (
            <Box
              aria-label={EXTRA_INVESTIGATION_LABEL}
              sx={{
                position: 'absolute',
                top: 5,
                right: 5,
                zIndex: 2,
                px: 0.45,
                py: 0.1,
                borderRadius: 999,
                backgroundColor: '#0ea5e9',
                color: '#f8fbff',
                fontSize: 10,
                fontWeight: 950,
                lineHeight: 1.35,
                boxShadow: '0 2px 8px rgba(0,0,0,0.34)',
              }}
            >
              공개+1
            </Box>
          ) : null}
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

const PlayerHeldCardBackStack = ({
  backs,
  publicCount,
  isHighlighted,
}: {
  backs: MurderMysteryInvestigationBackCardView[];
  publicCount: number;
  isHighlighted: boolean;
}) => {
  if (backs.length === 0 && publicCount === 0) {
    return null;
  }

  const visibleBacks = backs.slice(0, 3);
  const remainingCount = Math.max(backs.length - visibleBacks.length, 0);
  const stackWidth = 23 + Math.max(visibleBacks.length - 1, 0) * 8;
  const backSummary =
    backs.length > 0
      ? backs
          .map((back) => back.shortLabel ?? back.targetLabel ?? CARD_BACK_LABEL)
          .join(', ')
      : '';

  return (
    <Stack
      direction="row"
      spacing={0.35}
      alignItems="center"
      sx={{ mt: 0.15, minHeight: 19 }}
    >
      {visibleBacks.length > 0 ? (
        <Tooltip
          title={`비공개 뒷면 ${backs.length}장${backSummary ? `: ${backSummary}` : ''}`}
        >
          <Box
            aria-label={`비공개 뒷면 카드 ${backs.length}장`}
            sx={{
              position: 'relative',
              width: stackWidth,
              height: 20,
              flex: '0 0 auto',
            }}
          >
            {visibleBacks.map((back, index) => (
              <Box
                key={back.backId}
                sx={{
                  position: 'absolute',
                  left: index * 8,
                  top: index % 2 === 0 ? 0 : 1,
                  width: 20,
                  height: 20,
                  borderRadius: 0.8,
                  overflow: 'hidden',
                  border: isHighlighted
                    ? '1px solid rgba(245, 197, 66, 0.96)'
                    : '1px solid rgba(232, 220, 194, 0.76)',
                  background:
                    'repeating-linear-gradient(135deg, #29323f 0, #29323f 5px, #1d2430 5px, #1d2430 10px)',
                  boxShadow: '0 5px 10px rgba(0,0,0,0.28)',
                  transform: `rotate(${[-5, 2, 6][index]}deg)`,
                }}
              >
                {back.imageSrc ? (
                  <Box
                    component="img"
                    src={back.imageSrc}
                    alt=""
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: 0.86,
                    }}
                  />
                ) : null}
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    px: 0.25,
                    color: '#fff8e6',
                    backgroundColor: back.imageSrc
                      ? 'rgba(5, 9, 14, 0.42)'
                      : 'transparent',
                    textShadow: '0 1px 3px rgba(0,0,0,0.72)',
                  }}
                >
                  <Typography
                    component="span"
                    fontWeight={950}
                    sx={{
                      maxWidth: '100%',
                      fontSize: 7,
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {back.shortLabel ?? CARD_BACK_LABEL}
                  </Typography>
                </Stack>
              </Box>
            ))}
            {remainingCount > 0 ? (
              <Box
                sx={{
                  position: 'absolute',
                  right: -8,
                  bottom: -4,
                  minWidth: 17,
                  height: 17,
                  px: 0.35,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: isHighlighted ? '#f5c542' : '#111827',
                  color: isHighlighted ? '#2a231a' : '#fff',
                  border: '1px solid rgba(255,255,255,0.78)',
                  fontSize: 9,
                  fontWeight: 950,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                }}
              >
                +{remainingCount}
              </Box>
            ) : null}
          </Box>
        </Tooltip>
      ) : null}
      {publicCount > 0 ? (
        <Chip
          size="small"
          icon={<IosShareIcon />}
          label={publicCount}
          sx={{
            height: 18,
            minWidth: 30,
            backgroundColor: 'rgba(236, 253, 245, 0.96)',
            color: '#166534',
            fontWeight: 950,
            '& .MuiChip-icon': {
              width: 11,
              height: 11,
              ml: 0.45,
              color: '#166534',
            },
            '& .MuiChip-label': { px: 0.5, fontSize: 10 },
          }}
        />
      ) : null}
    </Stack>
  );
};

const PlayerMarkerButton = ({
  player,
  isSelf,
  isClueTakeHighlighted,
  turnOrderMarker,
  onSelect,
}: {
  player: MurderMysteryPublicPlayerView;
  isSelf: boolean;
  isClueTakeHighlighted: boolean;
  turnOrderMarker?: TurnOrderMarker;
  onSelect: (playerId: string) => void;
}) => {
  const publicBackIds = new Set(
    player.publicRevealedClues
      .map((card) => card.backId)
      .filter(Boolean) as string[]
  );
  const privateCardBacks = player.heldCardBacks.filter(
    (back) => !publicBackIds.has(back.backId)
  );
  const displayLabel = formatParticipantLabel(player);
  const connectionLabel = player.socketId ? '연결됨' : '미접속';

  return (
    <Tooltip
      title={`${displayLabel} · ${connectionLabel} · 공개 ${player.publicRevealedClues.length}장 · 비공개 ${privateCardBacks.length}장`}
    >
      <Box
        component="button"
        type="button"
        aria-label={`${displayLabel} 플레이어 단서 열기`}
        onClick={() => onSelect(player.id)}
        sx={{
          position: 'relative',
          width: { xs: 132, md: 148 },
          minWidth: { xs: 132, md: 148 },
          height: { xs: 50, md: 54 },
          display: 'flex',
          alignItems: 'center',
          gap: 0.65,
          px: 0.65,
          py: 0.45,
          borderRadius: 999,
          border: isSelf
            ? '2px solid rgba(245, 197, 66, 0.98)'
            : isClueTakeHighlighted
              ? '2px solid rgba(142, 202, 230, 0.98)'
              : '1px solid rgba(255,255,255,0.28)',
          background: isSelf
            ? 'linear-gradient(180deg, rgba(255,249,229,0.98), rgba(225,210,169,0.98))'
            : 'linear-gradient(180deg, rgba(247,243,231,0.98), rgba(224,214,190,0.96))',
          color: '#2a231a',
          boxShadow: isClueTakeHighlighted
            ? '0 0 0 4px rgba(142,202,230,0.18), 0 8px 20px rgba(0,0,0,0.3)'
            : '0 6px 16px rgba(0,0,0,0.24)',
          cursor: 'pointer',
          userSelect: 'none',
          font: 'inherit',
          textAlign: 'left',
          transition:
            'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow:
              '0 0 0 3px rgba(245,197,66,0.13), 0 10px 24px rgba(0,0,0,0.32)',
          },
          '&:focus-visible': {
            outline: '2px solid rgba(245,197,66,0.98)',
            outlineOffset: 2,
          },
        }}
      >
        <Box sx={{ position: 'relative', flex: '0 0 auto' }}>
          <CharacterPortraitFrame
            src={player.rolePortraitSrc ?? undefined}
            alt={player.rolePortraitAlt ?? undefined}
            label={player.roleDisplayName ?? player.name}
            variant="thumbnail"
            sx={{
              width: { xs: 35, md: 38 },
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            }}
          />
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              right: -2,
              bottom: 1,
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: player.socketId ? '#2e7d32' : '#9e9e9e',
              border: '1px solid rgba(255,255,255,0.92)',
              boxShadow: player.socketId
                ? '0 0 0 3px rgba(46,125,50,0.18)'
                : 'none',
            }}
          />
          {turnOrderMarker ? (
            <Box
              aria-label={
                turnOrderMarker.isCurrent
                  ? '지금 조사 차례'
                  : `${turnOrderMarker.rank}번째 조사 차례`
              }
              sx={{
                position: 'absolute',
                top: -6,
                right: -8,
                width: 20,
                height: 20,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid rgba(255,255,255,0.92)',
                backgroundColor: turnOrderMarker.isCurrent
                  ? '#f5c542'
                  : '#2563eb',
                color: turnOrderMarker.isCurrent ? '#241706' : '#fff',
                boxShadow: '0 5px 12px rgba(0,0,0,0.28)',
                fontSize: 10,
                fontWeight: 950,
              }}
            >
              {turnOrderMarker.rank}
            </Box>
          ) : null}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            component="span"
            fontWeight={950}
            sx={{
              display: 'block',
              lineHeight: 1.08,
              fontSize: { xs: 11.5, md: 12.5 },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {player.roleDisplayName ?? player.name}
          </Typography>
          <Stack direction="row" spacing={0.45} alignItems="center">
            <Typography
              component="span"
              sx={{
                minWidth: 0,
                color: '#6f5635',
                fontSize: 10.5,
                fontWeight: 850,
                lineHeight: 1.12,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {isSelf ? '나' : player.name}
            </Typography>
            {isClueTakeHighlighted ? (
              <Box
                component="span"
                sx={{
                  px: 0.4,
                  borderRadius: 999,
                  backgroundColor: '#dff6ff',
                  color: '#075985',
                  fontSize: 8.5,
                  fontWeight: 950,
                  lineHeight: 1.45,
                }}
              >
                NEW
              </Box>
            ) : null}
          </Stack>
          <PlayerHeldCardBackStack
            backs={privateCardBacks}
            publicCount={player.publicRevealedClues.length}
            isHighlighted={isClueTakeHighlighted}
          />
        </Box>
      </Box>
    </Tooltip>
  );
};

const RoleSelectionMarkerRail = ({
  players,
  sessionId,
  connectedPlayerCount,
  requiredPlayerCount,
}: {
  players: MurderMysteryStateSnapshot['roleSelection']['players'];
  sessionId: string;
  connectedPlayerCount: number;
  requiredPlayerCount: number;
}) => {
  const submittedCount = players.filter((player) => player.submitted).length;

  return (
    <Box
      aria-label="캐릭터 선호 제출 현황"
      sx={{
        position: 'relative',
        zIndex: 2,
        px: { xs: 0.8, md: 1.4 },
        py: { xs: 0.55, md: 0.65 },
        borderBottom: '1px solid rgba(255,255,255,0.13)',
        backgroundColor: 'rgba(9, 18, 19, 0.94)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{
          minHeight: { xs: 50, md: 54 },
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(248,241,222,0.28)',
            borderRadius: 999,
          },
        }}
      >
        <Chip
          size="small"
          label={`${requiredPlayerCount}인 게임 · 접속 ${connectedPlayerCount}/${requiredPlayerCount}`}
          color={
            connectedPlayerCount >= requiredPlayerCount ? 'success' : 'default'
          }
          sx={{
            flex: '0 0 auto',
            height: 28,
            fontWeight: 900,
            backgroundColor:
              connectedPlayerCount >= requiredPlayerCount
                ? undefined
                : 'rgba(255,255,255,0.1)',
            color:
              connectedPlayerCount >= requiredPlayerCount
                ? undefined
                : '#f8f1de',
          }}
        />
        <Box
          sx={{
            width: 1,
            height: 28,
            backgroundColor: 'rgba(255,255,255,0.16)',
            flex: '0 0 auto',
          }}
        />
        {players.map((player) => {
          const isSelf = player.playerId === sessionId;
          const submitted = player.submitted;

          return (
            <Tooltip
              key={player.playerId}
              title={`${player.playerName} · ${submitted ? '선호 제출 완료' : '선호 대기'}`}
            >
              <Box
                aria-label={`${player.playerName} ${submitted ? '선호 제출 완료' : '선호 대기'}`}
                sx={{
                  position: 'relative',
                  width: { xs: 42, md: 46 },
                  minWidth: { xs: 42, md: 46 },
                  height: { xs: 42, md: 46 },
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  border: isSelf
                    ? '2px solid rgba(245, 197, 66, 0.98)'
                    : submitted
                      ? '2px solid rgba(74, 222, 128, 0.9)'
                      : '1px solid rgba(255,255,255,0.28)',
                  background: submitted
                    ? 'linear-gradient(180deg, #2e7d32, #14532d)'
                    : 'linear-gradient(180deg, rgba(71, 85, 105, 0.92), rgba(30, 41, 59, 0.92))',
                  color: submitted ? '#f5fff8' : '#e8dec4',
                  boxShadow: submitted
                    ? '0 0 0 3px rgba(46,125,50,0.18), 0 8px 18px rgba(0,0,0,0.26)'
                    : '0 6px 14px rgba(0,0,0,0.24)',
                  fontSize: { xs: 16, md: 17 },
                  fontWeight: 950,
                  flex: '0 0 auto',
                }}
              >
                {getPlayerInitial(player.playerName)}
              </Box>
            </Tooltip>
          );
        })}
        <Chip
          size="small"
          label={`선호 제출 ${submittedCount}/${requiredPlayerCount}`}
          color={submittedCount >= requiredPlayerCount ? 'success' : 'warning'}
          sx={{ flex: '0 0 auto', height: 28, fontWeight: 900 }}
        />
      </Stack>
    </Box>
  );
};

const PlayerMarkerRail = ({
  players,
  sessionId,
  clueTakeHighlightPlayerId,
  turnOrderMarkers,
  onSelectPlayer,
}: {
  players: MurderMysteryPublicPlayerView[];
  sessionId: string;
  clueTakeHighlightPlayerId: string | null;
  turnOrderMarkers: Record<string, TurnOrderMarker>;
  onSelectPlayer: (playerId: string) => void;
}) => (
  <Box
    aria-label="플레이어 단서 바로가기"
    sx={{
      position: 'relative',
      zIndex: 2,
      px: { xs: 0.8, md: 1.4 },
      py: { xs: 0.55, md: 0.65 },
      borderBottom: '1px solid rgba(255,255,255,0.13)',
      backgroundColor: 'rgba(9, 18, 19, 0.94)',
      boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
    }}
  >
    <Stack
      direction="row"
      spacing={0.7}
      alignItems="center"
      sx={{
        minHeight: { xs: 50, md: 54 },
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(248,241,222,0.28)',
          borderRadius: 999,
        },
      }}
    >
      {players.map((player) => (
        <PlayerMarkerButton
          key={player.id}
          player={player}
          isSelf={player.id === sessionId}
          isClueTakeHighlighted={clueTakeHighlightPlayerId === player.id}
          turnOrderMarker={turnOrderMarkers[player.id]}
          onSelect={onSelectPlayer}
        />
      ))}
    </Stack>
  </Box>
);

const RolePublicCoverCard = ({
  cover,
  currentRank,
  rankCount,
  assignedPlayerName,
  onSetRank,
  onRequestShareRoleSheet,
}: {
  cover: RoleSelectionPublicCover;
  currentRank: number;
  rankCount: number;
  assignedPlayerName?: string;
  onSetRank?: (rankIndex: number) => void;
  onRequestShareRoleSheet?: () => void;
}) => {
  const canRank = Boolean(cover.selectable && onSetRank);
  const canShareRoleSheet = Boolean(
    cover.selectable && onRequestShareRoleSheet
  );
  const shareDisplayName = getRoleShareDisplayName(cover.displayName);

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
              <Stack
                direction="row"
                spacing={0.4}
                alignItems="center"
                sx={{ flex: '0 0 auto' }}
              >
                {canShareRoleSheet ? (
                  <Tooltip title={`${shareDisplayName} 룰지 공유`}>
                    <IconButton
                      size="small"
                      aria-label={`${shareDisplayName} 룰지 공유`}
                      onClick={onRequestShareRoleSheet}
                      sx={{
                        width: 28,
                        height: 28,
                        color: '#fff6db',
                        backgroundColor: 'rgba(255, 167, 38, 0.18)',
                        border: '1px solid rgba(255, 183, 77, 0.42)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 167, 38, 0.3)',
                        },
                      }}
                    >
                      <IosShareIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                ) : null}
                {assignedPlayerName ? (
                  <Chip size="small" label={assignedPlayerName} />
                ) : canRank ? (
                  <Chip
                    size="small"
                    label={
                      currentRank >= 0 ? `${currentRank + 1}순위` : '미선택'
                    }
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
  hasSubmittedRolePreferences,
  canSubmitRolePreferences,
  onSetRoleRank,
  onSubmitRolePreferences,
  onClearRolePreferences,
  canShareRoleSheets = false,
  onShareRoleSheet,
}: {
  roleSelection: MurderMysteryStateSnapshot['roleSelection'];
  draftRolePreferenceIds: string[];
  hasSubmittedRolePreferences: boolean;
  canSubmitRolePreferences: boolean;
  onSetRoleRank: (roleId: string, rankIndex: number) => void;
  onSubmitRolePreferences: (roleIds: string[]) => void;
  onClearRolePreferences: () => void;
  canShareRoleSheets?: boolean;
  onShareRoleSheet: (roleId: string) => void;
}) => {
  const [shareConfirmCover, setShareConfirmCover] =
    useState<RoleSelectionPublicCover | null>(null);
  const roleById = new Map(roleSelection.roles.map((role) => [role.id, role]));
  const orderedRoles = draftRolePreferenceIds
    .map((roleId) => roleById.get(roleId))
    .filter(Boolean) as MurderMysteryStateSnapshot['roleSelection']['roles'];
  const rolePreferenceSummary =
    orderedRoles.length > 0
      ? orderedRoles
          .map(
            (role, index) =>
              `${index + 1}순위 ${getRolePreferenceShortName(role.displayName)}`
          )
          .join(' ')
      : '아직 선택 전';
  const assignedPlayerNameById = new Map(
    roleSelection.players.map((player) => [player.playerId, player.playerName])
  );
  const shareConfirmDisplayName = shareConfirmCover
    ? getRoleShareDisplayName(shareConfirmCover.displayName)
    : '';

  const closeShareConfirm = () => setShareConfirmCover(null);
  const confirmShareRoleSheet = () => {
    if (shareConfirmCover) {
      onShareRoleSheet(shareConfirmCover.id);
    }
  };

  return (
    <>
      <Box
        sx={{
          p: { xs: 1.2, sm: 1.5 },
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <Stack spacing={1.3}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={950}>캐릭터 선택</Typography>
              <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
                공개 표지만 보고 동시에 선호를 제출합니다. 순위는 본인에게만
                보입니다.
              </Typography>
            </Box>
            {roleSelection.status === 'locked' ? (
              <Chip
                color="success"
                label="배정 완료"
                sx={{ flex: '0 0 auto', fontWeight: 900 }}
              />
            ) : (
              <Stack direction="row" spacing={0.6} sx={{ flex: '0 0 auto' }}>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  disabled={!canSubmitRolePreferences}
                  onClick={() =>
                    onSubmitRolePreferences(draftRolePreferenceIds)
                  }
                  sx={{ minWidth: 68, fontWeight: 900 }}
                >
                  {hasSubmittedRolePreferences ? '다시 제출' : '제출'}
                </Button>
                {hasSubmittedRolePreferences ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={onClearRolePreferences}
                    sx={{ minWidth: 54, fontWeight: 900 }}
                  >
                    취소
                  </Button>
                ) : null}
              </Stack>
            )}
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
                  onRequestShareRoleSheet={
                    canShareRoleSheets
                      ? () => setShareConfirmCover(cover)
                      : undefined
                  }
                />
              ))}
            </Stack>
          ) : (
            <>
              <Box
                sx={{
                  px: 1,
                  py: 0.7,
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(0,0,0,0.18)',
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.8}
                  alignItems="center"
                  sx={{ minWidth: 0 }}
                >
                  <Typography
                    variant="caption"
                    sx={{ flex: '0 0 auto', color: '#cfc5ad' }}
                  >
                    내 선호 순위
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      minWidth: 0,
                      color: '#fff6db',
                      fontWeight: 900,
                    }}
                  >
                    {rolePreferenceSummary}
                  </Typography>
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
                    onRequestShareRoleSheet={
                      canShareRoleSheets
                        ? () => setShareConfirmCover(cover)
                        : undefined
                    }
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </Box>

      <Dialog
        open={Boolean(shareConfirmCover)}
        onClose={closeShareConfirm}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            overflow: 'hidden',
            borderRadius: 2,
            color: '#f8f1de',
            background:
              'linear-gradient(145deg, #13211f 0%, #24352f 52%, #14191d 100%)',
            border: '1px solid rgba(248,241,222,0.18)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.52)',
          },
        }}
      >
        <DialogTitle sx={{ px: 2.2, pt: 2, pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: '#2a1d0d',
                backgroundColor: '#ffb547',
              }}
            >
              <IosShareIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={950} sx={{ lineHeight: 1.25 }}>
                룰지 공유 확인
              </Typography>
              <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
                미접속 참가자에게 보낼 캐릭터 룰지를 확인하세요.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: 2.2, pb: 1 }}>
          {shareConfirmCover ? (
            <Stack spacing={1.2}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(248,241,222,0.1)',
                  border: '1px solid rgba(248,241,222,0.16)',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <CharacterPortraitFrame
                    src={shareConfirmCover.portraitSrc}
                    alt={shareConfirmCover.portraitAlt}
                    label={shareConfirmCover.displayName}
                    variant="thumbnail"
                    sx={{ width: 54 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={950}>
                      {shareConfirmDisplayName}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: '-webkit-box',
                        color: '#d8d0bd',
                        overflow: 'hidden',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.45,
                      }}
                    >
                      {shareConfirmCover.publicText}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Typography sx={{ lineHeight: 1.7, wordBreak: 'keep-all' }}>
                {shareConfirmDisplayName}의 룰지를 미접속 인원에게 미리
                공유하시겠습니까?
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: '#cfc5ad', lineHeight: 1.6 }}
              >
                공유 링크에는 프롤로그, 캐릭터 룰지, 기본 규칙이 포함됩니다.
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2.2, pb: 2, gap: 0.8 }}>
          <Button onClick={closeShareConfirm} sx={{ color: '#e8dec4' }}>
            취소
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<IosShareIcon />}
            disabled={!shareConfirmCover}
            onClick={confirmShareRoleSheet}
            sx={{ fontWeight: 900 }}
          >
            공유하기
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

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
  selfPrivateCards,
  onClose,
  onOpenRulebook,
  onOpenPrivateCards,
  onOpenCard,
  onOpenSelfPrivateCard,
}: {
  open: boolean;
  player: MurderMysteryPublicPlayerView | null;
  isSelf: boolean;
  canOpenRulebook: boolean;
  fullScreen: boolean;
  selfPrivateCards: MurderMysteryClueVaultCardView[];
  onClose: () => void;
  onOpenRulebook: () => void;
  onOpenPrivateCards: () => void;
  onOpenCard: (card: AnyClueCard) => void;
  onOpenSelfPrivateCard: (card: AnyClueCard) => void;
}) => {
  const publicBackIds = new Set(
    (player?.publicRevealedClues ?? [])
      .map((card) => card.backId)
      .filter(Boolean) as string[]
  );
  const privateCardBacks =
    player?.heldCardBacks.filter((back) => !publicBackIds.has(back.backId)) ??
    [];
  const visibleSelfPrivateCards = isSelf ? selfPrivateCards : [];
  const publicClueCount = player?.publicRevealedClues.length ?? 0;
  const privateClueCount = isSelf
    ? Math.max(visibleSelfPrivateCards.length, privateCardBacks.length)
    : privateCardBacks.length;

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
            플레이어 단서
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
                <Chip size="small" label={`공개 ${publicClueCount}장`} />
                <Chip size="small" label={`비공개 ${privateClueCount}장`} />
              </Stack>
            </Box>
          </Stack>
          <Stack spacing={1}>
            <Typography fontWeight={900}>
              공개 카드 {publicClueCount}장
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
                아직 이 플레이어에게 공개 카드가 없습니다.
              </Typography>
            )}
          </Stack>
          <Box sx={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />
          <Stack spacing={1}>
            <Typography fontWeight={900}>
              {isSelf ? '내 비공개 카드' : '비공개 카드'} {privateClueCount}장
            </Typography>
            {visibleSelfPrivateCards.length ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 112px))',
                  gap: 1,
                  alignItems: 'start',
                }}
              >
                {visibleSelfPrivateCards.map((card) => (
                  <EvidenceCardFace
                    key={`self:private:${card.id}`}
                    card={card}
                    dense
                    onOpen={onOpenSelfPrivateCard}
                  />
                ))}
              </Box>
            ) : privateCardBacks.length ? (
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
                아직 이 플레이어에게 비공개 카드가 없습니다.
              </Typography>
            )}
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

const getEvidenceSourceLabel = (
  sourceType: EndbookEvidenceReference['sourceType']
) => {
  if (sourceType === 'investigation_card') {
    return '조사 카드';
  }
  if (sourceType === 'role_sheet') {
    return '룰지';
  }
  return '지문';
};

const getEvidenceDetailLabel = (
  sourceType: EndbookEvidenceReference['sourceType']
) => {
  if (sourceType === 'investigation_card') {
    return '뒷면 명칭/카드 제목';
  }
  if (sourceType === 'role_sheet') {
    return '룰지 소유자';
  }
  return '지문 단계명';
};

const EndbookEvidenceQnaPanel = ({
  evidenceQna,
  onOpenEvidence,
}: {
  evidenceQna?: MurderMysteryEndbookEvidenceQnaScenario;
  onOpenEvidence: (reference: EndbookEvidenceReference) => void;
}) => {
  if (!evidenceQna || evidenceQna.items.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1.1}>
      <Box>
        <Typography variant="h6" fontWeight={950}>
          {evidenceQna.title ?? '판단근거 Q&A'}
        </Typography>
        {evidenceQna.description ? (
          <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
            {evidenceQna.description}
          </Typography>
        ) : null}
      </Box>

      {evidenceQna.items.map((item) => (
        <Accordion
          key={item.id}
          disableGutters
          sx={{
            color: '#f8f1de',
            backgroundColor: 'rgba(15, 19, 24, 0.78)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: '8px !important',
            boxShadow: 'none',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#f8f1de' }} />}
          >
            <Typography fontWeight={950}>{item.question}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.2}>
              <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72 }}>
                {item.answer}
              </Typography>
              <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
                {item.evidenceRefs.map((reference) => (
                  <Chip
                    key={reference.id}
                    size="small"
                    icon={<ArticleIcon />}
                    label={reference.sourceName}
                    variant="outlined"
                    onClick={() => onOpenEvidence(reference)}
                    sx={{
                      maxWidth: '100%',
                      color: '#f8f1de',
                      borderColor: 'rgba(248,241,222,0.42)',
                      fontWeight: 800,
                      '& .MuiChip-icon': { color: '#dcb66d' },
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
};

const EndbookEvidenceReferenceDialog = ({
  reference,
  fullScreen,
  onClose,
}: {
  reference: EndbookEvidenceReference | null;
  fullScreen: boolean;
  onClose: () => void;
}) => {
  if (!reference) {
    return null;
  }

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#f8f1de',
          color: '#20180f',
          borderRadius: fullScreen ? 0 : 2,
        },
      }}
    >
      <DialogTitle sx={{ pr: 7 }}>
        <Stack spacing={0.6}>
          <Typography variant="caption" fontWeight={900} color="text.secondary">
            {getEvidenceSourceLabel(reference.sourceType)}
          </Typography>
          <Typography variant="h6" fontWeight={950}>
            {reference.sourceName}
          </Typography>
        </Stack>
        <IconButton
          aria-label="닫기"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Box>
            <Typography
              variant="caption"
              fontWeight={900}
              color="text.secondary"
            >
              {getEvidenceDetailLabel(reference.sourceType)}
            </Typography>
            <Typography fontWeight={950}>{reference.label}</Typography>
          </Box>
          <Divider sx={{ borderColor: 'rgba(32,24,15,0.18)' }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={950}>
              원문/발췌
            </Typography>
            <Typography
              sx={{ mt: 0.6, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
            >
              {reference.excerpt}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={950}>
              판단 연결
            </Typography>
            <Typography
              sx={{ mt: 0.6, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
            >
              {reference.inference}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

const CardDetailDialog = ({
  card,
  isPinned = false,
  onClose,
  onTogglePin,
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
}: {
  card: AnyClueCard | null;
  isPinned?: boolean;
  onClose: () => void;
  onTogglePin?: () => void;
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
        <Tooltip title={isPinned ? '단서 핀 해제' : '단서 핀 고정'}>
          <span>
            <IconButton
              disabled={!card}
              aria-label={isPinned ? '단서 핀 해제' : '단서 핀 고정'}
              onClick={onTogglePin}
              sx={{
                position: 'absolute',
                top: 8,
                right: 56,
                zIndex: 4,
                backgroundColor: isPinned
                  ? 'rgba(245, 158, 11, 0.92)'
                  : 'rgba(0,0,0,0.46)',
                color: isPinned ? '#241706' : '#fff',
                '&:hover': {
                  backgroundColor: isPinned
                    ? 'rgba(245, 158, 11, 1)'
                    : 'rgba(0,0,0,0.62)',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(0,0,0,0.28)',
                  color: 'rgba(255,255,255,0.42)',
                },
              }}
            >
              <PushPinIcon />
            </IconButton>
          </span>
        </Tooltip>
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
  pins = [],
  fullScreen,
  onSelectPin,
  onClose,
}: {
  open: boolean;
  scene: MurderMysteryInvestigationMapSceneScenario | null;
  pins?: InvestigationMapTargetPin[];
  fullScreen: boolean;
  onSelectPin?: (targetId: string) => void;
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
  const pinRadius = scene ? Math.max(scene.width, scene.height) * 0.018 : 0;

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
  const phaseScrollRef = useRef<HTMLDivElement | null>(null);
  const investigationTargetTileRefs = useRef<
    Record<string, HTMLElement | null>
  >({});
  const previousHeldBackIdsByPlayerRef = useRef<Record<
    string,
    Set<string>
  > | null>(null);
  const modalHistoryDepthRef = useRef(0);
  const openModalCountRef = useRef(0);
  const suppressModalPopCountRef = useRef(0);
  const previousPhaseRef = useRef(snapshot.phase);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [isPublicScriptsOpen, setIsPublicScriptsOpen] = useState(false);
  const [isPrivateCardsOpen, setIsPrivateCardsOpen] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [cardViewer, setCardViewer] = useState<CardViewerState | null>(null);
  const [selectedEvidenceRef, setSelectedEvidenceRef] =
    useState<EndbookEvidenceReference | null>(null);
  const [pinnedClue, setPinnedClue] = useState<PinnedClueReference | null>(
    null
  );
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
  const pinnedClueCards = pinnedClue
    ? (cardViewerSources[pinnedClue.sourceId] ?? [])
    : [];
  const pinnedCard =
    pinnedClueCards.find((card) => card.id === pinnedClue?.cardId) ?? null;
  const isSelectedCardPinned = Boolean(
    selectedCard &&
      pinnedClue &&
      cardViewer &&
      pinnedClue.sourceId === cardViewer.sourceId &&
      pinnedClue.cardId === selectedCard.id
  );

  const currentStep =
    snapshot.phase === 'LOBBY'
      ? null
      : (snapshot.scenario.flow.steps.find(
          (step) => step.id === snapshot.phase
        ) ?? null);
  const phaseKind: PhaseKind =
    snapshot.phase === 'LOBBY' ? 'lobby' : (currentStep?.kind ?? 'lobby');
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
  const scenarioTitle = useMemo(
    () => splitScenarioTitle(snapshot.scenario.title),
    [snapshot.scenario.title]
  );
  const activeRound = snapshot.investigation.round;
  const activeRoundView =
    snapshot.investigation.rounds.find(
      (round) => round.round === activeRound
    ) ?? null;
  const mapTargetPins = useMemo(
    () =>
      buildInvestigationMapTargetPins(
        activeRoundView?.targets,
        snapshot.investigation.map?.hotspots
      ),
    [activeRoundView?.targets, snapshot.investigation.map?.hotspots]
  );
  const canActNow = Boolean(snapshot.investigation.turn?.canActNow);
  const isMapInvestigationPhase =
    phaseKind === 'investigate' &&
    Boolean(snapshot.investigation.map?.scene && activeRoundView);
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
  const requiredPlayerCount =
    snapshot.roleSelection.requiredPlayerCount ||
    snapshot.hostParticipation.requiredPlayerCount;
  const connectedPlayerCount = Math.min(
    snapshot.players.filter((player) => Boolean(player.socketId)).length,
    requiredPlayerCount
  );
  const isRoleSelectionLocked = snapshot.roleSelection.status === 'locked';
  const shouldShowRoleSelectionMarkerRail =
    phaseKind === 'lobby' && !isRoleSelectionLocked;
  const shouldShowPlayerMarkerRail = isRoleSelectionLocked;
  const shouldShowMarkerRail =
    shouldShowRoleSelectionMarkerRail || shouldShowPlayerMarkerRail;
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
    Number(Boolean(selectedEvidenceRef)) +
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
    setSelectedEvidenceRef(null);
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
  const toggleSelectedCardPin = useCallback(() => {
    if (!cardViewer || !selectedCard) {
      return;
    }

    setPinnedClue((current) =>
      current?.sourceId === cardViewer.sourceId &&
      current.cardId === selectedCard.id
        ? null
        : {
            sourceId: cardViewer.sourceId,
            cardId: selectedCard.id,
          }
    );
  }, [cardViewer, selectedCard]);
  const openPinnedClue = useCallback(() => {
    if (!pinnedClue || !pinnedCard || pinnedClueCards.length === 0) {
      return;
    }
    openCardViewer(pinnedClue.sourceId, pinnedClueCards, pinnedCard);
  }, [openCardViewer, pinnedCard, pinnedClue, pinnedClueCards]);
  const setInvestigationTargetTileRef = useCallback(
    (targetId: string, element: HTMLElement | null) => {
      if (element) {
        investigationTargetTileRefs.current[targetId] = element;
        return;
      }
      delete investigationTargetTileRefs.current[targetId];
    },
    []
  );
  const selectInvestigationMapTarget = useCallback((targetId: string) => {
    setIsMapDialogOpen(false);
    window.setTimeout(() => {
      investigationTargetTileRefs.current[targetId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
  }, []);
  const closeTopModalFromHistory = useCallback(() => {
    if (pendingSpecialEventAction) {
      setPendingSpecialEventAction(null);
      return;
    }
    if (selectedEvidenceRef) {
      setSelectedEvidenceRef(null);
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
    selectedEvidenceRef,
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
    if (!pinnedClue) {
      return;
    }
    const nextCards = cardViewerSources[pinnedClue.sourceId] ?? [];
    if (!nextCards.some((card) => card.id === pinnedClue.cardId)) {
      setPinnedClue(null);
    }
  }, [cardViewerSources, pinnedClue]);

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
    const mapView = snapshot.investigation.map;
    const mapMatTargets = mapTargetPins;
    const mappedTargetIds = new Set(
      mapMatTargets.map((entry) => entry.target.id)
    );
    const matNumberByTargetId = new Map(
      mapMatTargets.map((entry) => [entry.target.id, entry.matNumber] as const)
    );
    const cardMatGroups = activeRoundView
      ? buildInvestigationCardMatGroups(
          activeRoundView.targets,
          mappedTargetIds,
          matNumberByTargetId
        )
      : [];
    const canUseMapBoard = Boolean(mapView?.scene && activeRoundView);
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
    const getTargetChoiceState = (
      target: MurderMysteryInvestigationTargetView
    ) => {
      const isTurnClosed =
        !snapshot.investigation.turn?.currentPlayerId ||
        Boolean(snapshot.investigation.turn?.allPlayersDone);
      const disabled =
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

      return { disabled, disabledReason };
    };
    const renderInvestigationCardMatTarget = ({
      matNumber,
      target,
    }: {
      matNumber?: number;
      target: MurderMysteryInvestigationTargetView;
    }) => {
      const { disabled, disabledReason } = getTargetChoiceState(target);
      const isOwnedInvestigationBlocked =
        target.isOwnedByViewer &&
        !target.canInvestigateByViewer &&
        !target.isOwnedFallbackForViewer;
      const targetDisabled =
        disabled ||
        isOwnedInvestigationBlocked ||
        target.isExhausted ||
        target.availableBacks.length === 0;
      const targetDisabledReason = isOwnedInvestigationBlocked
        ? '내 소지품은 내 차례에도 조사할 수 없습니다.'
        : target.availableBacks.length === 0
          ? '남은 뒷면 카드가 없습니다.'
          : disabledReason;
      const hasMultipleBacks = target.availableBacks.length > 1;
      const firstBack = target.availableBacks[0] ?? null;
      const hasExtraInvestigationBack = target.availableBacks.some(
        (back) => back.extraInvestigationOnReveal
      );
      const isReserved = target.availableBacks.some(
        (back) =>
          back.isReservedByMe || pendingReservationBackId === back.backId
      );
      const tileLabel = hasMultipleBacks
        ? target.label
        : (firstBack?.shortLabel ??
          target.cardBack?.shortLabel ??
          target.label);
      const handleBackChoice = (
        back: MurderMysteryInvestigationBackCardView
      ) => {
        if (targetDisabled) {
          return;
        }
        if (back.isReservedByMe || pendingReservationBackId === back.backId) {
          onClearReservation();
          return;
        }
        if (canActNow) {
          onSubmitInvestigationByBack(back.backId);
          return;
        }
        onSetReservation(back.backId);
      };
      const statusIcon = target.isExhausted ? (
        <Typography
          variant="caption"
          fontWeight={950}
          sx={{ color: '#cbd5e1', lineHeight: 1 }}
        >
          완료
        </Typography>
      ) : isOwnedInvestigationBlocked ? (
        <LockIcon sx={{ width: 15, height: 15, color: '#64748b' }} />
      ) : targetDisabled ? (
        <LockIcon sx={{ width: 15, height: 15, color: '#cbd5e1' }} />
      ) : isReserved ? (
        <PushPinIcon sx={{ width: 15, height: 15, color: '#f5c542' }} />
      ) : null;
      const compactTileSx = {
        width: '100%',
        minHeight: hasMultipleBacks ? 66 : 48,
        p: 0.65,
        borderRadius: 1.4,
        border: '1px solid',
        borderColor: target.isExhausted
          ? 'rgba(148,163,184,0.28)'
          : isOwnedInvestigationBlocked
            ? 'rgba(148,163,184,0.28)'
            : isReserved
              ? 'rgba(245,197,66,0.82)'
              : 'rgba(142,202,230,0.34)',
        borderStyle: isOwnedInvestigationBlocked ? 'dashed' : 'solid',
        backgroundColor: target.isExhausted
          ? 'rgba(15,23,42,0.5)'
          : isOwnedInvestigationBlocked
            ? 'rgba(15,23,42,0.38)'
            : 'rgba(255,255,255,0.075)',
        color: isOwnedInvestigationBlocked ? '#94a3b8' : '#f8f1de',
        boxShadow: isOwnedInvestigationBlocked
          ? 'none'
          : isReserved
            ? '0 0 0 1px rgba(245,197,66,0.26), 0 8px 18px rgba(0,0,0,0.26)'
            : '0 8px 18px rgba(0,0,0,0.22)',
        opacity: isOwnedInvestigationBlocked ? 0.72 : targetDisabled ? 0.6 : 1,
      };
      const tileBody = (
        <Stack spacing={0.45} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.55} alignItems="center">
            {matNumber ? (
              <Box
                sx={{
                  width: 22,
                  minWidth: 22,
                  height: 22,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: '#f5c542',
                  color: '#2b2112',
                  fontWeight: 950,
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                {matNumber}
              </Box>
            ) : null}
            <Typography
              fontWeight={950}
              sx={{
                minWidth: 0,
                flex: 1,
                fontSize: 12.5,
                lineHeight: 1.16,
                wordBreak: 'keep-all',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
              {tileLabel}
            </Typography>
            <Stack
              direction="row"
              spacing={0.35}
              alignItems="center"
              sx={{ flex: '0 0 auto', minWidth: 0 }}
            >
              {target.repeatable ? (
                <Tooltip title="해당 단서는 반복조사 가능합니다.">
                  <Typography
                    aria-label="해당 단서는 반복조사 가능합니다."
                    fontWeight={950}
                    sx={{ color: '#8ecae6', fontSize: 17, lineHeight: 1 }}
                  >
                    ∞
                  </Typography>
                </Tooltip>
              ) : null}
              {hasExtraInvestigationBack ? (
                <Tooltip title={EXTRA_INVESTIGATION_DESCRIPTION}>
                  <Chip
                    size="small"
                    aria-label={EXTRA_INVESTIGATION_LABEL}
                    label="공개+1"
                    sx={{
                      height: 18,
                      backgroundColor: 'rgba(14,165,233,0.18)',
                      color: '#7dd3fc',
                      fontSize: 10,
                      fontWeight: 950,
                      '& .MuiChip-label': { px: 0.55 },
                    }}
                  />
                </Tooltip>
              ) : null}
              {isOwnedInvestigationBlocked ? (
                <Chip
                  size="small"
                  label="조사 불가"
                  sx={{
                    height: 18,
                    backgroundColor: 'rgba(148,163,184,0.16)',
                    color: '#cbd5e1',
                    fontSize: 10,
                    fontWeight: 900,
                    '& .MuiChip-label': { px: 0.6 },
                  }}
                />
              ) : null}
              {statusIcon}
            </Stack>
          </Stack>

          {isOwnedInvestigationBlocked ? (
            <Typography
              variant="caption"
              fontWeight={900}
              sx={{ color: '#94a3b8', fontSize: 10.5, lineHeight: 1 }}
            >
              내 소지품 · 조사 불가
            </Typography>
          ) : hasMultipleBacks ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 0.35,
              }}
            >
              {target.availableBacks.map((back) => {
                const isBackReserved =
                  back.isReservedByMe ||
                  pendingReservationBackId === back.backId;
                return (
                  <Tooltip
                    key={back.backId}
                    title={
                      targetDisabled
                        ? (targetDisabledReason ?? '지금은 선택할 수 없습니다.')
                        : isBackReserved
                          ? '예약 해제'
                          : canActNow
                            ? '가져가기'
                            : '예약하기'
                    }
                  >
                    <Box
                      component="button"
                      type="button"
                      disabled={targetDisabled}
                      onClick={() => handleBackChoice(back)}
                      sx={{
                        minWidth: 0,
                        height: 23,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: isBackReserved
                          ? 'rgba(245,197,66,0.92)'
                          : 'rgba(255,255,255,0.16)',
                        backgroundColor: isBackReserved
                          ? 'rgba(245,197,66,0.18)'
                          : 'rgba(8,13,18,0.42)',
                        color: '#f8f1de',
                        cursor: targetDisabled ? 'not-allowed' : 'pointer',
                        fontSize: 10.5,
                        fontWeight: 900,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        px: 0.55,
                      }}
                    >
                      {isBackReserved
                        ? '내 예약'
                        : (back.shortLabel ?? CARD_BACK_LABEL)}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          ) : null}
        </Stack>
      );

      if (!hasMultipleBacks && firstBack) {
        const isBackReserved =
          firstBack.isReservedByMe ||
          pendingReservationBackId === firstBack.backId;

        return (
          <Tooltip
            key={target.id}
            title={
              targetDisabled
                ? (targetDisabledReason ?? '지금은 선택할 수 없습니다.')
                : isBackReserved
                  ? '예약 해제'
                  : canActNow
                    ? '가져가기'
                    : '예약하기'
            }
          >
            <Box
              component="button"
              type="button"
              ref={(element: HTMLButtonElement | null) =>
                setInvestigationTargetTileRef(target.id, element)
              }
              disabled={targetDisabled}
              onClick={() => handleBackChoice(firstBack)}
              sx={{
                ...compactTileSx,
                borderWidth: isBackReserved ? 2 : 1,
                textAlign: 'left',
                cursor: targetDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {tileBody}
            </Box>
          </Tooltip>
        );
      }

      return (
        <Box
          key={target.id}
          ref={(element: HTMLDivElement | null) =>
            setInvestigationTargetTileRef(target.id, element)
          }
          sx={compactTileSx}
        >
          {tileBody}
        </Box>
      );
    };

    return (
      <Stack spacing={{ xs: 0.95, md: 1.6 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 0.75, md: 1.4 }}
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

        {mapView?.scene && activeRoundView ? (
          <Stack spacing={{ xs: 0.75, md: 1.1 }}>
            <Box
              sx={{
                display: { xs: 'none', md: 'block' },
                position: 'relative',
                p: 0.7,
                borderRadius: 2.2,
                border: '1px solid rgba(255,255,255,0.18)',
                background:
                  'radial-gradient(circle at 50% 0%, rgba(245,197,66,0.12), transparent 38%), #0b1117',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: `${mapView.scene.width} / ${mapView.scene.height}`,
                  overflow: 'hidden',
                  borderRadius: 1.5,
                  backgroundColor: '#0b1117',
                }}
              >
                <Box
                  component="img"
                  src={mapView.scene.imageSrc}
                  alt={mapView.scene.alt}
                  draggable={false}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    userSelect: 'none',
                  }}
                />

                <Tooltip title="맵 크게 보기">
                  <IconButton
                    aria-label="맵 크게 보기"
                    size="small"
                    onClick={() => setIsMapDialogOpen(true)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 5,
                      backgroundColor: 'rgba(8,13,18,0.7)',
                      color: '#f8f1de',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        backgroundColor: 'rgba(8,13,18,0.9)',
                      },
                    }}
                  >
                    <MapIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {mapMatTargets.map(({ hotspot, matNumber, target }) => (
                  <Box
                    key={hotspot.id}
                    aria-hidden="true"
                    sx={{
                      position: 'absolute',
                      left: `calc(${
                        hotspot.xPct + hotspot.widthPct / 2
                      }% - 12px)`,
                      top: `calc(${
                        hotspot.yPct + hotspot.heightPct / 2
                      }% - 12px)`,
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      display: 'grid',
                      placeItems: 'center',
                      border: '2px solid rgba(255,248,230,0.9)',
                      backgroundColor: target.isExhausted
                        ? 'rgba(71,85,105,0.92)'
                        : 'rgba(245,197,66,0.96)',
                      color: target.isExhausted ? '#f8f1de' : '#2b2112',
                      fontSize: 12,
                      fontWeight: 950,
                      boxShadow: '0 8px 16px rgba(0,0,0,0.36)',
                    }}
                  >
                    {matNumber}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                p: { xs: 0.65, md: 0.85 },
                borderRadius: { xs: 1.6, md: 2.2 },
                border: '1px solid rgba(245,197,66,0.28)',
                background:
                  'linear-gradient(180deg, rgba(24, 31, 29, 0.96), rgba(8, 13, 15, 0.98))',
                boxShadow: '0 18px 42px rgba(0,0,0,0.3)',
              }}
            >
              <Stack spacing={0.75}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <StyleIcon fontSize="small" />
                  <Typography fontWeight={950} sx={{ flex: 1, minWidth: 120 }}>
                    조사 카드 매트
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.55}
                    alignItems="center"
                    flexWrap="wrap"
                    justifyContent="flex-end"
                  >
                    <Tooltip title="해당 단서는 반복조사 가능합니다.">
                      <Chip
                        size="small"
                        aria-label="해당 단서는 반복조사 가능합니다."
                        label="∞ 반복조사 가능"
                        sx={{
                          backgroundColor: 'rgba(142,202,230,0.16)',
                          color: '#8ecae6',
                          fontWeight: 900,
                        }}
                      />
                    </Tooltip>
                    <Tooltip title={EXTRA_INVESTIGATION_DESCRIPTION}>
                      <Chip
                        size="small"
                        aria-label={EXTRA_INVESTIGATION_LABEL}
                        label={EXTRA_INVESTIGATION_LABEL}
                        sx={{
                          backgroundColor: 'rgba(14,165,233,0.18)',
                          color: '#7dd3fc',
                          fontWeight: 900,
                        }}
                      />
                    </Tooltip>
                    <Chip
                      size="small"
                      label={`${activeRoundView.targets.length}곳`}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        color: '#f8f1de',
                        fontWeight: 900,
                      }}
                    />
                  </Stack>
                </Stack>

                {cardMatGroups.map((group, index) => (
                  <Fragment key={group.id}>
                    {index > 0 ? (
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                    ) : null}
                    <Stack spacing={0.5}>
                      <Typography
                        variant="caption"
                        fontWeight={900}
                        sx={{ color: '#cfc5ad', lineHeight: 1 }}
                      >
                        {group.label}
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: { xs: 0.45, md: 0.55 },
                        }}
                      >
                        {group.targets.map(({ matNumber, target }) =>
                          renderInvestigationCardMatTarget({
                            matNumber,
                            target,
                          })
                        )}
                      </Box>
                    </Stack>
                  </Fragment>
                ))}
              </Stack>
            </Box>
          </Stack>
        ) : null}

        {activeRoundView && !canUseMapBoard ? (
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
        ) : !activeRoundView ? (
          <Typography sx={{ color: '#d8d0bd' }}>
            현재 라운드에 배치된 조사 카드가 없습니다.
          </Typography>
        ) : null}
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
          <Typography sx={{ color: '#d8d0bd', whiteSpace: 'pre-wrap' }}>
            {currentStep?.description ??
              '최종 지목 결과에 따라 열린 선택입니다. 이 선택은 엔딩에 크게 영향을 줍니다.'}
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
    if (phaseKind === 'lobby') {
      return null;
    }

    if (hasOpenModal && !(phaseKind === 'investigate' && canActNow)) {
      return null;
    }

    let title = '';
    let description = '';
    let chips: React.ReactNode = null;
    let actions: React.ReactNode = null;

    if (phaseKind === 'intro') {
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

  const renderEndbookArea = () => {
    const endbook = snapshot.endbook;

    if (!endbook) {
      return (
        <Stack spacing={1.6}>
          <Typography variant="h5" fontWeight={950}>
            엔딩
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72 }}>
            투표 집계 후 엔딩이 표시됩니다.
          </Typography>
        </Stack>
      );
    }

    const endbookText = [endbook.title, endbook.body]
      .filter(Boolean)
      .join('\n\n');

    return (
      <Stack spacing={1.8}>
        <Box>
          <Typography variant="h5" fontWeight={950}>
            엔딩
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72 }}>
            {endbookText}
          </Typography>
        </Box>

        <EndbookEvidenceQnaPanel
          evidenceQna={endbook.evidenceQna}
          onOpenEvidence={setSelectedEvidenceRef}
        />

        {endbook.alternateOutcomes.length > 0 ? (
          <Stack spacing={1.1}>
            <Box>
              <Typography variant="h6" fontWeight={950}>
                다른 선택 엔딩
              </Typography>
              <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
                엔딩 선택지를 다시 확인하고, 다른 선택을 했을 때의 결과를 볼 수
                있습니다.
              </Typography>
            </Box>

            {endbook.choiceSummaries.length > 0 ? (
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                {endbook.choiceSummaries.map((summary) => (
                  <Chip
                    key={summary.choiceId}
                    label={`${summary.roleDisplayName}: ${summary.selectedOptionLabel}`}
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Stack>
            ) : null}

            {endbook.alternateOutcomes.map((outcome) => {
              const alternateText = [outcome.title, outcome.body]
                .filter(Boolean)
                .join('\n\n');

              return (
                <Accordion
                  key={`${outcome.choiceId}:${outcome.alternateOptionId}`}
                  disableGutters
                  sx={{
                    color: '#f8f1de',
                    backgroundColor: 'rgba(15, 19, 24, 0.78)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    borderRadius: '8px !important',
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: '#f8f1de' }} />}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={950}>
                        {`${outcome.choiceLabel} - 다른 선택: ${outcome.alternateOptionLabel}`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
                        {`실제 선택: ${outcome.selectedOptionLabel}`}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.72 }}
                    >
                      {alternateText}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        ) : null}
      </Stack>
    );
  };

  const renderPhaseBody = () => {
    if (phaseKind === 'lobby') {
      return (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={950} sx={{ flex: 1 }}>
              참가 현황
            </Typography>
            <Chip
              size="small"
              color={
                connectedPlayerCount >= requiredPlayerCount
                  ? 'success'
                  : 'default'
              }
              label={`${requiredPlayerCount}인 게임 · 접속 ${connectedPlayerCount}/${requiredPlayerCount}`}
              sx={{ fontWeight: 900 }}
            />
          </Stack>
          <Typography sx={{ color: '#d8d0bd' }}>
            캐릭터 선택 순위를 정한 뒤 선호를 제출하세요. 제출 여부는 상단 마커
            색상으로 확인할 수 있습니다.
          </Typography>
          <RoleSelectionPanel
            roleSelection={snapshot.roleSelection}
            draftRolePreferenceIds={draftRolePreferenceIds}
            hasSubmittedRolePreferences={hasSubmittedRolePreferences}
            canSubmitRolePreferences={canSubmitRolePreferences}
            onSetRoleRank={setRolePreferenceRank}
            onSubmitRolePreferences={onSubmitRolePreferences}
            onClearRolePreferences={onClearRolePreferences}
            canShareRoleSheets={canUseHostTools}
            onShareRoleSheet={onShareRoleSheet}
          />
          {connectedPlayerCount < requiredPlayerCount ? (
            <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
              모든 참가자가 접속하면 캐릭터 선호 제출을 완료할 수 있습니다.
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

    return renderEndbookArea();
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

      <Box
        sx={{
          position: 'relative',
          zIndex: 20,
          flexShrink: 0,
          minHeight: { xs: 48, md: 56 },
          px: { xs: 1.05, md: 2 },
          py: { xs: 0.45, md: 0.65 },
          backgroundColor: 'rgba(9,13,18,0.58)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            pr: { xs: 11.5, sm: 13, md: 0 },
            maxWidth: { md: 'calc(50% - 64px)' },
          }}
        >
          <Typography
            fontWeight={950}
            sx={{
              fontSize: { xs: 16, md: 20 },
              lineHeight: { xs: 1.08, md: 1.16 },
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
            }}
          >
            {scenarioTitle.mainTitle}
          </Typography>
          {scenarioTitle.subtitle ? (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: { xs: 0, md: 0.12 },
                color: '#d8d0bd',
                fontSize: { xs: 11, md: 13 },
                fontWeight: 800,
                lineHeight: { xs: 1.1, md: 1.2 },
                wordBreak: 'keep-all',
                overflowWrap: 'break-word',
              }}
            >
              {scenarioTitle.subtitle}
            </Typography>
          ) : null}
        </Box>
        <Chip
          icon={<TimerIcon />}
          label={formatSeconds(phaseRemainingSec)}
          color={isPhaseTimerExpired ? 'warning' : 'default'}
          size="small"
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: { xs: 72, md: 84 },
            height: { xs: 28, md: 32 },
            backgroundColor: isPhaseTimerExpired
              ? undefined
              : 'rgba(255,255,255,0.12)',
            color: isPhaseTimerExpired ? undefined : '#f8f1de',
            fontWeight: 900,
            '& .MuiChip-icon': {
              fontSize: { xs: 16, md: 18 },
            },
          }}
        />
        <Stack
          direction="row"
          spacing={0.45}
          alignItems="center"
          justifyContent="flex-end"
          sx={{
            position: 'absolute',
            right: { xs: 8, md: 16 },
            top: '50%',
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
            '& .MuiIconButton-root': {
              width: { xs: 32, md: 34 },
              height: { xs: 32, md: 34 },
            },
          }}
        >
          <BgmControl track={bgmTrack} />
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
      </Box>

      {shouldShowRoleSelectionMarkerRail ? (
        <RoleSelectionMarkerRail
          players={snapshot.roleSelection.players}
          sessionId={sessionId}
          connectedPlayerCount={connectedPlayerCount}
          requiredPlayerCount={requiredPlayerCount}
        />
      ) : shouldShowPlayerMarkerRail ? (
        <PlayerMarkerRail
          players={snapshot.players}
          sessionId={sessionId}
          clueTakeHighlightPlayerId={clueTakeNotice?.playerId ?? null}
          turnOrderMarkers={turnOrderMarkers}
          onSelectPlayer={setSelectedPlayerId}
        />
      ) : null}

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
            lg: isMapInvestigationPhase
              ? 'minmax(0, 1fr) 210px'
              : 'minmax(0, 1fr) 260px',
          },
          gridTemplateRows: {
            xs: 'minmax(0, 1fr)',
            lg: 'minmax(0, 1fr)',
          },
          gap: { xs: 1, lg: 1.4 },
          p: { xs: 1, md: 1.4 },
          pb: hasOpenModal ? { xs: 10, lg: 1.4 } : { xs: 22, lg: 10 },
          overflow: 'hidden',
        }}
      >
        <Box
          ref={phaseScrollRef}
          sx={{
            gridColumn: { xs: '1', lg: '1' },
            gridRow: { xs: '1', lg: '1' },
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
            {phaseKind !== 'lobby' &&
            phaseKind !== 'discuss' &&
            phaseKind !== 'final_vote' ? (
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
              gridColumn: { lg: '2' },
              gridRow: { lg: '1' },
              alignSelf: 'end',
            }}
          >
            <MyDeskPanel
              compact={isMapInvestigationPhase}
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
      <ClueTakeOverlay
        notice={clueTakeNotice}
        topOffset={{
          xs: shouldShowMarkerRail ? 118 : 60,
          md: shouldShowMarkerRail ? 126 : 66,
        }}
      />
      {isSmall &&
      isMapInvestigationPhase &&
      snapshot.investigation.map?.scene ? (
        <InvestigationMapFab
          scene={snapshot.investigation.map.scene}
          bottomOffset={hasOpenModal ? 96 : 154}
          onOpen={() => setIsMapDialogOpen(true)}
        />
      ) : null}
      {isSmall && pinnedCard && !selectedCard ? (
        <PinnedClueFab
          card={pinnedCard}
          bottomOffset={hasOpenModal ? 96 : 154}
          onOpen={openPinnedClue}
        />
      ) : null}

      <PublicCoverDialog
        open={Boolean(selectedPlayer)}
        player={selectedPlayer}
        isSelf={selectedPlayer?.id === sessionId}
        canOpenRulebook={Boolean(snapshot.roleSheet)}
        fullScreen={isSmall}
        selfPrivateCards={snapshot.clueVault.myClues}
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
        onOpenSelfPrivateCard={(card) =>
          openCardViewer('my-clues', snapshot.clueVault.myClues, card)
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
        isPinned={isSelectedCardPinned}
        currentIndex={cardViewer?.index ?? 0}
        totalCount={cardViewer?.cards.length ?? 0}
        onPrevious={showPreviousCard}
        onNext={showNextCard}
        onTogglePin={toggleSelectedCardPin}
        onClose={() => setCardViewer(null)}
      />
      <EndbookEvidenceReferenceDialog
        reference={selectedEvidenceRef}
        fullScreen={isSmall}
        onClose={() => setSelectedEvidenceRef(null)}
      />
      <MapFullscreenDialog
        open={isMapDialogOpen}
        scene={snapshot.investigation.map?.scene ?? null}
        pins={isMapInvestigationPhase ? mapTargetPins : []}
        fullScreen={isSmall}
        onSelectPin={selectInvestigationMapTarget}
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
