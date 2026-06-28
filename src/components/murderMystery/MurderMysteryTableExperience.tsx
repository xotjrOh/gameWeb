'use client';

import {
  Fragment,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type ReactNode,
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
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  type ChipProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  AccountCircle as AccountCircleIcon,
  AutoStories as AutoStoriesIcon,
  ArrowForward as ArrowForwardIcon,
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
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  PushPin as PushPinIcon,
  RadioButtonChecked as RadioButtonCheckedIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  RestartAlt as RestartAltIcon,
  Search as SearchIcon,
  SkipNext as SkipNextIcon,
  Style as StyleIcon,
  TaskAlt as TaskAltIcon,
  Timer as TimerIcon,
  Timeline as TimelineIcon,
  VolumeOff as VolumeOffIcon,
  VolumeUp as VolumeUpIcon,
  WarningAmber as WarningAmberIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import {
  MurderMysteryCardScenario,
  MurderMysteryClueVaultCardView,
  MurderMysteryEndbookEvidenceQnaView,
  MurderMysteryEndbookEvidenceReferenceView,
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
import CharacterPortraitFrame, {
  CharacterBookCover,
} from '@/components/murderMystery/CharacterPortraitFrame';
import MurderMysteryRulebookReader from '@/components/murderMystery/MurderMysteryRulebookReader';
import MurderMysteryInvestigationMapViewer from '@/components/murderMystery/MurderMysteryInvestigationMapViewer';
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
  onShareRoleSheet: (roleId: string) => void;
  onSubmitInvestigationByTarget: (targetId: string) => void;
  onSubmitInvestigationByBack: (backId: string) => void;
  onSetReservation: (backId: string) => void;
  onClearReservation: () => void;
  pendingReservationBackId: string | null;
  onRevealMyClue: (cardId: string) => void;
  onStartPresentationTimer: () => void;
  onEndPresentationTimer: () => void;
  onSubmitVote: (voteOptionId: string) => void;
  onSubmitEndingChoice: (choiceId: string, optionId: string) => void;
  onReportSpecialEvent: (
    eventId: string,
    outcome: MurderMysterySpecialEventOutcome
  ) => void;
}

type PhaseKind = MurderMysteryStepKind | 'lobby';
type IntroTab = 'prologue' | 'public-info';
type AnyClueCard = MurderMysteryClueVaultCardView | MurderMysteryCardScenario;
type CardOrderBucket = 'public-clues' | 'my-clues';
type StoredCardOrder = Partial<Record<CardOrderBucket, string[]>>;
type ParticipantLabelSource = {
  name?: string | null;
  displayName?: string | null;
  roleDisplayName?: string | null;
};
type RoleSelectionPublicCover =
  MurderMysteryStateSnapshot['roleSelection']['publicCovers'][number];
type RoleSelectionRole =
  MurderMysteryStateSnapshot['roleSelection']['roles'][number];
type EndbookEvidenceReference = MurderMysteryEndbookEvidenceReferenceView;
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
type SortableCardGesture = {
  pointerId: number;
  cardId: string;
  startX: number;
  startY: number;
  startTarget: HTMLElement;
  isDragging: boolean;
};
type ActiveSortableCardDrag = {
  cardId: string;
  overCardId: string | null;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};
type SortableClientRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};
type SortableGridLayoutSnapshot = {
  gridRect: SortableClientRect;
  cardIdsByIndex: string[];
  columns: number;
  columnCenters: number[];
  rowCenters: number[];
};
type SortableClueCardGridProps<TCard extends AnyClueCard> = {
  cards: TCard[];
  onReorder: (cards: TCard[]) => void;
  renderCard: (card: TCard) => ReactNode;
};
type InvestigationCardMatGroup = {
  id: string;
  label: string;
  order: number;
  targets: InvestigationCardMatEntry[];
};
type ClueTakeNotice = {
  id: string;
  kind: 'take' | 'reservationStolen';
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
const ROLE_SELECTION_GUIDE_TEXT =
  '캐릭터 1명 선택 · 겹치면 1명 확정, 나머지 랜덤';
const CLUE_TAKE_NOTICE_DURATION_MS = 5200;
const RESERVATION_STOLEN_NOTICE_DURATION_MS = 9000;
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
  frameLeft: number;
  frameRight: number;
  frameTop: number;
  frameBottom: number;
};
type FloatingFabDragPosition = {
  side: FloatingFabDockSide;
  top: number;
};
type InvestigationMapTargetPin = {
  target: MurderMysteryInvestigationTargetView;
  hotspot: MurderMysteryInvestigationMapHotspotView;
  matNumber: number;
};
type MapHighlightedInvestigationTarget = {
  targetId: string;
  serial: number;
};
type TurnOrderMarker = {
  rank: number;
  isCurrent: boolean;
};
type InvestigationPlayerProgress =
  MurderMysteryStateSnapshot['investigation']['playerProgress'][number];
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
const UNKNOWN_CARD_SOURCE_LABEL = '출처 미확인';
const READ_REPEAT_BACK_HINT =
  '이미 한 번 읽힌 반복조사 카드입니다. 다시 선택할 수 있습니다.';
const MAX_VISIBLE_INVESTIGATION_PROGRESS_TOKENS = 5;
const EXTRA_INVESTIGATION_LABEL = '전체공개 후 추가조사';
const EXTRA_INVESTIGATION_DESCRIPTION =
  '이 표식이 있는 카드는 획득 즉시 전체 공개되고, 조사자가 같은 라운드에서 한 번 더 조사합니다.';
const EXTRA_INVESTIGATION_TEXT_PATTERN = /\s*\[전체공개 후 추가조사\]\s*/g;
const EDGE_PANEL_FAB_WIDTH = 40;
const EDGE_PANEL_FAB_HEIGHT = 68;
const EDGE_PANEL_FAB_VERTICAL_EDGE_OFFSET = 12;
const EDGE_PANEL_FAB_TOP_SAFE_OFFSET = 50;
const EDGE_PANEL_FAB_DRAG_THRESHOLD = 5;
const PINNED_CLUE_FAB_STORAGE_KEY = 'murderMystery:pinnedClueFabPosition:v1';
const MAP_FAB_STORAGE_KEY = 'murderMystery:mapFabPosition:v1';
const CARD_ORDER_STORAGE_PREFIX = 'murderMystery:cardOrder:v1';
const ANNOUNCEMENT_READ_STORAGE_PREFIX = 'murderMystery:announcementRead:v1';
const CARD_ORDER_BUCKETS: CardOrderBucket[] = ['public-clues', 'my-clues'];
const CARD_SORT_LONG_PRESS_MS = 450;
const CARD_SORT_CANCEL_DISTANCE = 10;
const DEFAULT_PINNED_CLUE_FAB_POSITION: FloatingFabPosition = {
  side: 'right',
  yRatio: 1,
};
const DEFAULT_MAP_FAB_POSITION: FloatingFabPosition = {
  side: 'right',
  yRatio: 0.46,
};

type AnimatedProgressChipProps = ChipProps & {
  animateOnMount?: boolean;
  count: number;
};

const AnimatedProgressChip = ({
  animateOnMount = false,
  count,
  sx,
  ...chipProps
}: AnimatedProgressChipProps) => {
  const previousCountRef = useRef<number | null>(null);
  const [animationSerial, setAnimationSerial] = useState(0);

  useEffect(() => {
    const previousCount = previousCountRef.current;
    if (
      (previousCount === null && animateOnMount && count > 0) ||
      (previousCount !== null && count > previousCount)
    ) {
      setAnimationSerial((serial) => serial + 1);
    }
    previousCountRef.current = count;
  }, [animateOnMount, count]);

  const sxList = Array.isArray(sx) ? sx : sx ? [sx] : [];

  return (
    <Chip
      key={animationSerial}
      {...chipProps}
      sx={[
        ...sxList,
        animationSerial > 0
          ? {
              animation: 'mmProgressChipBump 420ms ease-out both',
              transformOrigin: 'center',
              willChange: 'transform, box-shadow',
              '@keyframes mmProgressChipBump': {
                '0%': {
                  transform: 'scale(1)',
                  boxShadow: '0 0 0 0 rgba(245, 197, 66, 0)',
                },
                '38%': {
                  transform: 'scale(1.12)',
                  boxShadow: '0 0 0 7px rgba(245, 197, 66, 0.3)',
                },
                '100%': {
                  transform: 'scale(1)',
                  boxShadow: '0 0 0 0 rgba(245, 197, 66, 0)',
                },
              },
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
                transition: 'none',
                willChange: 'auto',
              },
            }
          : {},
      ]}
    />
  );
};

const ReadRepeatCornerMark = ({ size = 9 }: { size?: number }) => (
  <Box
    aria-hidden
    sx={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 0,
      height: 0,
      borderTop: `${size}px solid rgba(148, 163, 184, 0.92)`,
      borderLeft: `${size}px solid transparent`,
      pointerEvents: 'none',
      zIndex: 3,
    }}
  />
);

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

const getStepKindLabel = (kind: MurderMysteryStepKind) => {
  switch (kind) {
    case 'intro':
      return '낭독';
    case 'role_selection':
      return '캐릭터 선택';
    case 'role_reading':
      return '룰지 확인';
    case 'investigate':
      return '조사';
    case 'discuss':
      return '회의';
    case 'presentation':
      return '개인 발표';
    case 'final_vote':
      return '최종 투표';
    case 'ending_choice':
      return '엔딩 선택';
    case 'endbook':
      return '엔딩';
    default:
      return '진행';
  }
};

const getAnnouncementTypeLabel = (
  type: MurderMysteryStateSnapshot['announcements'][number]['type']
) => {
  switch (type) {
    case 'INTRO':
      return '프롤로그';
    case 'ENDBOOK':
      return '엔딩';
    case 'CLUE':
      return '단서';
    case 'SYSTEM':
    default:
      return '시스템';
  }
};

const formatAnnouncementTime = (timestamp: number) =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));

const getRoundCardPoolIds = (
  round: MurderMysteryStateSnapshot['scenario']['investigations']['rounds'][number]
) =>
  Array.from(new Set(round.targets.flatMap((target) => target.cardPool ?? [])));

type FlowAdvanceMode = 'timer_auto' | 'completion_auto' | 'host_action';

const FLOW_ADVANCE_MODE_META: Record<
  FlowAdvanceMode,
  {
    label: string;
    description: string;
    backgroundColor: string;
    borderColor: string;
    iconColor: string;
  }
> = {
  timer_auto: {
    label: '시간 자동',
    description: '제한시간이 끝나면 서버가 다음 단계로 자동 전환합니다.',
    backgroundColor: 'rgba(245, 197, 66, 0.2)',
    borderColor: 'rgba(245, 197, 66, 0.62)',
    iconColor: '#f5c542',
  },
  completion_auto: {
    label: '완료 자동',
    description: '필요한 행동을 모두 끝내면 다음 단계로 자동 전환합니다.',
    backgroundColor: 'rgba(74, 222, 128, 0.16)',
    borderColor: 'rgba(74, 222, 128, 0.5)',
    iconColor: '#4ade80',
  },
  host_action: {
    label: '방장 진행',
    description: '방장이 다음 단계, 집계, 확정 버튼을 눌러 진행합니다.',
    backgroundColor: 'rgba(96, 165, 250, 0.16)',
    borderColor: 'rgba(96, 165, 250, 0.48)',
    iconColor: '#93c5fd',
  },
};

const isMapInvestigationScenario = (snapshot: MurderMysteryStateSnapshot) =>
  Boolean(
    snapshot.scenario.investigations.deliveryMode === 'auto' &&
      snapshot.scenario.investigations.layout.map &&
      snapshot.scenario.investigations.turnOrder?.roleIds.length
  );

const getFlowAdvanceMode = (
  step: MurderMysteryStateSnapshot['scenario']['flow']['steps'][number],
  snapshot: MurderMysteryStateSnapshot,
  durationSec: number | null
): FlowAdvanceMode => {
  if (step.kind === 'discuss' && durationSec !== null) {
    return 'timer_auto';
  }

  if (step.kind === 'role_reading') {
    return 'completion_auto';
  }

  if (step.kind === 'investigate' && isMapInvestigationScenario(snapshot)) {
    return 'completion_auto';
  }

  return 'host_action';
};

const getFlowAdvanceModeIcon = (mode: FlowAdvanceMode) => {
  switch (mode) {
    case 'timer_auto':
      return <TimerIcon />;
    case 'completion_auto':
      return <TaskAltIcon />;
    case 'host_action':
    default:
      return <SkipNextIcon />;
  }
};

const getFlowAdvanceStepDescription = (
  mode: FlowAdvanceMode,
  stepKind: MurderMysteryStepKind
) => {
  if (mode === 'timer_auto') {
    return '시간이 0이 되면 자동으로 다음 단계로 넘어갑니다.';
  }
  if (mode === 'completion_auto') {
    return stepKind === 'role_reading'
      ? '모든 플레이어가 읽음 완료를 누르면 자동으로 넘어갑니다.'
      : '모든 조사 차례가 끝나면 자동으로 넘어갑니다.';
  }
  if (stepKind === 'presentation') {
    return '발표 타이머는 개인 발표 종료용이며, 다음 단계 이동은 방장이 진행합니다.';
  }
  return '타이머가 있어도 자동 전환되지 않으며, 방장이 진행 버튼으로 넘깁니다.';
};

const FlowAdvanceModeChip = ({
  mode,
  title,
}: {
  mode: FlowAdvanceMode;
  title?: string;
}) => {
  const meta = FLOW_ADVANCE_MODE_META[mode];

  return (
    <Tooltip title={title ?? meta.description}>
      <Chip
        size="small"
        icon={getFlowAdvanceModeIcon(mode)}
        label={meta.label}
        variant="outlined"
        sx={{
          height: 22,
          backgroundColor: meta.backgroundColor,
          borderColor: meta.borderColor,
          color: '#f7f0df',
          fontWeight: 950,
          '& .MuiChip-icon': {
            color: meta.iconColor,
            fontSize: 16,
          },
        }}
      />
    </Tooltip>
  );
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
  if (clueCard.sourceBackLabels?.length) {
    return clueCard.sourceBackLabels.join(', ');
  }
  if (clueCard.sourceTargetLabels?.length) {
    return clueCard.sourceTargetLabels.join(', ');
  }
  return '';
};

const getCardSourceDisplayText = (card: AnyClueCard) => {
  const sourceText = getCardSourceText(card);
  if (!sourceText) {
    return UNKNOWN_CARD_SOURCE_LABEL;
  }
  return sourceText;
};

const getDisplayCardText = (card: AnyClueCard) =>
  card.extraInvestigationOnReveal
    ? card.text.replace(EXTRA_INVESTIGATION_TEXT_PATTERN, '').trimStart()
    : card.text;

const getCompactCardPreviewText = (card: AnyClueCard, maxLength = 52) => {
  const normalizedText = getDisplayCardText(card).replace(/\s+/g, ' ').trim();
  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }
  return `${normalizedText.slice(0, maxLength).trimEnd()}...`;
};

const getUniqueClueCards = (cards: MurderMysteryClueVaultCardView[]) => {
  const seenCardIds = new Set<string>();
  return cards.filter((card) => {
    if (seenCardIds.has(card.id)) {
      return false;
    }
    seenCardIds.add(card.id);
    return true;
  });
};

const getClueVaultCardState = (card: AnyClueCard) => {
  const clueCard = card as MurderMysteryClueVaultCardView;
  return {
    isPublic: clueCard.isPublic === true,
    canRevealPublicly:
      clueCard.canRevealPublicly === true && Boolean(clueCard.backId),
  };
};

const getSpecialEventSourceLabel = (
  card: AnyClueCard,
  investigationTargetIds: Set<string>
) => {
  const clueCard = card as MurderMysteryClueVaultCardView;
  const sourceTargetIds = clueCard.sourceTargetIds ?? [];
  const hasSpecialEventSource = sourceTargetIds.some(
    (sourceId) => !investigationTargetIds.has(sourceId)
  );

  return hasSpecialEventSource ? getCardSourceText(card) || '잠금 증언' : null;
};

const getPrivateOnlyClueCards = (
  cards: MurderMysteryClueVaultCardView[],
  publicCards: MurderMysteryClueVaultCardView[]
) => {
  const publicCardIds = new Set(publicCards.map((card) => card.id));
  const publicBackIds = new Set(
    publicCards.map((card) => card.backId).filter(Boolean) as string[]
  );

  return cards.filter(
    (card) =>
      !card.isPublic &&
      !publicCardIds.has(card.id) &&
      !(card.backId && publicBackIds.has(card.backId))
  );
};

const readStoredCardOrder = (storageKey: string): StoredCardOrder => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(storageKey) ?? '{}'
    ) as Record<string, unknown>;
    return CARD_ORDER_BUCKETS.reduce<StoredCardOrder>((acc, bucket) => {
      const value = parsed[bucket];
      if (Array.isArray(value)) {
        acc[bucket] = value.filter(
          (cardId): cardId is string => typeof cardId === 'string'
        );
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const writeStoredCardOrder = (
  storageKey: string,
  cardOrder: StoredCardOrder
) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cardOrder));
  } catch {
    // Some browsers block localStorage; in-memory order still works.
  }
};

const orderCardsByStoredIds = <TCard extends { id: string }>(
  cards: TCard[],
  orderedIds?: string[]
) => {
  if (!orderedIds?.length) {
    return cards;
  }

  const cardById = new Map(cards.map((card) => [card.id, card] as const));
  const orderedCards: TCard[] = [];
  const seenCardIds = new Set<string>();

  orderedIds.forEach((cardId) => {
    const card = cardById.get(cardId);
    if (card && !seenCardIds.has(cardId)) {
      orderedCards.push(card);
      seenCardIds.add(cardId);
    }
  });

  cards.forEach((card) => {
    if (!seenCardIds.has(card.id)) {
      orderedCards.push(card);
    }
  });

  return orderedCards;
};

const reorderCards = <TCard,>(
  cards: TCard[],
  fromIndex: number,
  toIndex: number
) => {
  const nextCards = [...cards];
  const [movedCard] = nextCards.splice(fromIndex, 1);
  if (!movedCard) {
    return cards;
  }
  nextCards.splice(toIndex, 0, movedCard);
  return nextCards;
};

const getActiveSortableCardRect = (
  drag: ActiveSortableCardDrag,
  pointerX = drag.pointerX,
  pointerY = drag.pointerY
): SortableClientRect => {
  const left = pointerX - drag.offsetX;
  const top = pointerY - drag.offsetY;
  return {
    left,
    top,
    right: left + drag.width,
    bottom: top + drag.height,
    width: drag.width,
    height: drag.height,
  };
};

const toSortableClientRect = (rect: DOMRect): SortableClientRect => ({
  left: rect.left,
  top: rect.top,
  right: rect.right,
  bottom: rect.bottom,
  width: rect.width,
  height: rect.height,
});

const getComputedGridColumnCount = (gridElement: HTMLElement) => {
  const templateColumns = window
    .getComputedStyle(gridElement)
    .gridTemplateColumns.split(' ')
    .filter((track) => track.trim() && track !== 'none');
  return templateColumns.length;
};

const getAxisIndexFromCenters = (value: number, centers: number[]) => {
  if (centers.length <= 1) {
    return 0;
  }

  let low = 0;
  let high = centers.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const boundary = (centers[mid] + centers[mid + 1]) / 2;
    if (value < boundary) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
};

const getSortableGridLayoutSnapshot = (
  gridElement: HTMLElement | null
): SortableGridLayoutSnapshot | null => {
  if (!gridElement) {
    return null;
  }

  const sortableElements = Array.from(
    gridElement.querySelectorAll<HTMLElement>('[data-sortable-card-id]')
  );
  if (!sortableElements.length) {
    return null;
  }

  const measuredCards = sortableElements.map((element) => ({
    cardId: element.dataset.sortableCardId ?? '',
    rect: toSortableClientRect(element.getBoundingClientRect()),
  }));
  const validMeasuredCards = measuredCards.filter(
    ({ cardId, rect }) => cardId && rect.width > 0 && rect.height > 0
  );
  if (!validMeasuredCards.length) {
    return null;
  }

  const gridRect = toSortableClientRect(gridElement.getBoundingClientRect());
  const columns = Math.max(
    1,
    getComputedGridColumnCount(gridElement) ||
      Math.min(validMeasuredCards.length, 3)
  );
  const rowCount = Math.max(1, Math.ceil(validMeasuredCards.length / columns));
  const fallbackColumnWidth = gridRect.width / columns;
  const fallbackRowHeight = gridRect.height / rowCount;
  const columnCenters = Array.from({ length: columns }, (_, columnIndex) => {
    const measuredCard = validMeasuredCards.find(
      (_, cardIndex) => cardIndex % columns === columnIndex
    );
    return measuredCard
      ? measuredCard.rect.left + measuredCard.rect.width / 2
      : gridRect.left + fallbackColumnWidth * (columnIndex + 0.5);
  });
  const rowCenters = Array.from({ length: rowCount }, (_, rowIndex) => {
    const rowCards = validMeasuredCards.filter(
      (_, cardIndex) => Math.floor(cardIndex / columns) === rowIndex
    );
    if (rowCards.length) {
      const rowTop = Math.min(...rowCards.map(({ rect }) => rect.top));
      const rowBottom = Math.max(...rowCards.map(({ rect }) => rect.bottom));
      return (rowTop + rowBottom) / 2;
    }
    return gridRect.top + fallbackRowHeight * (rowIndex + 0.5);
  });

  return {
    gridRect,
    cardIdsByIndex: validMeasuredCards.map(({ cardId }) => cardId),
    columns,
    columnCenters,
    rowCenters,
  };
};

const getSortableCardDropTargetId = (
  layoutSnapshot: SortableGridLayoutSnapshot | null,
  activeCardId: string,
  dragRect: SortableClientRect
) => {
  if (!layoutSnapshot) {
    return null;
  }

  const { cardIdsByIndex, columnCenters, columns, gridRect, rowCenters } =
    layoutSnapshot;
  if (!cardIdsByIndex.length || !columnCenters.length || !rowCenters.length) {
    return null;
  }

  const dragCenterX = dragRect.left + dragRect.width / 2;
  const dragCenterY = dragRect.top + dragRect.height / 2;
  const horizontalTolerance = Math.max(36, dragRect.width * 0.45);
  const verticalTolerance = Math.max(36, dragRect.height * 0.45);

  if (
    dragCenterX < gridRect.left - horizontalTolerance ||
    dragCenterX > gridRect.right + horizontalTolerance ||
    dragCenterY < gridRect.top - verticalTolerance ||
    dragCenterY > gridRect.bottom + verticalTolerance
  ) {
    return null;
  }

  const rowIndex = getAxisIndexFromCenters(dragCenterY, rowCenters);
  const columnIndex = getAxisIndexFromCenters(dragCenterX, columnCenters);
  const targetIndex = clamp(
    rowIndex * columns + columnIndex,
    0,
    cardIdsByIndex.length - 1
  );
  const targetCardId = cardIdsByIndex[targetIndex];
  return targetCardId && targetCardId !== activeCardId
    ? targetCardId
    : activeCardId;
};

const isCardDragExcludedTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest('[data-card-drag-excluded="true"]'));

const isCardDetailNavigationIgnoredTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      'button, a, input, textarea, select, [role="button"], [role="slider"], [data-card-detail-navigation-skip="true"]'
    )
  );

const CARD_DETAIL_NAVIGATION_REVEAL_MS = 1400;

const TextOnlyClueMedia = ({
  dense = false,
  detail = false,
  mediaHeight,
}: {
  dense?: boolean;
  detail?: boolean;
  mediaHeight?: number;
}) => (
  <Stack
    spacing={detail ? 0.8 : 0.35}
    alignItems="center"
    justifyContent="center"
    sx={{
      position: 'relative',
      height: mediaHeight ?? (detail ? { xs: 124, sm: 144 } : dense ? 70 : 108),
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

const ExtraInvestigationFrontBadge = ({
  dense = false,
  floating = false,
  withTooltip = true,
  sx,
}: {
  dense?: boolean;
  floating?: boolean;
  withTooltip?: boolean;
  sx?: Record<string, unknown>;
}) => {
  const size = dense ? 28 : 34;
  const iconSize = dense ? 19 : 23;

  const badge = (
    <Box
      aria-label={EXTRA_INVESTIGATION_LABEL}
      sx={{
        position: floating ? 'absolute' : 'relative',
        ...(floating ? { top: dense ? 5 : 7, right: dense ? 5 : 7 } : {}),
        flex: '0 0 auto',
        zIndex: 2,
        width: size,
        height: size,
        borderRadius: 999,
        display: 'grid',
        placeItems: 'center',
        overflow: 'visible',
        background:
          'linear-gradient(135deg, rgba(14,165,233,0.96), rgba(37,99,235,0.96))',
        color: '#f8fbff',
        boxShadow:
          '0 5px 14px rgba(15,23,42,0.42), inset 0 0 0 1px rgba(255,255,255,0.38)',
        ...sx,
      }}
    >
      <SearchIcon sx={{ fontSize: iconSize }} />
      <Box
        aria-hidden
        component="span"
        sx={{
          position: 'absolute',
          top: dense ? -4 : -5,
          right: dense ? -2 : -3,
          color: '#f8fbff',
          fontSize: dense ? 13 : 15,
          lineHeight: 1,
          fontWeight: 950,
          textShadow: '0 1px 3px rgba(15,23,42,0.68)',
          pointerEvents: 'none',
        }}
      >
        +
      </Box>
    </Box>
  );

  return withTooltip ? (
    <Tooltip title={EXTRA_INVESTIGATION_DESCRIPTION}>{badge}</Tooltip>
  ) : (
    badge
  );
};

const ExtraInvestigationLegend = () => (
  <Tooltip title={EXTRA_INVESTIGATION_DESCRIPTION}>
    <Stack
      component="span"
      direction="row"
      spacing={0.45}
      alignItems="center"
      sx={{
        height: 24,
        px: 0.75,
        borderRadius: 999,
        backgroundColor: 'rgba(14,165,233,0.16)',
        color: '#7dd3fc',
        border: '1px solid rgba(125,211,252,0.24)',
      }}
    >
      <ExtraInvestigationFrontBadge
        dense
        withTooltip={false}
        sx={{
          width: 18,
          height: 18,
          boxShadow: 'none',
          '& svg': { fontSize: 14 },
        }}
      />
      <Typography
        variant="caption"
        fontWeight={900}
        sx={{ lineHeight: 1, whiteSpace: 'nowrap' }}
      >
        {EXTRA_INVESTIGATION_LABEL}
      </Typography>
    </Stack>
  </Tooltip>
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

const getRoleSelectionShortName = (displayName: string) => {
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
  const [userEnabled, setUserEnabled] = useState(false);

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
  tone = 'default',
}: {
  title: string;
  description?: string;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  auxiliaryActions?: React.ReactNode;
  bottomOffset: { xs: number; md: number };
  tone?: 'default' | 'urgent';
}) => {
  const isUrgent = tone === 'urgent';

  return (
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
          border: isUrgent
            ? '2px solid rgba(251, 146, 60, 0.96)'
            : '1px solid rgba(245, 197, 66, 0.48)',
          background: isUrgent
            ? 'linear-gradient(180deg, rgba(124, 45, 18, 0.98), rgba(48, 18, 9, 0.98))'
            : 'linear-gradient(180deg, rgba(38, 31, 23, 0.97), rgba(18, 22, 25, 0.97))',
          color: '#f8f1de',
          boxShadow: isUrgent
            ? '0 0 0 3px rgba(251, 146, 60, 0.22), 0 22px 54px rgba(124, 45, 18, 0.52)'
            : '0 18px 44px rgba(0,0,0,0.46)',
          backdropFilter: 'blur(14px)',
          animation: isUrgent
            ? 'mmUrgentDockPulse 1.15s ease-in-out infinite'
            : 'none',
          '@keyframes mmUrgentDockPulse': {
            '0%, 100%': {
              boxShadow:
                '0 0 0 3px rgba(251, 146, 60, 0.22), 0 22px 54px rgba(124, 45, 18, 0.52)',
            },
            '50%': {
              boxShadow:
                '0 0 0 7px rgba(251, 146, 60, 0.34), 0 26px 62px rgba(124, 45, 18, 0.62)',
            },
          },
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              spacing={0.7}
              alignItems="center"
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              {isUrgent ? (
                <Box
                  aria-hidden
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    flex: '0 0 auto',
                    backgroundColor: '#fed7aa',
                    color: '#7c2d12',
                    boxShadow: '0 0 0 2px rgba(254, 215, 170, 0.25)',
                  }}
                >
                  <TimerIcon sx={{ fontSize: 16 }} />
                </Box>
              ) : null}
              <Typography
                fontWeight={950}
                sx={{
                  fontSize: isUrgent ? { xs: 15, md: 16 } : { xs: 14, md: 15 },
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
                  color: isUrgent ? '#fff7ed' : '#d8d0bd',
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
};

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

  const isReservationStolen = notice.kind === 'reservationStolen';
  const title = isReservationStolen
    ? `젠장! ${notice.playerLabel}에게 단서(${notice.backLabel})를 빼앗겼다. 단서를 다시 골라야겠어.`
    : `${notice.playerLabel}이 ‘${notice.backLabel}’를 가져갔습니다.`;

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
          border: isReservationStolen
            ? '1px solid rgba(251, 146, 60, 0.9)'
            : '1px solid rgba(142, 202, 230, 0.78)',
          background: isReservationStolen
            ? 'linear-gradient(180deg, rgba(73, 23, 18, 0.98), rgba(111, 39, 24, 0.98))'
            : 'linear-gradient(180deg, rgba(10, 18, 24, 0.98), rgba(31, 43, 47, 0.98))',
          color: '#f8f1de',
          boxShadow: '0 18px 44px rgba(0,0,0,0.48)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          {isReservationStolen ? (
            <WarningAmberIcon sx={{ color: '#fb923c', flex: '0 0 auto' }} />
          ) : (
            <StyleIcon sx={{ color: '#8ecae6', flex: '0 0 auto' }} />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              fontWeight={950}
              sx={{ fontSize: { xs: 14, md: 16 }, lineHeight: 1.35 }}
            >
              {title}
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

const getEdgePanelFabBounds = (
  viewport: FloatingFabViewport,
  bottomOffset: number
) => {
  const maxTop = Math.max(
    viewport.frameTop + EDGE_PANEL_FAB_VERTICAL_EDGE_OFFSET,
    viewport.frameBottom - bottomOffset - EDGE_PANEL_FAB_HEIGHT
  );
  const minTop = Math.min(
    viewport.frameTop + EDGE_PANEL_FAB_TOP_SAFE_OFFSET,
    maxTop
  );
  const maxLeft = Math.max(
    viewport.frameLeft,
    viewport.frameRight - EDGE_PANEL_FAB_WIDTH
  );

  return {
    minTop,
    maxTop,
    minLeft: viewport.frameLeft,
    maxLeft,
  };
};

const getEdgePanelFabTop = (
  position: FloatingFabPosition,
  viewport: FloatingFabViewport,
  bottomOffset: number
) => {
  const bounds = getEdgePanelFabBounds(viewport, bottomOffset);
  return (
    bounds.minTop +
    (bounds.maxTop - bounds.minTop) * clamp(position.yRatio, 0, 1)
  );
};

const getEdgePanelFabLeft = (
  position: FloatingFabPosition,
  viewport: FloatingFabViewport
) => {
  return getEdgePanelFabLeftForSide(position.side, viewport);
};

const getEdgePanelFabLeftForSide = (
  side: FloatingFabDockSide,
  viewport: FloatingFabViewport
) => {
  const bounds = getEdgePanelFabBounds(viewport, 0);
  return side === 'left' ? bounds.minLeft : bounds.maxLeft;
};

const readEdgePanelFabPosition = (
  storageKey: string,
  defaultPosition: FloatingFabPosition
): FloatingFabPosition => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const saved = raw ? JSON.parse(raw) : null;
    const side: unknown = saved?.side;
    const yRatio = Number(saved?.yRatio);

    if ((side === 'left' || side === 'right') && Number.isFinite(yRatio)) {
      return { side, yRatio: clamp(yRatio, 0, 1) };
    }
  } catch {
    // 위치 저장은 편의 기능이므로 실패해도 기본 위치로 동작한다.
  }

  return defaultPosition;
};

const saveEdgePanelFabPosition = (
  storageKey: string,
  position: FloatingFabPosition
) => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(position));
  } catch {
    // 위치 저장 실패는 탭 열기 동작을 막지 않는다.
  }
};

const EdgePanelFab = ({
  ariaLabel,
  tooltip,
  bottomOffset,
  defaultPosition,
  frameRef,
  storageKey,
  zIndex,
  borderColor,
  backgroundColor,
  badgeColor,
  badgeIcon,
  children,
  onOpen,
}: {
  ariaLabel: string;
  tooltip: string;
  bottomOffset: number;
  defaultPosition: FloatingFabPosition;
  frameRef: RefObject<HTMLElement | null>;
  storageKey: string;
  zIndex: number;
  borderColor: string;
  backgroundColor: string;
  badgeColor: string;
  badgeIcon: React.ReactNode;
  children: React.ReactNode;
  onOpen: () => void;
}) => {
  const pointerRef = useRef<{
    pointerId: number;
    startY: number;
    startTop: number;
    startSide: FloatingFabDockSide;
    moved: boolean;
  } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [position, setPosition] =
    useState<FloatingFabPosition>(defaultPosition);
  const [viewport, setViewport] = useState<FloatingFabViewport | null>(null);
  const [dragPosition, setDragPosition] =
    useState<FloatingFabDragPosition | null>(null);
  const activeSide = dragPosition?.side ?? position.side;
  const resolvedTop =
    viewport && !dragPosition
      ? getEdgePanelFabTop(position, viewport, bottomOffset)
      : null;
  const resolvedLeft =
    viewport && !dragPosition ? getEdgePanelFabLeft(position, viewport) : null;
  const activeLeft = viewport
    ? getEdgePanelFabLeftForSide(activeSide, viewport)
    : resolvedLeft;
  const tooltipPlacement = activeSide === 'left' ? 'right' : 'left';
  const borderRadius =
    activeSide === 'left' ? '0 999px 999px 0' : '999px 0 0 999px';

  useEffect(() => {
    setPosition(readEdgePanelFabPosition(storageKey, defaultPosition));
  }, [defaultPosition, storageKey]);

  useEffect(() => {
    const updateViewport = () => {
      const frameRect = frameRef.current?.getBoundingClientRect();
      const fallbackRect = {
        left: 0,
        right: window.innerWidth,
        top: 0,
        bottom: window.innerHeight,
      };
      const rect = frameRect ?? fallbackRect;

      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        frameLeft: rect.left,
        frameRight: rect.right,
        frameTop: rect.top,
        frameBottom: rect.bottom,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && frameRef.current
        ? new ResizeObserver(updateViewport)
        : null;
    if (frameRef.current) {
      resizeObserver?.observe(frameRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      resizeObserver?.disconnect();
    };
  }, [frameRef]);

  const getDragPosition = (event: React.PointerEvent<HTMLElement>) => {
    if (!viewport || !pointerRef.current) {
      return null;
    }

    const bounds = getEdgePanelFabBounds(viewport, bottomOffset);
    const frameCenterX = (viewport.frameLeft + viewport.frameRight) / 2;
    const nextSide: FloatingFabDockSide =
      event.clientX < frameCenterX ? 'left' : 'right';
    const nextTop = clamp(
      pointerRef.current.startTop + event.clientY - pointerRef.current.startY,
      bounds.minTop,
      bounds.maxTop
    );

    return { side: nextSide, top: nextTop };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!viewport) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: rect.top,
      startSide: activeSide,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }

    const nextDragPosition = getDragPosition(event);
    if (!nextDragPosition) {
      return;
    }

    const yDistance = Math.abs(event.clientY - pointer.startY);
    const crossedCenter = nextDragPosition.side !== pointer.startSide;
    if (
      yDistance < EDGE_PANEL_FAB_DRAG_THRESHOLD &&
      !crossedCenter &&
      !pointer.moved
    ) {
      return;
    }

    pointer.moved = true;
    setDragPosition(nextDragPosition);
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
      return;
    }

    const nextDragPosition = getDragPosition(event) ?? dragPosition;
    if (!nextDragPosition) {
      setDragPosition(null);
      return;
    }

    const bounds = getEdgePanelFabBounds(viewport, bottomOffset);
    const nextYRatio =
      bounds.maxTop > bounds.minTop
        ? (nextDragPosition.top - bounds.minTop) /
          (bounds.maxTop - bounds.minTop)
        : defaultPosition.yRatio;
    const nextPosition: FloatingFabPosition = {
      side: nextDragPosition.side,
      yRatio: clamp(nextYRatio, 0, 1),
    };

    setPosition(nextPosition);
    saveEdgePanelFabPosition(storageKey, nextPosition);
    setDragPosition(null);
    suppressClickUntilRef.current = Date.now() + 180;
    event.preventDefault();
  };

  const handlePointerCancel = () => {
    pointerRef.current = null;
    setDragPosition(null);
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (Date.now() < suppressClickUntilRef.current) {
      return;
    }
    event.preventDefault();
    onOpen();
  };

  return (
    <Tooltip title={tooltip} placement={tooltipPlacement}>
      <Box
        component="button"
        type="button"
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        sx={{
          position: 'fixed',
          left: activeLeft ?? 'auto',
          right: activeLeft !== null ? 'auto' : 0,
          top: dragPosition?.top ?? resolvedTop ?? 'auto',
          bottom: dragPosition || resolvedTop !== null ? 'auto' : bottomOffset,
          zIndex,
          width: EDGE_PANEL_FAB_WIDTH,
          height: EDGE_PANEL_FAB_HEIGHT,
          p: 0,
          border: `2px solid ${borderColor}`,
          borderLeftWidth: activeSide === 'left' ? 0 : 2,
          borderRightWidth: activeSide === 'right' ? 0 : 2,
          borderRadius,
          overflow: 'hidden',
          color: '#f8f1de',
          backgroundColor,
          boxShadow:
            '0 14px 34px rgba(0,0,0,0.46), 0 0 0 5px rgba(255,255,255,0.08)',
          cursor: dragPosition ? 'grabbing' : 'pointer',
          pointerEvents: 'auto',
          touchAction: 'none',
          transition: dragPosition
            ? 'none'
            : 'left 190ms ease, right 190ms ease, top 190ms ease, transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
          '&:hover': {
            transform: dragPosition
              ? 'none'
              : `translateX(${activeSide === 'left' ? 3 : -3}px)`,
            borderColor,
            boxShadow:
              '0 18px 40px rgba(0,0,0,0.52), 0 0 0 6px rgba(255,255,255,0.11)',
          },
          '&:focus-visible': {
            outline: '3px solid rgba(251, 191, 36, 0.72)',
            outlineOffset: 3,
          },
        }}
      >
        {children}
        <Box
          sx={{
            position: 'absolute',
            left: activeSide === 'right' ? 5 : 'auto',
            right: activeSide === 'left' ? 5 : 'auto',
            bottom: 6,
            width: 22,
            height: 22,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            backgroundColor: badgeColor,
            color: '#241706',
            border: `2px solid ${backgroundColor}`,
            pointerEvents: 'none',
          }}
        >
          {badgeIcon}
        </Box>
      </Box>
    </Tooltip>
  );
};

const EdgePanelImage = ({
  src,
  alt,
  filter,
}: {
  src: string;
  alt: string;
  filter?: string;
}) => (
  <Box
    component="img"
    src={src}
    alt={alt}
    draggable={false}
    sx={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
      filter,
      userSelect: 'none',
      pointerEvents: 'none',
    }}
  />
);

const PinnedClueFab = ({
  card,
  bottomOffset,
  frameRef,
  onOpen,
}: {
  card: AnyClueCard;
  bottomOffset: number;
  frameRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
}) => (
  <EdgePanelFab
    ariaLabel={`고정한 단서 열기: ${getCardSourceDisplayText(card)}`}
    tooltip="고정한 단서 열기"
    bottomOffset={bottomOffset}
    defaultPosition={DEFAULT_PINNED_CLUE_FAB_POSITION}
    frameRef={frameRef}
    storageKey={PINNED_CLUE_FAB_STORAGE_KEY}
    zIndex={1700}
    borderColor="rgba(245, 197, 66, 0.92)"
    backgroundColor="#201b18"
    badgeColor="#f59e0b"
    badgeIcon={<PushPinIcon sx={{ width: 13, height: 13 }} />}
    onOpen={onOpen}
  >
    {card.imageSrc ? (
      <EdgePanelImage src={card.imageSrc} alt="" />
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
  </EdgePanelFab>
);

const InvestigationMapFab = ({
  scene,
  bottomOffset,
  frameRef,
  onOpen,
}: {
  scene: MurderMysteryInvestigationMapSceneScenario;
  bottomOffset: number;
  frameRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
}) => (
  <EdgePanelFab
    ariaLabel="사건 맵 열기"
    tooltip="사건 맵 열기"
    bottomOffset={bottomOffset}
    defaultPosition={DEFAULT_MAP_FAB_POSITION}
    frameRef={frameRef}
    storageKey={MAP_FAB_STORAGE_KEY}
    zIndex={1695}
    borderColor="rgba(142, 202, 230, 0.95)"
    backgroundColor="#101720"
    badgeColor="#0ea5e9"
    badgeIcon={<MapIcon sx={{ width: 13, height: 13, color: '#f8fbff' }} />}
    onOpen={onOpen}
  >
    <EdgePanelImage
      src={scene.imageSrc}
      alt=""
      filter="saturate(0.95) contrast(1.06)"
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
  </EdgePanelFab>
);

function SortableClueCardGrid<TCard extends AnyClueCard>({
  cards,
  onReorder,
  renderCard,
}: SortableClueCardGridProps<TCard>) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const layoutSnapshotRef = useRef<SortableGridLayoutSnapshot | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const gestureRef = useRef<SortableCardGesture | null>(null);
  const suppressNextClickRef = useRef(false);
  const [activeDrag, setActiveDrag] = useState<ActiveSortableCardDrag | null>(
    null
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const resetGesture = useCallback(() => {
    clearLongPressTimer();
    layoutSnapshotRef.current = null;
    gestureRef.current = null;
    setActiveDrag(null);
  }, [clearLongPressTimer]);

  const beginDrag = useCallback((cardId: string) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.cardId !== cardId) {
      return;
    }

    gesture.isDragging = true;
    suppressNextClickRef.current = true;
    try {
      gesture.startTarget.setPointerCapture(gesture.pointerId);
    } catch {
      // The pointer may already be released on slower devices.
    }
    layoutSnapshotRef.current = getSortableGridLayoutSnapshot(gridRef.current);
    const dragRect = gesture.startTarget.getBoundingClientRect();
    setActiveDrag({
      cardId,
      overCardId: cardId,
      pointerX: gesture.startX,
      pointerY: gesture.startY,
      offsetX: gesture.startX - dragRect.left,
      offsetY: gesture.startY - dragRect.top,
      width: dragRect.width,
      height: dragRect.height,
    });
  }, []);

  const handlePointerDown = useCallback(
    (cardId: string, event: ReactPointerEvent<HTMLElement>) => {
      if (
        (event.pointerType === 'mouse' && event.button !== 0) ||
        isCardDragExcludedTarget(event.target)
      ) {
        return;
      }

      resetGesture();
      gestureRef.current = {
        pointerId: event.pointerId,
        cardId,
        startX: event.clientX,
        startY: event.clientY,
        startTarget: event.currentTarget,
        isDragging: false,
      };
      longPressTimerRef.current = window.setTimeout(
        () => beginDrag(cardId),
        CARD_SORT_LONG_PRESS_MS
      );
    },
    [beginDrag, resetGesture]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      const distance = Math.hypot(
        event.clientX - gesture.startX,
        event.clientY - gesture.startY
      );
      if (!gesture.isDragging) {
        if (distance > CARD_SORT_CANCEL_DISTANCE) {
          resetGesture();
        }
        return;
      }

      event.preventDefault();
      setActiveDrag((current) =>
        current && current.cardId === gesture.cardId
          ? (() => {
              const nextDrag = {
                ...current,
                pointerX: event.clientX,
                pointerY: event.clientY,
              };
              const resolvedOverCardId = getSortableCardDropTargetId(
                layoutSnapshotRef.current,
                gesture.cardId,
                getActiveSortableCardRect(nextDrag)
              );

              return {
                ...nextDrag,
                overCardId: resolvedOverCardId ?? current.overCardId,
              };
            })()
          : current
      );
    },
    [resetGesture]
  );

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      clearLongPressTimer();

      if (!gesture.isDragging) {
        gestureRef.current = null;
        return;
      }

      event.preventDefault();
      try {
        gesture.startTarget.releasePointerCapture(gesture.pointerId);
      } catch {
        // Ignore stale pointer capture state.
      }

      const resolvedOverCardId = activeDrag
        ? getSortableCardDropTargetId(
            layoutSnapshotRef.current,
            gesture.cardId,
            getActiveSortableCardRect(activeDrag, event.clientX, event.clientY)
          )
        : null;
      const overCardId =
        resolvedOverCardId ?? activeDrag?.overCardId ?? gesture.cardId;
      const fromIndex = cards.findIndex((card) => card.id === gesture.cardId);
      const toIndex = cards.findIndex((card) => card.id === overCardId);
      if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
        onReorder(reorderCards(cards, fromIndex, toIndex));
      }

      gestureRef.current = null;
      layoutSnapshotRef.current = null;
      setActiveDrag(null);
    },
    [activeDrag, cards, clearLongPressTimer, onReorder]
  );

  const handleClickCapture = useCallback((event: ReactMouseEvent) => {
    if (!suppressNextClickRef.current) {
      return;
    }
    suppressNextClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handlePointerCancel = useCallback(() => {
    resetGesture();
    suppressNextClickRef.current = false;
  }, [resetGesture]);

  useEffect(
    () => () => {
      clearLongPressTimer();
    },
    [clearLongPressTimer]
  );

  const previewCards = useMemo(() => {
    if (!activeDrag?.overCardId) {
      return cards;
    }

    const fromIndex = cards.findIndex((card) => card.id === activeDrag.cardId);
    const toIndex = cards.findIndex(
      (card) => card.id === activeDrag.overCardId
    );
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      return cards;
    }

    return reorderCards(cards, fromIndex, toIndex);
  }, [activeDrag?.cardId, activeDrag?.overCardId, cards]);

  const activeCard = useMemo(
    () =>
      activeDrag
        ? cards.find((card) => card.id === activeDrag.cardId)
        : undefined,
    [activeDrag?.cardId, cards]
  );

  return (
    <Fragment>
      <Box
        ref={gridRef}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 0.65,
          alignItems: 'start',
        }}
      >
        {previewCards.map((card) => {
          const isDragging = activeDrag?.cardId === card.id;

          return (
            <Box
              key={card.id}
              data-sortable-card-id={card.id}
              onPointerDown={(event) => handlePointerDown(card.id, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={(event) => {
                const gesture = gestureRef.current;
                if (
                  gesture &&
                  !gesture.isDragging &&
                  gesture.pointerId === event.pointerId
                ) {
                  resetGesture();
                }
              }}
              onClickCapture={handleClickCapture}
              onContextMenu={(event) => {
                if (isDragging || suppressNextClickRef.current) {
                  event.preventDefault();
                }
              }}
              sx={{
                position: 'relative',
                minWidth: 0,
                borderRadius: 1,
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: activeDrag ? 'none' : 'pan-y',
                userSelect: isDragging ? 'none' : 'auto',
                opacity: activeDrag && !isDragging ? 0.88 : 1,
                filter: activeDrag && !isDragging ? 'saturate(0.9)' : 'none',
                transition: 'opacity 150ms ease, filter 150ms ease',
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                },
              }}
            >
              {isDragging && activeDrag ? (
                <Box
                  sx={{
                    minHeight: Math.max(activeDrag.height, 96),
                    height: activeDrag.height,
                    borderRadius: 1,
                    border: '2px dashed rgba(245, 197, 66, 0.92)',
                    background:
                      'linear-gradient(135deg, rgba(245,197,66,0.18), rgba(245,197,66,0.06))',
                    boxShadow:
                      'inset 0 0 0 1px rgba(255,255,255,0.32), 0 0 0 4px rgba(245,197,66,0.12)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff2b8',
                    fontSize: 11,
                    fontWeight: 950,
                    lineHeight: 1.1,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                  }}
                >
                  여기에 놓기
                </Box>
              ) : (
                renderCard(card)
              )}
            </Box>
          );
        })}
      </Box>
      {activeDrag && activeCard ? (
        <Box
          sx={{
            position: 'fixed',
            left: activeDrag.pointerX - activeDrag.offsetX,
            top: activeDrag.pointerY - activeDrag.offsetY,
            width: activeDrag.width,
            zIndex: 2300,
            pointerEvents: 'none',
            cursor: 'grabbing',
            opacity: 0.98,
            transform: 'rotate(-1.5deg) scale(1.04)',
            transformOrigin: 'center',
            filter: 'drop-shadow(0 22px 30px rgba(0,0,0,0.46))',
            willChange: 'left, top, transform',
            '@media (prefers-reduced-motion: reduce)': {
              transform: 'none',
            },
          }}
        >
          {renderCard(activeCard)}
        </Box>
      ) : null}
    </Fragment>
  );
}

const EvidenceCardFace = ({
  card,
  dense = false,
  compactPreview = false,
  previewLineClamp,
  previewMaxLength = 52,
  cardMinHeight: cardMinHeightOverride,
  mediaHeight: mediaHeightOverride,
  highlightLabel,
  highlightTooltip,
  onOpen,
  showPublicRevealControl = false,
  publicRevealDisabled = false,
  onRevealPublicly,
}: {
  card: AnyClueCard;
  dense?: boolean;
  compactPreview?: boolean;
  previewLineClamp?: number;
  previewMaxLength?: number;
  cardMinHeight?: number;
  mediaHeight?: number;
  highlightLabel?: string;
  highlightTooltip?: string;
  onOpen: (card: AnyClueCard) => void;
  showPublicRevealControl?: boolean;
  publicRevealDisabled?: boolean;
  onRevealPublicly?: (cardId: string) => void;
}) => {
  const sourceDisplayText = getCardSourceDisplayText(card);
  const displayText = compactPreview
    ? getCompactCardPreviewText(card, previewMaxLength)
    : getDisplayCardText(card);
  const { isPublic, canRevealPublicly } = getClueVaultCardState(card);
  const canUsePublicRevealButton = canRevealPublicly && !publicRevealDisabled;
  const revealBlockedByCard = card.publicRevealDisabled === true;
  const revealButtonLabel = isPublic
    ? '공개됨'
    : revealBlockedByCard
      ? '반복조사 공개불가'
      : canRevealPublicly
        ? '전체공개하기'
        : '전체공개 불가';
  const mediaIsCompact = dense || compactPreview;
  const cardWidth = dense ? 112 : compactPreview ? '100%' : 174;
  const cardMinHeight =
    cardMinHeightOverride ?? (dense ? 146 : compactPreview ? 176 : 224);
  const mediaHeight = mediaHeightOverride ?? (mediaIsCompact ? 70 : 108);
  const previewClamp = previewLineClamp ?? (compactPreview ? 2 : 4);
  const showPreviewText = compactPreview || !dense;
  const shouldHighlight = Boolean(highlightLabel);

  return (
    <Stack spacing={0.8} sx={{ width: cardWidth, flex: '0 0 auto' }}>
      <Box
        component="button"
        type="button"
        onClick={() => onOpen(card)}
        sx={{
          border: 0,
          width: '100%',
          minHeight: cardMinHeight,
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
            minHeight: cardMinHeight,
            borderRadius: 1,
            overflow: 'hidden',
            backgroundColor: '#f8f1de',
            border: shouldHighlight
              ? '1px solid rgba(245, 197, 66, 0.96)'
              : '1px solid rgba(53, 43, 30, 0.35)',
            boxShadow: shouldHighlight
              ? '0 0 0 2px rgba(245,197,66,0.38), 0 0 0 7px rgba(245,197,66,0.16), 0 16px 34px rgba(0,0,0,0.36)'
              : '0 12px 24px rgba(0,0,0,0.28)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 140ms ease, box-shadow 140ms ease',
            transformOrigin: 'center',
            animation: shouldHighlight
              ? 'mmSpecialEventCardPulse 1800ms ease-out both'
              : 'none',
            '&:hover': {
              transform: 'translateY(-4px) rotate(-1deg)',
              boxShadow: shouldHighlight
                ? '0 0 0 2px rgba(245,197,66,0.5), 0 0 0 9px rgba(245,197,66,0.2), 0 20px 38px rgba(0,0,0,0.4)'
                : '0 18px 32px rgba(0,0,0,0.36)',
            },
            '@keyframes mmSpecialEventCardPulse': {
              '0%': {
                transform: 'scale(0.98)',
                boxShadow:
                  '0 0 0 0 rgba(245,197,66,0), 0 12px 24px rgba(0,0,0,0.28)',
              },
              '32%': {
                transform: 'scale(1.025)',
                boxShadow:
                  '0 0 0 4px rgba(245,197,66,0.46), 0 0 0 13px rgba(245,197,66,0.22), 0 18px 36px rgba(0,0,0,0.38)',
              },
              '100%': {
                transform: 'scale(1)',
                boxShadow:
                  '0 0 0 2px rgba(245,197,66,0.38), 0 0 0 7px rgba(245,197,66,0.16), 0 16px 34px rgba(0,0,0,0.36)',
              },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
        >
          {highlightLabel ? (
            <Tooltip title={highlightTooltip ?? highlightLabel}>
              <Stack
                direction="row"
                spacing={0.25}
                alignItems="center"
                sx={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  zIndex: 3,
                  maxWidth: 'calc(100% - 10px)',
                  px: 0.55,
                  py: 0.25,
                  borderRadius: 999,
                  backgroundColor: 'rgba(92, 55, 0, 0.92)',
                  color: '#fff7d6',
                  border: '1px solid rgba(255,255,255,0.38)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.34)',
                }}
              >
                <LockIcon sx={{ fontSize: 12, flex: '0 0 auto' }} />
                <Typography
                  variant="caption"
                  fontWeight={950}
                  sx={{
                    maxWidth: '100%',
                    fontSize: 10,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {highlightLabel}
                </Typography>
              </Stack>
            </Tooltip>
          ) : null}
          {card.imageSrc ? (
            <Box
              component="img"
              src={card.imageSrc}
              alt={card.imageAlt ?? sourceDisplayText}
              sx={{
                width: '100%',
                height: mediaHeight,
                objectFit: 'cover',
                backgroundColor: '#ddd3bb',
              }}
            />
          ) : (
            <TextOnlyClueMedia
              dense={mediaIsCompact}
              mediaHeight={mediaHeight}
            />
          )}
          <Stack
            spacing={compactPreview ? 0.35 : 0.55}
            sx={{ p: dense || compactPreview ? 0.9 : 1.2, flex: 1 }}
          >
            <Typography
              variant={dense || compactPreview ? 'caption' : 'body2'}
              fontWeight={900}
              sx={{
                color: '#2d2419',
                lineHeight: 1.25,
                wordBreak: 'keep-all',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
              {sourceDisplayText}
            </Typography>
            {showPreviewText ? (
              <Typography
                variant="caption"
                sx={{
                  color: '#514538',
                  lineHeight: compactPreview ? 1.35 : 1.45,
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: previewClamp,
                  overflow: 'hidden',
                }}
              >
                <RulebookRichText
                  text={displayText}
                  highlights={card.textHighlights}
                />
              </Typography>
            ) : null}
          </Stack>
        </Box>
      </Box>
      {showPublicRevealControl ? (
        <Button
          data-card-drag-excluded="true"
          size="small"
          variant="contained"
          color={isPublic ? 'success' : 'warning'}
          disabled={!canUsePublicRevealButton}
          onClick={() => onRevealPublicly?.(card.id)}
          sx={{
            minHeight: 30,
            minWidth: 0,
            maxWidth: '100%',
            px: compactPreview ? 0.7 : 1,
            fontSize: compactPreview ? 11 : undefined,
            lineHeight: 1.15,
            fontWeight: 900,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            '&.Mui-disabled': {
              color: isPublic
                ? '#e9ffe9'
                : revealBlockedByCard
                  ? 'rgba(95, 57, 24, 0.68)'
                  : 'rgba(45, 36, 25, 0.48)',
              backgroundColor: isPublic
                ? 'rgba(46, 125, 50, 0.82)'
                : revealBlockedByCard
                  ? 'rgba(245, 197, 66, 0.24)'
                  : 'rgba(45, 36, 25, 0.16)',
              boxShadow: 'none',
            },
          }}
        >
          {revealButtonLabel}
        </Button>
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
  const readStateHint = back.hasBeenRead ? READ_REPEAT_BACK_HINT : '';
  const actionTitle = disabled
    ? (disabledReason ?? '지금은 선택할 수 없습니다.')
    : isReserved
      ? '예약 해제'
      : canActNow
        ? '내 조사 차례입니다. 이 카드를 가져옵니다.'
        : '내 차례 전까지 이 카드를 예약합니다.';
  const tooltipTitle = readStateHint
    ? `${actionTitle} · ${readStateHint}`
    : actionTitle;
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
    <Tooltip title={tooltipTitle}>
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
          {back.hasBeenRead ? <ReadRepeatCornerMark size={10} /> : null}
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
        alt={back.shortLabel ?? back.targetLabel ?? CARD_BACK_LABEL}
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
        {back.shortLabel ?? back.targetLabel ?? CARD_BACK_LABEL}
      </Typography>
    </Stack>
  </Box>
);

const PlayerHeldCardBackStack = ({
  backs,
  isHighlighted,
}: {
  backs: MurderMysteryInvestigationBackCardView[];
  isHighlighted: boolean;
}) => {
  if (backs.length === 0) {
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
    </Stack>
  );
};

const getInvestigationProgressLabel = (
  progress?: InvestigationPlayerProgress | null
) => {
  if (!progress || progress.requiredCount <= 0) {
    return null;
  }
  return `이번 라운드 조사 ${progress.completedCount}/${progress.requiredCount} · 남은 ${progress.remainingCount}개`;
};

const getInvestigationProgressShortLabel = (
  progress?: InvestigationPlayerProgress | null
) => {
  if (!progress || progress.requiredCount <= 0) {
    return null;
  }
  return `이번 라운드 ${progress.completedCount}/${progress.requiredCount}`;
};

const InvestigationProgressTokens = ({
  progress,
}: {
  progress?: InvestigationPlayerProgress;
}) => {
  if (!progress || progress.requiredCount <= 0) {
    return null;
  }

  const completedCount = Math.min(
    Math.max(progress.completedCount, 0),
    progress.requiredCount
  );

  if (progress.requiredCount > MAX_VISIBLE_INVESTIGATION_PROGRESS_TOKENS) {
    return (
      <AnimatedProgressChip
        count={completedCount}
        size="small"
        aria-label={getInvestigationProgressLabel(progress) ?? undefined}
        label={`${completedCount}/${progress.requiredCount}`}
        sx={{
          mt: 0.25,
          height: 15,
          alignSelf: 'flex-start',
          backgroundColor: progress.isCurrent ? '#f5c542' : '#efe0bd',
          color: '#2a231a',
          fontSize: 9,
          fontWeight: 950,
          '& .MuiChip-label': { px: 0.5 },
        }}
      />
    );
  }

  return (
    <Stack
      component="span"
      direction="row"
      spacing={0.35}
      alignItems="center"
      aria-label={getInvestigationProgressLabel(progress) ?? undefined}
      sx={{ mt: 0.25, minHeight: 8 }}
    >
      {Array.from({ length: progress.requiredCount }, (_, index) => {
        const isCompleted = index < completedCount;
        return (
          <Box
            key={index}
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: isCompleted
                ? '#f5c542'
                : 'rgba(42, 35, 26, 0.22)',
              border: isCompleted
                ? '1px solid rgba(42,35,26,0.24)'
                : '1px solid rgba(42,35,26,0.18)',
              boxShadow:
                progress.isCurrent && !isCompleted
                  ? '0 0 0 2px rgba(245,197,66,0.16)'
                  : 'none',
            }}
          />
        );
      })}
    </Stack>
  );
};

const PlayerMarkerButton = ({
  player,
  isSelf,
  isClueTakeHighlighted,
  investigationProgress,
  roleReadingReady,
  turnOrderMarker,
  onSelect,
}: {
  player: MurderMysteryPublicPlayerView;
  isSelf: boolean;
  isClueTakeHighlighted: boolean;
  investigationProgress?: InvestigationPlayerProgress;
  roleReadingReady?: boolean;
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
  const roleReadingStateLabel =
    roleReadingReady === undefined
      ? null
      : roleReadingReady
        ? '룰지 확인됨'
        : '룰지 확인 전';
  const investigationProgressLabel = getInvestigationProgressLabel(
    investigationProgress
  );
  const isCurrentInvestigationPlayer =
    investigationProgress?.isCurrent === true;
  const hasInvestigationProgress = Boolean(investigationProgressLabel);
  const playerMarkerAriaLabel = [
    `${displayLabel} 플레이어 단서 열기`,
    roleReadingStateLabel,
    investigationProgressLabel,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Tooltip
      title={[
        displayLabel,
        connectionLabel,
        roleReadingStateLabel,
        investigationProgressLabel,
        `공개 ${player.publicRevealedClues.length}장`,
        `비공개 ${privateCardBacks.length}장`,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      <Box
        component="button"
        type="button"
        aria-label={playerMarkerAriaLabel}
        onClick={() => onSelect(player.id)}
        sx={{
          position: 'relative',
          width: { xs: 132, md: 148 },
          minWidth: { xs: 132, md: 148 },
          height: hasInvestigationProgress
            ? { xs: 61, md: 64 }
            : { xs: 50, md: 54 },
          display: 'flex',
          alignItems: 'center',
          gap: 0.65,
          px: 0.65,
          py: 0.45,
          borderRadius: 999,
          border: isCurrentInvestigationPlayer
            ? '2px solid rgba(245, 197, 66, 0.98)'
            : isSelf
              ? '2px solid rgba(251, 146, 60, 0.98)'
              : roleReadingReady
                ? '2px solid rgba(74, 222, 128, 0.92)'
                : isClueTakeHighlighted
                  ? '2px solid rgba(142, 202, 230, 0.98)'
                  : '1px solid rgba(255,255,255,0.28)',
          background: isSelf
            ? 'linear-gradient(180deg, rgba(255,245,216,1), rgba(251,214,132,0.98))'
            : 'linear-gradient(180deg, rgba(247,243,231,0.98), rgba(224,214,190,0.96))',
          color: '#2a231a',
          boxShadow: isCurrentInvestigationPlayer
            ? '0 0 0 4px rgba(245,197,66,0.24), 0 10px 24px rgba(0,0,0,0.34)'
            : isSelf
              ? '0 0 0 4px rgba(251,146,60,0.28), 0 12px 28px rgba(0,0,0,0.36)'
              : isClueTakeHighlighted
                ? '0 0 0 4px rgba(142,202,230,0.18), 0 8px 20px rgba(0,0,0,0.3)'
                : roleReadingReady
                  ? '0 0 0 3px rgba(74,222,128,0.16), 0 8px 20px rgba(0,0,0,0.28)'
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
          {roleReadingReady ? (
            <Box
              aria-label="룰지 확인됨"
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
                backgroundColor: '#2e7d32',
                color: '#f5fff8',
                boxShadow: '0 5px 12px rgba(0,0,0,0.28)',
              }}
            >
              <TaskAltIcon sx={{ fontSize: 13 }} />
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
            {isSelf ? (
              <Box
                component="span"
                sx={{
                  px: 0.55,
                  py: 0.12,
                  borderRadius: 999,
                  backgroundColor: '#ea580c',
                  color: '#fff7ed',
                  fontSize: 10,
                  fontWeight: 950,
                  lineHeight: 1.25,
                  boxShadow: '0 2px 5px rgba(124,45,18,0.28)',
                }}
              >
                나
              </Box>
            ) : (
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
                {player.name}
              </Typography>
            )}
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
            isHighlighted={isClueTakeHighlighted}
          />
          <InvestigationProgressTokens progress={investigationProgress} />
        </Box>
      </Box>
    </Tooltip>
  );
};

const RoleSelectionMarkerRail = ({
  players,
  sessionId,
  requiredPlayerCount,
}: {
  players: MurderMysteryStateSnapshot['roleSelection']['players'];
  sessionId: string;
  requiredPlayerCount: number;
}) => {
  const submittedCount = players.filter((player) => player.submitted).length;

  return (
    <Box
      aria-label="캐릭터 선택 제출 현황"
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
        spacing={1}
        alignItems="center"
        sx={{ minHeight: { xs: 50, md: 54 }, overflow: 'hidden' }}
      >
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{
            minWidth: 0,
            flex: 1,
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
          {players.map((player) => {
            const isSelf = player.playerId === sessionId;
            const submitted = player.submitted;

            return (
              <Tooltip
                key={player.playerId}
                title={`${player.playerName} · ${submitted ? '선택 제출 완료' : '선택 대기'}`}
              >
                <Box
                  aria-label={`${player.playerName} ${submitted ? '선택 제출 완료' : '선택 대기'}`}
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
        </Stack>
        <AnimatedProgressChip
          animateOnMount
          count={submittedCount}
          size="small"
          label={`선택 제출 ${submittedCount}/${requiredPlayerCount}`}
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
  investigationProgressByPlayerId,
  roleReadingReadyByPlayerId,
  turnOrderMarkers,
  onSelectPlayer,
}: {
  players: MurderMysteryPublicPlayerView[];
  sessionId: string;
  clueTakeHighlightPlayerId: string | null;
  investigationProgressByPlayerId?: Record<string, InvestigationPlayerProgress>;
  roleReadingReadyByPlayerId?: Record<string, boolean>;
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
          investigationProgress={investigationProgressByPlayerId?.[player.id]}
          roleReadingReady={roleReadingReadyByPlayerId?.[player.id]}
          turnOrderMarker={turnOrderMarkers[player.id]}
          onSelect={onSelectPlayer}
        />
      ))}
    </Stack>
  </Box>
);

const RolePublicCoverCard = ({
  cover,
  isSelectedChoice = false,
  isSubmittedChoice = false,
  showChoiceControl = true,
  showPreferenceSummary = true,
  preferredPlayerNames,
  assignedPlayerName,
  onChooseRole,
  onRequestShareRoleSheet,
}: {
  cover: RoleSelectionPublicCover;
  isSelectedChoice?: boolean;
  isSubmittedChoice?: boolean;
  showChoiceControl?: boolean;
  showPreferenceSummary?: boolean;
  preferredPlayerNames: string[];
  assignedPlayerName?: string;
  onChooseRole?: () => void;
  onRequestShareRoleSheet?: () => void;
}) => {
  const canChoose = Boolean(
    showChoiceControl && cover.selectable && onChooseRole
  );
  const canShareRoleSheet = Boolean(
    cover.selectable && onRequestShareRoleSheet
  );
  const shareDisplayName = getRoleShareDisplayName(cover.displayName);
  const preferredPlayerText =
    preferredPlayerNames.length > 0
      ? preferredPlayerNames.join(', ')
      : '아직 없음';
  const isNpcCover = !cover.selectable && !assignedPlayerName;
  const statusLabel = assignedPlayerName
    ? assignedPlayerName
    : isNpcCover
      ? 'NPC'
      : null;
  const handleChooseRole = () => {
    if (!canChoose || isSelectedChoice) {
      return;
    }
    onChooseRole?.();
  };

  return (
    <Box
      component={canChoose ? 'button' : 'div'}
      type={canChoose ? 'button' : undefined}
      aria-pressed={canChoose ? isSelectedChoice : undefined}
      aria-label={canChoose ? `${cover.displayName} 선택` : undefined}
      onClick={canChoose ? handleChooseRole : undefined}
      sx={{
        display: 'block',
        width: '100%',
        p: 1.1,
        borderRadius: 1.5,
        backgroundColor: isSelectedChoice
          ? 'rgba(245, 158, 11, 0.13)'
          : cover.selectable
            ? 'rgba(247,241,222,0.1)'
            : 'rgba(109, 90, 66, 0.2)',
        border: isSelectedChoice
          ? '1px solid rgba(245, 158, 11, 0.58)'
          : isSubmittedChoice
            ? '1px solid rgba(74, 222, 128, 0.34)'
            : cover.selectable
              ? '1px solid rgba(247,241,222,0.15)'
              : '1px dashed rgba(247,241,222,0.28)',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        ...(canChoose
          ? {
              appearance: 'none',
              cursor: isSelectedChoice ? 'default' : 'pointer',
              transition:
                'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease',
              '&:hover': isSelectedChoice
                ? {
                    borderColor: 'rgba(245, 158, 11, 0.7)',
                    backgroundColor: 'rgba(245, 158, 11, 0.16)',
                  }
                : {
                    borderColor: 'rgba(245, 197, 66, 0.58)',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.22)',
                    transform: 'translateY(-1px)',
                  },
              '&:focus-visible': {
                outline: '2px solid #f5c542',
                outlineOffset: 3,
                borderColor: 'rgba(245, 197, 66, 0.72)',
              },
            }
          : {}),
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
                      onClick={(event) => {
                        event.stopPropagation();
                        onRequestShareRoleSheet?.();
                      }}
                      sx={{
                        width: 28,
                        height: 28,
                        color: '#e8dec4',
                        backgroundColor: 'rgba(255, 255, 255, 0.07)',
                        border: '1px solid rgba(248, 241, 222, 0.2)',
                        '&:hover': {
                          color: '#fff6db',
                          backgroundColor: 'rgba(255, 167, 38, 0.18)',
                          borderColor: 'rgba(255, 183, 77, 0.42)',
                        },
                      }}
                    >
                      <IosShareIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                ) : null}
                {canChoose ? (
                  <Box
                    component="span"
                    aria-hidden
                    sx={{
                      width: 28,
                      height: 28,
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                      borderRadius: '50%',
                      color: isSelectedChoice ? '#f5c542' : '#d8d0bd',
                      backgroundColor: isSelectedChoice
                        ? 'rgba(245, 197, 66, 0.16)'
                        : 'rgba(248, 241, 222, 0.06)',
                      border: isSelectedChoice
                        ? '1px solid rgba(245, 197, 66, 0.42)'
                        : '1px solid rgba(248, 241, 222, 0.2)',
                    }}
                  >
                    {isSelectedChoice ? (
                      <RadioButtonCheckedIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />
                    )}
                  </Box>
                ) : null}
                {statusLabel ? (
                  <Chip
                    size="small"
                    label={statusLabel}
                    sx={{
                      height: 24,
                      color: isNpcCover ? '#f8f1de' : undefined,
                      fontWeight: 900,
                      backgroundColor: isNpcCover
                        ? 'rgba(148, 163, 184, 0.16)'
                        : undefined,
                      border: isNpcCover
                        ? '1px solid rgba(248, 241, 222, 0.22)'
                        : undefined,
                      '& .MuiChip-label': { px: 0.9 },
                    }}
                  />
                ) : null}
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
        {cover.selectable && (showPreferenceSummary || canChoose) ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={0.8}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            {showPreferenceSummary ? (
              <Typography
                variant="caption"
                sx={{ color: '#cfc5ad', fontWeight: 850, lineHeight: 1.45 }}
              >
                선택한 사람:{' '}
                <Box
                  component="span"
                  sx={{
                    color:
                      preferredPlayerNames.length > 0 ? '#f8f1de' : '#948a78',
                    fontWeight: 950,
                  }}
                >
                  {preferredPlayerText}
                </Box>
              </Typography>
            ) : (
              <Box sx={{ flex: 1 }} />
            )}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
};

const RoleSelectionPanel = ({
  roleSelection,
  onSubmitRolePreferences,
  canShareRoleSheets = false,
  onShareRoleSheet,
  title = '캐릭터 선택',
  description,
  allowRoleChoice = true,
}: {
  roleSelection: MurderMysteryStateSnapshot['roleSelection'];
  onSubmitRolePreferences: (roleIds: string[]) => void;
  canShareRoleSheets?: boolean;
  onShareRoleSheet: (roleId: string) => void;
  title?: string;
  description?: string;
  allowRoleChoice?: boolean;
}) => {
  const [shareConfirmCover, setShareConfirmCover] =
    useState<RoleSelectionPublicCover | null>(null);
  const [selectionConfirmCover, setSelectionConfirmCover] =
    useState<RoleSelectionPublicCover | null>(null);
  const roleById = new Map(roleSelection.roles.map((role) => [role.id, role]));
  const submittedRoleId = roleSelection.yourPreferenceRoleIds[0] ?? null;
  const hasSubmittedRolePreferences = Boolean(submittedRoleId);
  const submittedRole = submittedRoleId
    ? (roleById.get(submittedRoleId) ?? null)
    : null;
  const playerNameById = new Map(
    roleSelection.players.map((player) => [player.playerId, player.playerName])
  );
  const getPreferredPlayerNames = (cover: RoleSelectionPublicCover) =>
    cover.preferredPlayerIds.flatMap((playerId) => {
      const playerName = playerNameById.get(playerId);
      return playerName ? [playerName] : [];
    });
  const shareConfirmDisplayName = shareConfirmCover
    ? getRoleShareDisplayName(shareConfirmCover.displayName)
    : '';
  const selectionConfirmDisplayName = selectionConfirmCover?.displayName ?? '';

  const closeShareConfirm = () => setShareConfirmCover(null);
  const confirmShareRoleSheet = () => {
    if (shareConfirmCover) {
      onShareRoleSheet(shareConfirmCover.id);
    }
  };
  const closeSelectionConfirm = () => setSelectionConfirmCover(null);
  const confirmRoleSelection = () => {
    if (selectionConfirmCover) {
      onSubmitRolePreferences([selectionConfirmCover.id]);
    }
    closeSelectionConfirm();
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
              <Typography fontWeight={950}>{title}</Typography>
              {description ? (
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 0.25, color: '#d8d0bd' }}
                >
                  {description}
                </Typography>
              ) : null}
            </Box>
            {roleSelection.status === 'locked' ? (
              <Chip
                color="success"
                label="배정 완료"
                sx={{ flex: '0 0 auto', fontWeight: 900 }}
              />
            ) : null}
          </Stack>

          {roleSelection.status === 'locked' ? (
            <Stack spacing={1}>
              {roleSelection.publicCovers.map((cover) => (
                <RolePublicCoverCard
                  key={cover.id}
                  cover={cover}
                  preferredPlayerNames={getPreferredPlayerNames(cover)}
                  assignedPlayerName={
                    cover.assignedPlayerId
                      ? (playerNameById.get(cover.assignedPlayerId) ?? '배정됨')
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
              <Stack spacing={1}>
                {roleSelection.publicCovers.map((cover) => (
                  <RolePublicCoverCard
                    key={cover.id}
                    cover={cover}
                    isSelectedChoice={submittedRoleId === cover.id}
                    isSubmittedChoice={submittedRoleId === cover.id}
                    showChoiceControl={allowRoleChoice}
                    showPreferenceSummary={allowRoleChoice}
                    preferredPlayerNames={getPreferredPlayerNames(cover)}
                    onChooseRole={
                      allowRoleChoice && cover.selectable
                        ? () => setSelectionConfirmCover(cover)
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
        open={Boolean(selectionConfirmCover)}
        onClose={closeSelectionConfirm}
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
                color: '#12221a',
                backgroundColor: '#86efac',
              }}
            >
              <TaskAltIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={950} sx={{ lineHeight: 1.25 }}>
                캐릭터 선택 확인
              </Typography>
              <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
                방장 확정 전까지 다시 바꿀 수 있습니다.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: 2.2, pb: 1 }}>
          {selectionConfirmCover ? (
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
                    src={selectionConfirmCover.portraitSrc}
                    alt={selectionConfirmCover.portraitAlt}
                    label={selectionConfirmCover.displayName}
                    variant="thumbnail"
                    sx={{ width: 54 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={950}>
                      {selectionConfirmDisplayName}
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
                      {selectionConfirmCover.publicText}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Typography sx={{ lineHeight: 1.7, wordBreak: 'keep-all' }}>
                <Box
                  component="span"
                  sx={{ color: '#fff6db', fontWeight: 950 }}
                >
                  {selectionConfirmDisplayName}
                </Box>{' '}
                선택을 제출하시겠습니까?
              </Typography>
              {submittedRole &&
              submittedRole.id !== selectionConfirmCover.id ? (
                <Typography
                  variant="caption"
                  sx={{ color: '#ffcf6a', lineHeight: 1.6, fontWeight: 900 }}
                >
                  현재는 {getRoleSelectionShortName(submittedRole.displayName)}
                  입니다. 방장 확정 전까지 다시 바꿀 수 있습니다.
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2.2, pb: 2, gap: 0.8 }}>
          <Button onClick={closeSelectionConfirm} sx={{ color: '#e8dec4' }}>
            취소
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<TaskAltIcon />}
            disabled={!selectionConfirmCover}
            onClick={confirmRoleSelection}
            sx={{ fontWeight: 900 }}
          >
            {hasSubmittedRolePreferences ? '변경 제출' : '선택 제출'}
          </Button>
        </DialogActions>
      </Dialog>

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
                참가자에게 보낼 캐릭터 룰지를 확인하세요.
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
                {shareConfirmDisplayName}의 룰지를 참가자에게 공유하시겠습니까?
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: '#cfc5ad', lineHeight: 1.6 }}
              >
                공유 링크에는 프롤로그, 캐릭터 룰지, 기본 규칙, 맵이 포함됩니다.
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

const RoleReadingAssignedCard = ({
  roleSheet,
  isLifted = false,
  onOpenRulebook,
}: {
  roleSheet: MurderMysteryRoleSheetView | null;
  isLifted?: boolean;
  onOpenRulebook: () => void;
}) => (
  <Box
    sx={{
      flex: '1 1 auto',
      minHeight: { xs: 0, sm: 0 },
      display: 'grid',
      placeItems: 'stretch center',
      perspective: 1500,
      px: { xs: 0, sm: 1.4 },
      py: { xs: 0.2, sm: 0.7 },
    }}
  >
    <Tooltip title="인물 설정서 읽기">
      <Box
        component="button"
        type="button"
        disabled={!roleSheet}
        aria-label={
          roleSheet
            ? `${roleSheet.displayName} 인물 설정서 읽기`
            : '인물 설정서 읽기'
        }
        onClick={onOpenRulebook}
        sx={{
          position: 'relative',
          width: { xs: 'min(100%, 400px)', sm: 440 },
          height: '100%',
          minHeight: { xs: 420, sm: 560 },
          maxHeight: '100%',
          p: 0,
          border: 0,
          borderRadius: 2.1,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
          textAlign: 'left',
          cursor: roleSheet ? 'pointer' : 'default',
          transformStyle: 'preserve-3d',
          userSelect: 'none',
          outline: 'none',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: { xs: -10, sm: -12 },
            bottom: { xs: -9, sm: -11 },
            height: { xs: 10, sm: 12 },
            zIndex: 1,
            borderRadius: '0 0 9px 9px',
            background:
              'repeating-linear-gradient(180deg, rgba(76,54,28,0.5) 0 1px, rgba(255,247,222,0.9) 1px 3px, rgba(219,195,145,0.78) 3px 4px)',
            boxShadow:
              '0 11px 17px rgba(0,0,0,0.22), inset 0 2px 4px rgba(89,61,30,0.2)',
            transform: isLifted
              ? 'translateZ(-24px) skewX(-2.4deg)'
              : 'translateZ(-18px) skewX(-1.8deg)',
            transformOrigin: 'left center',
            transition: 'transform 180ms ease, box-shadow 180ms ease',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: { xs: 1, sm: 2 },
            right: { xs: -10, sm: -12 },
            bottom: { xs: -9, sm: -11 },
            width: { xs: 10, sm: 12 },
            zIndex: 1,
            borderRadius: '0 8px 8px 0',
            background:
              'repeating-linear-gradient(90deg, rgba(78,56,29,0.54) 0 1px, rgba(255,247,222,0.92) 1px 3px, rgba(216,191,141,0.8) 3px 4px)',
            boxShadow: '5px 10px 16px rgba(0,0,0,0.16)',
            transform: 'translateZ(-16px) skewY(-0.2deg)',
          },
          '&:hover .role-reading-book-cover':
            roleSheet && !isLifted
              ? {
                  transform:
                    'rotateX(1deg) rotateY(-10deg) translate3d(4px, -5px, 24px)',
                  boxShadow:
                    '0 38px 82px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.32)',
                }
              : undefined,
          '&:hover .role-reading-book-hint': roleSheet
            ? {
                transform: 'translateY(-2px)',
                backgroundColor: 'rgba(245, 158, 11, 0.96)',
                color: '#241706',
              }
            : undefined,
          '&:hover::before': roleSheet
            ? {
                transform: 'translateZ(-24px) skewX(-2.4deg)',
                boxShadow:
                  '0 13px 19px rgba(0,0,0,0.25), inset 0 2px 4px rgba(89,61,30,0.22)',
              }
            : undefined,
          '&:active .role-reading-book-cover':
            roleSheet && !isLifted
              ? {
                  transform:
                    'rotateX(2deg) rotateY(-18deg) translate3d(6px, -5px, 30px)',
                }
              : undefined,
          '& .role-reading-book-inner-page': {
            opacity: isLifted ? 1 : 0,
          },
          '& .role-reading-book-hint': {
            opacity: isLifted ? 0 : 1,
          },
          '&:focus-visible': {
            boxShadow: '0 0 0 3px rgba(245,197,66,0.72)',
          },
          '&:disabled': {
            opacity: 0.74,
          },
        }}
      >
        <Box
          className="role-reading-book-page-far"
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: 3, sm: 4 },
            left: 0,
            right: { xs: -10, sm: -12 },
            bottom: { xs: -10, sm: -12 },
            zIndex: 0,
            borderRadius: 2,
            pointerEvents: 'none',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: { xs: 2, sm: 2 },
              borderRadius: '0 7px 7px 0',
              backgroundColor: 'rgba(204, 176, 123, 0.92)',
              borderRight: '1px solid rgba(62, 45, 24, 0.48)',
              boxShadow: 'inset 1px 0 2px rgba(255,255,255,0.36)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: { xs: 2, sm: 2 },
              borderRadius: '0 0 7px 7px',
              backgroundColor: 'rgba(204, 176, 123, 0.92)',
              borderBottom: '1px solid rgba(62, 45, 24, 0.5)',
              transform: 'skewX(-1deg)',
              transformOrigin: 'left center',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.32)',
            },
            transform: isLifted
              ? 'translateZ(-58px) skewY(-0.28deg)'
              : 'translateZ(-48px) skewY(-0.18deg)',
            transformOrigin: 'left center',
            transition: 'transform 180ms ease',
          }}
        />
        <Box
          className="role-reading-book-page-deep"
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: 2, sm: 3 },
            left: 0,
            right: { xs: -8, sm: -10 },
            bottom: { xs: -8, sm: -10 },
            zIndex: 1,
            borderRadius: 2,
            pointerEvents: 'none',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: { xs: 2, sm: 2 },
              borderRadius: '0 7px 7px 0',
              backgroundColor: 'rgba(219, 194, 144, 0.95)',
              borderRight: '1px solid rgba(70, 50, 26, 0.5)',
              boxShadow: 'inset 1px 0 2px rgba(255,255,255,0.36)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: { xs: 2, sm: 2 },
              borderRadius: '0 0 7px 7px',
              backgroundColor: 'rgba(219, 194, 144, 0.95)',
              borderBottom: '1px solid rgba(70, 50, 26, 0.52)',
              transform: 'skewX(-0.8deg)',
              transformOrigin: 'left center',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.34)',
            },
            transform: isLifted
              ? 'translateZ(-46px) skewY(-0.24deg)'
              : 'translateZ(-36px) skewY(-0.14deg)',
            transformOrigin: 'left center',
            transition: 'transform 180ms ease',
          }}
        />
        <Box
          className="role-reading-book-page-middle"
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: 1, sm: 2 },
            left: 0,
            right: { xs: -6, sm: -8 },
            bottom: { xs: -6, sm: -8 },
            zIndex: 2,
            borderRadius: 2,
            pointerEvents: 'none',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: { xs: 2, sm: 2 },
              borderRadius: '0 7px 7px 0',
              backgroundColor: 'rgba(234, 213, 166, 0.96)',
              borderRight: '1px solid rgba(78, 56, 29, 0.5)',
              boxShadow: 'inset 1px 0 2px rgba(255,255,255,0.38)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: { xs: 2, sm: 2 },
              borderRadius: '0 0 7px 7px',
              backgroundColor: 'rgba(234, 213, 166, 0.96)',
              borderBottom: '1px solid rgba(78, 56, 29, 0.52)',
              transform: 'skewX(-0.6deg)',
              transformOrigin: 'left center',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.36)',
            },
            transform: isLifted
              ? 'translateZ(-30px) skewY(-0.2deg)'
              : 'translateZ(-24px) skewY(-0.1deg)',
            transformOrigin: 'left center',
            transition: 'transform 180ms ease',
          }}
        />
        <Box
          className="role-reading-book-hint"
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: 12, sm: 18 },
            right: { xs: 10, sm: 16 },
            zIndex: 5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.45,
            px: { xs: 0.95, sm: 1.1 },
            py: { xs: 0.55, sm: 0.65 },
            borderRadius: 999,
            backgroundColor: 'rgba(35, 25, 14, 0.86)',
            color: '#fff7dc',
            border: '1px solid rgba(255, 247, 220, 0.5)',
            boxShadow: '0 10px 22px rgba(0,0,0,0.3)',
            fontSize: { xs: 12, sm: 13 },
            fontWeight: 950,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            transition:
              'opacity 120ms ease, transform 170ms ease, background-color 170ms ease, color 170ms ease',
          }}
        >
          <AutoStoriesIcon sx={{ fontSize: { xs: 15, sm: 16 } }} />
          인물 설정서 읽기
          <ChevronRightIcon sx={{ fontSize: { xs: 15, sm: 16 } }} />
        </Box>
        <Box
          className="role-reading-book-inner-page"
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            borderRadius: 1.2,
            overflow: 'hidden',
            pointerEvents: 'none',
            background:
              'linear-gradient(90deg, rgba(88, 62, 31, 0.16) 0 10px, rgba(255,255,255,0.1) 10px 13px, transparent 13px), linear-gradient(155deg, #ded0b4 0%, #fff1d4 48%, #d1be94 100%)',
            border: '1px solid rgba(75, 58, 37, 0.22)',
            boxShadow:
              'inset 0 0 0 1px rgba(255,255,255,0.5), inset -10px 0 18px rgba(90,64,32,0.12)',
            transition: 'opacity 90ms ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: { xs: 14, sm: 20 },
              border: '1px solid rgba(72, 51, 32, 0.2)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background:
                'repeating-linear-gradient(0deg, rgba(55, 39, 21, 0.035) 0 1px, transparent 1px 9px), repeating-linear-gradient(90deg, rgba(55, 39, 21, 0.022) 0 1px, transparent 1px 13px)',
            },
          }}
        />
        <Box
          className="role-reading-book-cover"
          sx={{
            position: 'relative',
            zIndex: 4,
            height: '100%',
            transformOrigin: 'left center',
            backfaceVisibility: 'hidden',
            transform: isLifted
              ? 'rotateX(2deg) rotateY(-42deg) translate3d(10px, -6px, 42px)'
              : 'none',
            transition:
              'transform 180ms cubic-bezier(0.2, 0.76, 0.24, 1), box-shadow 160ms ease',
          }}
        >
          <CharacterBookCover
            displayName={roleSheet?.displayName ?? '캐릭터 확인 전'}
            publicText={
              roleSheet?.publicText ??
              '배정이 완료되면 이곳에 캐릭터 공개 정보가 표시됩니다.'
            }
            portraitSrc={roleSheet?.portraitSrc}
            portraitAlt={roleSheet?.portraitAlt}
            sx={{
              height: '100%',
              minHeight: { xs: 420, sm: 560 },
              boxShadow:
                'inset 0 0 0 1px rgba(255,255,255,0.5), 0 30px 68px rgba(0,0,0,0.36)',
            }}
          />
        </Box>
      </Box>
    </Tooltip>
  </Box>
);

const MyDeskPanel = ({
  cardCount,
  publicScriptCount,
  canOpenRulebook = true,
  canOpenPublicScripts = true,
  canOpenPrivateCards = true,
  onOpenRulebook,
  onOpenPublicScripts,
  onOpenPrivateCards,
  compact = false,
}: {
  cardCount: number;
  publicScriptCount: number;
  canOpenRulebook?: boolean;
  canOpenPublicScripts?: boolean;
  canOpenPrivateCards?: boolean;
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
          disabled={!canOpenPrivateCards}
          onClick={canOpenPrivateCards ? onOpenPrivateCards : undefined}
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
  mapScene,
  fullScreen,
  specialEvents,
  onReportSpecialEvent,
  onClose,
}: {
  open: boolean;
  roleSheet: MurderMysteryRoleSheetView | null;
  introText: string;
  mapScene?: MurderMysteryInvestigationMapSceneScenario | null;
  fullScreen: boolean;
  specialEvents: MurderMysteryReportableSpecialEventView[];
  onReportSpecialEvent: (
    eventId: string,
    outcome: MurderMysterySpecialEventOutcome
  ) => void;
  onClose: () => void;
}) => {
  const readerPageHeight = {
    xs: fullScreen ? 'calc(100svh - 12px)' : 700,
    sm: 820,
  };

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
          position: 'relative',
          overflow: 'hidden',
          p: fullScreen ? { xs: 0.75, sm: 1.2 } : { xs: 1.2, sm: 2.2 },
          background:
            'linear-gradient(145deg, #201b18 0%, #3f3226 48%, #171c23 100%)',
          color: '#f7f0df',
        }}
      >
        {!fullScreen ? (
          <IconButton
            aria-label="룰북 닫기"
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 20,
              color: '#f7f0df',
              backgroundColor: 'rgba(24,19,16,0.58)',
              '&:hover': { backgroundColor: 'rgba(24,19,16,0.78)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        ) : null}
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
          controlsMode="overlay"
          includePrologue={false}
          includeRolebookCover={false}
          showPageStatusFooter={false}
          mapContent={
            mapScene ? (
              <MurderMysteryInvestigationMapViewer
                scene={mapScene}
                pins={[]}
                sx={{
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 2,
                  boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
                }}
              />
            ) : null
          }
          pageSx={{
            height: readerPageHeight,
          }}
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
            ? '정말 여우 조희수가 먼저 "한다정이 범인일 수 있다"는 취지로 한다정을 범인 후보에 올렸나요?'
            : '정말 여우가 아니라 다른 사람이 먼저 한다정 범인 가능성을 제기했나요? 이 카드는 더 이상 공개되지 않습니다.'}
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
          {isReveal ? '맞습니다, 공개합니다' : '맞습니다, 폐기합니다'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const getPublicScriptTabLabel = (label: string) => {
  const normalized = label.trim().replace(/\s+/g, ' ');
  const roundMatch = normalized.match(/^(\d+)\s*라운드\s*(.*)$/);
  if (!roundMatch) {
    return normalized.replace(/\s*지문$/, '').replace(/낭독문$/, '낭독');
  }

  const round = roundMatch[1];
  const suffix = roundMatch[2]
    .replace(/조사\s*전\s*지문/g, '조사전')
    .replace(/\s*지문$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return suffix ? `${round}R ${suffix}` : `${round}R`;
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
}) => {
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const selectedScript =
    scripts.find((script) => script.stepId === selectedScriptId) ??
    scripts.find((script) => script.current) ??
    scripts[0] ??
    null;

  useEffect(() => {
    if (!open) {
      setSelectedScriptId(null);
      return;
    }
    setSelectedScriptId((current) =>
      current && scripts.some((script) => script.stepId === current)
        ? current
        : (scripts.find((script) => script.current)?.stepId ??
          scripts[0]?.stepId ??
          null)
    );
  }, [open, scripts]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          overflow: 'hidden',
        },
      }}
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
          display: 'flex',
          flexDirection: 'column',
          gap: 1.2,
          minHeight: 0,
          maxHeight: fullScreen ? 'none' : 'min(72vh, 720px)',
          overflow: 'hidden',
        }}
      >
        {scripts.length > 0 && selectedScript ? (
          <>
            <Box
              sx={{
                flex: '0 0 auto',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.14)',
                backgroundColor: 'rgba(11, 15, 20, 0.94)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.24)',
                overflow: 'hidden',
              }}
            >
              <Tabs
                value={selectedScript.stepId}
                onChange={(_, nextStepId: string) =>
                  setSelectedScriptId(nextStepId)
                }
                variant="fullWidth"
                TabIndicatorProps={{ style: { display: 'none' } }}
                sx={{
                  p: 0.65,
                  minHeight: 48,
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: 'rgba(255,255,255,0.045)',
                  '& .MuiTabs-flexContainer': {
                    gap: 0.75,
                  },
                  '& .MuiTab-root': {
                    minWidth: 0,
                    minHeight: 36,
                    px: { xs: 0.4, sm: 1 },
                    borderRadius: 1.4,
                    color: '#cfc5ad',
                    fontWeight: 950,
                    fontSize: { xs: 13, sm: 14 },
                    textTransform: 'none',
                    border: '1px solid transparent',
                  },
                  '& .MuiTab-root.Mui-selected': {
                    color: '#231604',
                    backgroundColor: '#f5c542',
                    borderColor: 'rgba(255,246,219,0.36)',
                    boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
                  },
                  '& .MuiTabs-scrollButtons': {
                    color: '#f7f0df',
                  },
                }}
              >
                {scripts.map((script) => (
                  <Tab
                    key={script.stepId}
                    value={script.stepId}
                    label={getPublicScriptTabLabel(script.label)}
                    aria-label={script.label}
                    title={script.label}
                    id={`public-script-tab-${script.stepId}`}
                    aria-controls={`public-script-panel-${script.stepId}`}
                  />
                ))}
              </Tabs>
            </Box>

            <Box
              role="tabpanel"
              id={`public-script-panel-${selectedScript.stepId}`}
              aria-labelledby={`public-script-tab-${selectedScript.stepId}`}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                p: { xs: 1.2, md: 1.6 },
                pr: { xs: 1.7, md: 2.1 },
                borderRadius: 2,
                border: selectedScript.current
                  ? '1px solid rgba(245, 197, 66, 0.82)'
                  : '1px solid rgba(255,255,255,0.14)',
                backgroundColor: selectedScript.current
                  ? 'rgba(245, 197, 66, 0.1)'
                  : 'rgba(255,255,255,0.06)',
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(248,241,222,0.24)',
                  borderRadius: 999,
                },
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={950} sx={{ flex: 1 }}>
                    {selectedScript.label}
                  </Typography>
                  <Chip
                    size="small"
                    color={selectedScript.current ? 'warning' : 'default'}
                    label={selectedScript.current ? '현재 단계' : '공개됨'}
                  />
                </Stack>
                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.78 }}>
                  {selectedScript.readAloud}
                </Typography>
              </Stack>
            </Box>
          </>
        ) : (
          <Typography sx={{ color: '#d8d0bd' }}>
            아직 다시 읽을 수 있는 공개 낭독문이 없습니다.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

const FlowOverviewDialog = ({
  open,
  snapshot,
  fullScreen,
  onClose,
}: {
  open: boolean;
  snapshot: MurderMysteryStateSnapshot;
  fullScreen: boolean;
  onClose: () => void;
}) => {
  const currentPhaseIndex = snapshot.phaseOrder.indexOf(snapshot.phase);
  const roundStatsByRound = new Map<
    number,
    {
      perPlayer: number;
      totalInvestigations: number | null;
      cardPoolCount: number;
      additionalCardPoolCount: number;
    }
  >();
  const seenCardIds = new Set<string>();

  [...snapshot.scenario.investigations.rounds]
    .sort((a, b) => a.round - b.round)
    .forEach((roundConfig) => {
      const cardIds = getRoundCardPoolIds(roundConfig);
      const additionalCardIds = cardIds.filter(
        (cardId) => !seenCardIds.has(cardId)
      );
      cardIds.forEach((cardId) => seenCardIds.add(cardId));

      const perPlayer =
        roundConfig.investigationsPerPlayer ??
        snapshot.scenario.rules.investigationsPerRound;
      roundStatsByRound.set(roundConfig.round, {
        perPlayer,
        totalInvestigations:
          snapshot.players.length > 0
            ? perPlayer * snapshot.players.length
            : null,
        cardPoolCount: cardIds.length,
        additionalCardPoolCount: additionalCardIds.length,
      });
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      PaperProps={{ sx: { overflow: 'hidden' } }}
    >
      <DialogTitle
        sx={{
          backgroundColor: '#211b17',
          color: '#f7f0df',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <TimelineIcon />
          <Typography fontWeight={950} sx={{ flex: 1 }}>
            전체 진행표
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#f7f0df' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent
        sx={{
          p: { xs: 1.25, sm: 1.8 },
          background:
            'linear-gradient(145deg, #201b18 0%, #302924 48%, #151b21 100%)',
          color: '#f7f0df',
          maxHeight: fullScreen ? 'none' : 'min(76vh, 760px)',
          overflowY: 'auto',
        }}
      >
        <Stack spacing={1}>
          <Box
            sx={{
              p: { xs: 1, sm: 1.15 },
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.14)',
              backgroundColor: 'rgba(255,255,255,0.065)',
            }}
          >
            <Stack spacing={0.85}>
              <Typography
                variant="caption"
                sx={{
                  color: '#d8d0bd',
                  fontWeight: 850,
                  lineHeight: 1.5,
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                }}
              >
                타이머는 단계 운영 시간이고, 실제 이동 방식은 진행 방식 칩으로
                구분됩니다.
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={0.9}
                flexWrap="wrap"
                useFlexGap
              >
                {(
                  [
                    'timer_auto',
                    'completion_auto',
                    'host_action',
                  ] as FlowAdvanceMode[]
                ).map((mode) => {
                  const meta = FLOW_ADVANCE_MODE_META[mode];

                  return (
                    <Stack
                      key={mode}
                      direction="row"
                      spacing={0.65}
                      alignItems="center"
                      sx={{
                        minWidth: { xs: '100%', sm: 0 },
                        flex: { xs: '1 1 auto', sm: '1 1 190px' },
                      }}
                    >
                      <FlowAdvanceModeChip mode={mode} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#cfc5ad',
                          lineHeight: 1.45,
                          wordBreak: 'keep-all',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {meta.description}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </Stack>
          </Box>

          {snapshot.scenario.flow.steps.map((step, index) => {
            const stepPhaseIndex = snapshot.phaseOrder.indexOf(step.id);
            const isCurrent = step.id === snapshot.phase;
            const isCompleted =
              !isCurrent &&
              stepPhaseIndex >= 0 &&
              currentPhaseIndex >= 0 &&
              stepPhaseIndex < currentPhaseIndex;
            const roundStats =
              step.kind === 'investigate' && step.round
                ? roundStatsByRound.get(step.round)
                : null;
            const durationSec =
              typeof step.durationSec === 'number'
                ? step.durationSec
                : step.kind === 'presentation'
                  ? snapshot.presentation.durationSec
                  : null;
            const advanceMode = getFlowAdvanceMode(step, snapshot, durationSec);
            const advanceDescription = getFlowAdvanceStepDescription(
              advanceMode,
              step.kind
            );

            return (
              <Box
                key={step.id}
                sx={{
                  p: { xs: 1, sm: 1.15 },
                  borderRadius: 2,
                  border: isCurrent
                    ? '1px solid rgba(245, 197, 66, 0.72)'
                    : '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: isCurrent
                    ? 'rgba(245, 197, 66, 0.12)'
                    : isCompleted
                      ? 'rgba(74, 222, 128, 0.08)'
                      : 'rgba(255,255,255,0.055)',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ minWidth: 0, flex: 1 }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        flex: '0 0 auto',
                        backgroundColor: isCurrent
                          ? '#f5c542'
                          : isCompleted
                            ? '#4ade80'
                            : 'rgba(255,255,255,0.12)',
                        color: isCurrent || isCompleted ? '#1e1607' : '#f7f0df',
                        fontWeight: 950,
                      }}
                    >
                      {isCompleted ? (
                        <TaskAltIcon sx={{ fontSize: 18 }} />
                      ) : isCurrent ? (
                        <RadioButtonCheckedIcon sx={{ fontSize: 18 }} />
                      ) : (
                        index + 1
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={0.6}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Typography fontWeight={950}>{step.label}</Typography>
                        <Chip
                          size="small"
                          label={getStepKindLabel(step.kind)}
                          color={isCurrent ? 'warning' : 'default'}
                          variant={isCurrent ? 'filled' : 'outlined'}
                          sx={{
                            height: 22,
                            color: isCurrent ? undefined : '#f7f0df',
                            borderColor: isCurrent
                              ? undefined
                              : 'rgba(255,255,255,0.26)',
                            fontWeight: 900,
                          }}
                        />
                        {durationSec !== null ? (
                          <Chip
                            size="small"
                            icon={<TimerIcon />}
                            label={formatSeconds(durationSec)}
                            variant="outlined"
                            sx={{
                              height: 22,
                              color: '#f7f0df',
                              borderColor: 'rgba(255,255,255,0.26)',
                              fontWeight: 900,
                              '& .MuiChip-icon': { color: '#f5c542' },
                            }}
                          />
                        ) : null}
                        <FlowAdvanceModeChip
                          mode={advanceMode}
                          title={advanceDescription}
                        />
                      </Stack>
                    </Box>
                  </Stack>

                  {roundStats ? (
                    <Stack
                      direction="row"
                      spacing={0.6}
                      justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        size="small"
                        label={`1인 ${roundStats.perPlayer}회`}
                        sx={{ fontWeight: 900 }}
                      />
                      {roundStats.totalInvestigations !== null ? (
                        <Chip
                          size="small"
                          label={`총 ${roundStats.totalInvestigations}회`}
                          sx={{ fontWeight: 900 }}
                        />
                      ) : null}
                      <Chip
                        size="small"
                        color={step.round === 1 ? 'warning' : 'default'}
                        label={
                          step.round === 1
                            ? `1라운드 단서 풀 ${roundStats.cardPoolCount}장`
                            : `${step.round}라운드 추가 단서 풀 ${roundStats.additionalCardPoolCount}장`
                        }
                        sx={{ fontWeight: 900 }}
                      />
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

const NotificationLogDialog = ({
  open,
  announcements,
  fullScreen,
  onClose,
}: {
  open: boolean;
  announcements: MurderMysteryStateSnapshot['announcements'];
  fullScreen: boolean;
  onClose: () => void;
}) => {
  const orderedAnnouncements = [...announcements].sort((a, b) => b.at - a.at);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      PaperProps={{ sx: { overflow: 'hidden' } }}
    >
      <DialogTitle
        sx={{
          backgroundColor: '#211b17',
          color: '#f7f0df',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <NotificationsIcon />
          <Typography fontWeight={950} sx={{ flex: 1 }}>
            알림
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#f7f0df' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent
        sx={{
          p: { xs: 1.25, sm: 1.8 },
          background:
            'linear-gradient(145deg, #201b18 0%, #302924 48%, #151b21 100%)',
          color: '#f7f0df',
          maxHeight: fullScreen ? 'none' : 'min(72vh, 680px)',
          overflowY: 'auto',
        }}
      >
        {orderedAnnouncements.length > 0 ? (
          <Stack spacing={0.9}>
            {orderedAnnouncements.map((announcement) => (
              <Box
                key={announcement.id}
                sx={{
                  p: 1.1,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Stack spacing={0.55}>
                  <Stack
                    direction="row"
                    spacing={0.7}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Chip
                      size="small"
                      label={getAnnouncementTypeLabel(announcement.type)}
                      color={
                        announcement.type === 'SYSTEM'
                          ? 'warning'
                          : announcement.type === 'CLUE'
                            ? 'info'
                            : 'default'
                      }
                      sx={{ height: 22, fontWeight: 900 }}
                    />
                    <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
                      {formatAnnouncementTime(announcement.at)}
                    </Typography>
                  </Stack>
                  <Typography sx={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                    {announcement.text}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography sx={{ color: '#d8d0bd' }}>
            아직 기록된 알림이 없습니다.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

const SettingsDialog = ({
  open,
  playerName,
  bgmTrack,
  fullScreen,
  onLeaveRoom,
  onClose,
}: {
  open: boolean;
  playerName: string;
  bgmTrack: BgmTrack | null;
  fullScreen: boolean;
  onLeaveRoom: () => void;
  onClose: () => void;
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="xs"
    fullScreen={fullScreen}
    keepMounted
  >
    <DialogTitle
      sx={{
        backgroundColor: '#211b17',
        color: '#f7f0df',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <SettingsIcon />
        <Typography fontWeight={950} sx={{ flex: 1 }}>
          설정
        </Typography>
        <IconButton onClick={onClose} sx={{ color: '#f7f0df' }}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </DialogTitle>
    <DialogContent
      sx={{
        p: { xs: 1.4, sm: 1.8 },
        background:
          'linear-gradient(145deg, #201b18 0%, #302924 48%, #151b21 100%)',
        color: '#f7f0df',
      }}
    >
      <Stack spacing={1.2}>
        <Box
          sx={{
            p: 1.2,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <AccountCircleIcon sx={{ color: '#f5c542' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
                접속 이름
              </Typography>
              <Typography fontWeight={950}>{playerName}</Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            p: 1.2,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <MusicNoteIcon sx={{ color: '#f5c542' }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography fontWeight={950}>BGM</Typography>
              <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
                {bgmTrack?.label ?? '현재 단계에는 BGM이 없습니다.'}
              </Typography>
            </Box>
            <BgmControl track={bgmTrack} />
          </Stack>
        </Box>

        <Button
          fullWidth
          variant="outlined"
          color="warning"
          startIcon={<LogoutIcon />}
          onClick={onLeaveRoom}
          sx={{
            justifyContent: 'flex-start',
            py: 1.1,
            borderColor: 'rgba(245, 197, 66, 0.45)',
            color: '#f7f0df',
            fontWeight: 900,
          }}
        >
          방 나가기
        </Button>
      </Stack>
    </DialogContent>
  </Dialog>
);

const PublicCoverDialog = ({
  open,
  player,
  isSelf,
  canOpenRulebook,
  canOpenPrivateCards,
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
  canOpenPrivateCards: boolean;
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
                disabled={!canOpenPrivateCards}
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
  evidenceQna?: MurderMysteryEndbookEvidenceQnaView;
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

const ENDBOOK_EVIDENCE_HIGHLIGHT_MIN_LENGTH = 6;

const splitEndbookEvidenceHighlightSentences = (value: string) =>
  value.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [value];

const getEndbookEvidenceHighlightTerms = (
  reference: EndbookEvidenceReference,
  sourceText?: string
) => {
  const normalized = reference.excerpt.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const candidates = [normalized];
  normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      candidates.push(line);
      splitEndbookEvidenceHighlightSentences(line).forEach((sentence) => {
        candidates.push(sentence);
      });
    });

  const highlights = Array.from(
    new Set(
      candidates
        .map((candidate) => candidate.trim())
        .filter(
          (candidate) =>
            Array.from(candidate).length >=
            ENDBOOK_EVIDENCE_HIGHLIGHT_MIN_LENGTH
        )
    )
  );

  if (!sourceText) {
    return highlights;
  }

  const normalizedSourceText = sourceText.replace(/\r\n/g, '\n');
  return highlights.filter((highlight) =>
    normalizedSourceText.includes(highlight.replace(/\r\n/g, '\n'))
  );
};

const getEndbookRoleSheetSourceText = (
  roleSheet: MurderMysteryRoleSheetView | null
) =>
  roleSheet
    ? [
        roleSheet.publicText,
        roleSheet.personalGoal,
        roleSheet.ruleText,
        ...(roleSheet.belongingHints?.flatMap((hint) => [
          hint.label,
          hint.hint,
        ]) ?? []),
        roleSheet.secretText,
      ]
        .filter(Boolean)
        .join('\n\n')
    : '';

const doesEndbookEvidenceTextContainHighlight = (
  text: string | undefined,
  highlights: string[]
) => {
  if (!text || highlights.length === 0) {
    return false;
  }

  const normalizedText = text.replace(/\r\n/g, '\n');
  return highlights.some((highlight) =>
    normalizedText.includes(highlight.replace(/\r\n/g, '\n'))
  );
};

type EndbookRoleSheetHighlightSection =
  | 'public'
  | 'goal'
  | 'rules'
  | 'belongings'
  | 'secret';

const getEndbookRoleSheetHighlightSection = (
  roleSheet: MurderMysteryRoleSheetView | null,
  highlights: string[]
): EndbookRoleSheetHighlightSection | null => {
  if (!roleSheet || highlights.length === 0) {
    return null;
  }

  if (
    doesEndbookEvidenceTextContainHighlight(roleSheet.publicText, highlights)
  ) {
    return 'public';
  }
  if (
    doesEndbookEvidenceTextContainHighlight(roleSheet.personalGoal, highlights)
  ) {
    return 'goal';
  }
  if (doesEndbookEvidenceTextContainHighlight(roleSheet.ruleText, highlights)) {
    return 'rules';
  }
  if (
    roleSheet.belongingHints?.some((hint) =>
      doesEndbookEvidenceTextContainHighlight(
        [hint.label, hint.hint].join('\n'),
        highlights
      )
    )
  ) {
    return 'belongings';
  }
  if (
    doesEndbookEvidenceTextContainHighlight(roleSheet.secretText, highlights)
  ) {
    return 'secret';
  }

  return null;
};

const isEndbookPlayableRoleSheet = (
  roleSheet: MurderMysteryRoleSheetView | null
) => Boolean(roleSheet?.secretText.trim());

const EndbookEvidenceTextSection = ({
  title,
  text,
  highlights,
  anchorRef,
}: {
  title: string;
  text?: string;
  highlights?: string[];
  anchorRef?: RefObject<HTMLDivElement | null>;
}) => {
  if (!text?.trim()) {
    return null;
  }

  return (
    <Box ref={anchorRef} sx={anchorRef ? { scrollMarginTop: 16 } : undefined}>
      <Typography variant="subtitle2" fontWeight={950}>
        {title}
      </Typography>
      <Typography sx={{ mt: 0.6, whiteSpace: 'pre-wrap', lineHeight: 1.72 }}>
        <RulebookRichText text={text} highlights={highlights} />
      </Typography>
    </Box>
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
  const evidenceAnchorRef = useRef<HTMLDivElement | null>(null);
  const source = reference?.originalSource;
  const card = source?.kind === 'investigation_card' ? source.card : null;
  const roleSheet = source?.kind === 'role_sheet' ? source.roleSheet : null;
  const script = source?.kind === 'public_script' ? source.script : null;
  const cardSourceDisplayText = card ? getCardSourceDisplayText(card) : '';
  const cardDisplayText = card ? getDisplayCardText(card) : '';
  const roleSheetSourceText = getEndbookRoleSheetSourceText(roleSheet);
  const canHighlightRoleSheetRef = Boolean(
    reference?.sourceType === 'role_sheet' &&
      isEndbookPlayableRoleSheet(roleSheet)
  );
  const roleSheetEvidenceHighlights =
    reference && canHighlightRoleSheetRef
      ? getEndbookEvidenceHighlightTerms(reference, roleSheetSourceText)
      : [];
  const roleSheetHighlightSection = getEndbookRoleSheetHighlightSection(
    roleSheet,
    roleSheetEvidenceHighlights
  );
  const hasRoleSheetEvidenceHighlight =
    roleSheetEvidenceHighlights.length > 0 &&
    Boolean(roleSheetHighlightSection);
  const maxWidth: false | 'md' = card ? false : 'md';
  const scrollToEvidenceHighlight = useCallback(() => {
    evidenceAnchorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, []);

  useEffect(() => {
    if (!reference || !hasRoleSheetEvidenceHighlight) {
      return;
    }

    const timer = window.setTimeout(scrollToEvidenceHighlight, 120);
    return () => window.clearTimeout(timer);
  }, [hasRoleSheetEvidenceHighlight, reference, scrollToEvidenceHighlight]);

  if (!reference) {
    return null;
  }

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#f8f1de',
          color: '#20180f',
          borderRadius: fullScreen ? 0 : 2,
          ...(card && !fullScreen ? { width: 'min(92vw, 520px)' } : {}),
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
            {hasRoleSheetEvidenceHighlight ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={0.8}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                sx={{ mt: 0.4 }}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  sx={{ color: 'rgba(32,24,15,0.62)' }}
                >
                  노란 표시가 이 답변의 근거로 쓰인 룰지 원문입니다.
                </Typography>
                <Button
                  size="small"
                  startIcon={<SearchIcon />}
                  onClick={scrollToEvidenceHighlight}
                  sx={{ fontWeight: 900 }}
                >
                  근거 위치로 이동
                </Button>
              </Stack>
            ) : null}
          </Box>
          <Divider sx={{ borderColor: 'rgba(32,24,15,0.18)' }} />
          {card ? (
            <Box
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid rgba(53,43,30,0.24)',
                backgroundColor: '#f8f1de',
                boxShadow: '0 14px 34px rgba(32,24,15,0.16)',
              }}
            >
              <Box
                sx={{
                  backgroundColor: card.imageSrc ? '#171c23' : '#f8f1de',
                }}
              >
                {card.imageSrc ? (
                  <Box
                    component="img"
                    src={card.imageSrc}
                    alt={card.imageAlt ?? cardSourceDisplayText}
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
              </Box>
              <Stack spacing={1} sx={{ p: { xs: 1.4, sm: 1.8 } }}>
                <Typography
                  variant="h6"
                  fontWeight={950}
                  sx={{ color: '#2d2419', lineHeight: 1.25 }}
                >
                  {cardSourceDisplayText}
                </Typography>
                <Typography
                  sx={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.75,
                    color: '#2d2419',
                  }}
                >
                  <RulebookRichText text={cardDisplayText} />
                </Typography>
              </Stack>
            </Box>
          ) : null}
          {roleSheet ? (
            <Stack spacing={1.6}>
              <Stack direction="row" spacing={1.4} alignItems="flex-start">
                <CharacterPortraitFrame
                  src={roleSheet.portraitSrc}
                  alt={roleSheet.portraitAlt}
                  label={roleSheet.displayName}
                  variant="thumbnail"
                  sx={{ width: 88 }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h6" fontWeight={950}>
                    {roleSheet.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isEndbookPlayableRoleSheet(roleSheet)
                      ? '실제 게임에서 배부된 역할 설정서 원문입니다.'
                      : '게임에서 공개된 캐릭터 정보입니다.'}
                  </Typography>
                </Box>
              </Stack>
              <EndbookEvidenceTextSection
                title="공개 정보"
                text={roleSheet.publicText}
                highlights={roleSheetEvidenceHighlights}
                anchorRef={
                  roleSheetHighlightSection === 'public'
                    ? evidenceAnchorRef
                    : undefined
                }
              />
              <EndbookEvidenceTextSection
                title="개인 목표"
                text={roleSheet.personalGoal}
                highlights={roleSheetEvidenceHighlights}
                anchorRef={
                  roleSheetHighlightSection === 'goal'
                    ? evidenceAnchorRef
                    : undefined
                }
              />
              <EndbookEvidenceTextSection
                title="운영 규칙"
                text={roleSheet.ruleText}
                highlights={roleSheetEvidenceHighlights}
                anchorRef={
                  roleSheetHighlightSection === 'rules'
                    ? evidenceAnchorRef
                    : undefined
                }
              />
              {roleSheet.belongingHints?.length ? (
                <Box
                  ref={
                    roleSheetHighlightSection === 'belongings'
                      ? evidenceAnchorRef
                      : undefined
                  }
                  sx={
                    roleSheetHighlightSection === 'belongings'
                      ? { scrollMarginTop: 16 }
                      : undefined
                  }
                >
                  <Typography variant="subtitle2" fontWeight={950}>
                    소지품 힌트
                  </Typography>
                  <Stack spacing={0.8} sx={{ mt: 0.8 }}>
                    {roleSheet.belongingHints.map((hint) => (
                      <Box
                        key={`${hint.label}:${hint.hint}`}
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          backgroundColor: 'rgba(32,24,15,0.06)',
                        }}
                      >
                        <Typography fontWeight={900}>{hint.label}</Typography>
                        <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                          <RulebookRichText
                            text={hint.hint}
                            highlights={roleSheetEvidenceHighlights}
                          />
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ) : null}
              <EndbookEvidenceTextSection
                title="비공개 룰지"
                text={roleSheet.secretText}
                highlights={roleSheetEvidenceHighlights}
                anchorRef={
                  roleSheetHighlightSection === 'secret'
                    ? evidenceAnchorRef
                    : undefined
                }
              />
            </Stack>
          ) : null}
          {script ? (
            <Stack spacing={1}>
              <Typography variant="h6" fontWeight={950}>
                {script.label}
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.78 }}>
                <RulebookRichText text={script.readAloud} />
              </Typography>
            </Stack>
          ) : null}
          {!source ? (
            <EndbookEvidenceTextSection
              title="원문/발췌"
              text={reference.excerpt}
            />
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

type ClueImageZoomView = {
  src: string;
  alt: string;
  title: string;
};

const ClueImageZoomDialog = ({
  image,
  onClose,
}: {
  image: ClueImageZoomView | null;
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
    if (image) {
      resetView();
    }
  }, [image, resetView]);

  const applyScale = useCallback((nextScale: number) => {
    const safeScale = clamp(nextScale, 1, 8);
    setScale(safeScale);
    if (safeScale === 1) {
      setOffset({ x: 0, y: 0 });
    }
  }, []);

  const updateGesture = useCallback(() => {
    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 0) {
      lastGestureRef.current = null;
      return;
    }

    const centerX =
      pointers.reduce((sum, pointer) => sum + pointer.x, 0) / pointers.length;
    const centerY =
      pointers.reduce((sum, pointer) => sum + pointer.y, 0) / pointers.length;
    const distance =
      pointers.length >= 2
        ? Math.hypot(
            pointers[0].x - pointers[1].x,
            pointers[0].y - pointers[1].y
          )
        : null;
    const lastGesture = lastGestureRef.current;

    if (lastGesture) {
      const dx = centerX - lastGesture.centerX;
      const dy = centerY - lastGesture.centerY;
      if (scale > 1) {
        setOffset((current) => ({
          x: current.x + dx,
          y: current.y + dy,
        }));
      }
      if (distance && lastGesture.distance) {
        applyScale(scale * (distance / lastGesture.distance));
      }
    }

    lastGestureRef.current = { centerX, centerY, distance };
  }, [applyScale, scale]);

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
    updateGesture();
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    updateGesture();
  };

  return (
    <Dialog
      open={Boolean(image)}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '100vw',
          height: '100dvh',
          maxWidth: '100vw',
          maxHeight: '100dvh',
          m: 0,
          borderRadius: 0,
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
          <ArticleIcon />
          <Typography fontWeight={950} sx={{ flex: 1, minWidth: 0 }}>
            {image?.title ?? '단서 이미지'}
          </Typography>
          <Tooltip title="축소">
            <IconButton
              onClick={() => applyScale(scale - 0.5)}
              sx={{ color: '#f8f1de' }}
            >
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="확대">
            <IconButton
              onClick={() => applyScale(scale + 0.5)}
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
            applyScale(scale + (event.deltaY < 0 ? 0.35 : -0.35));
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onDoubleClick={() => applyScale(scale > 1 ? 1 : 3)}
          sx={{
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
          {image ? (
            <Box
              component="img"
              src={image.src}
              alt={image.alt}
              draggable={false}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
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
        </Box>
      </Stack>
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
  const dialogSurfaceRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    navigationControlsVisible: boolean;
  } | null>(null);
  const navigationRevealTimerRef = useRef<number | null>(null);
  const [zoomImage, setZoomImage] = useState<ClueImageZoomView | null>(null);
  const [areNavigationControlsVisible, setAreNavigationControlsVisible] =
    useState(false);
  const canNavigate = totalCount > 1;
  const hasImage = Boolean(card?.imageSrc);
  const sourceDisplayText = card ? getCardSourceDisplayText(card) : '';
  const displayText = card ? getDisplayCardText(card) : '';
  const zoomImageView = card?.imageSrc
    ? {
        src: card.imageSrc,
        alt: card.imageAlt ?? sourceDisplayText,
        title: sourceDisplayText,
      }
    : null;

  useEffect(() => {
    setZoomImage(null);
  }, [card?.id]);

  const clearNavigationRevealTimer = useCallback(() => {
    if (navigationRevealTimerRef.current !== null) {
      window.clearTimeout(navigationRevealTimerRef.current);
      navigationRevealTimerRef.current = null;
    }
  }, []);

  const hideNavigationControls = useCallback(() => {
    clearNavigationRevealTimer();
    setAreNavigationControlsVisible(false);
  }, [clearNavigationRevealTimer]);

  const revealNavigationControls = useCallback(() => {
    if (!canNavigate) {
      return;
    }
    setAreNavigationControlsVisible(true);
    clearNavigationRevealTimer();
    navigationRevealTimerRef.current = window.setTimeout(() => {
      setAreNavigationControlsVisible(false);
      navigationRevealTimerRef.current = null;
    }, CARD_DETAIL_NAVIGATION_REVEAL_MS);
  }, [canNavigate, clearNavigationRevealTimer]);

  useEffect(
    () => () => {
      clearNavigationRevealTimer();
    },
    [clearNavigationRevealTimer]
  );

  useEffect(() => {
    hideNavigationControls();
  }, [card?.id, hideNavigationControls]);

  useEffect(() => {
    if (!card || !canNavigate) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        revealNavigationControls();
        onPrevious();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        revealNavigationControls();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNavigate, card, onNext, onPrevious, revealNavigationControls]);

  const handleDialogPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!canNavigate && !zoomImageView) {
      return;
    }
    if (isCardDetailNavigationIgnoredTarget(event.target)) {
      return;
    }
    const navigationControlsVisible = areNavigationControlsVisible;
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      navigationControlsVisible,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDialogPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) {
      return;
    }

    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const isTap = Math.abs(deltaX) <= 10 && Math.abs(deltaY) <= 10;

    if (
      canNavigate &&
      Math.abs(deltaX) >= 48 &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      if (deltaX < 0) {
        onNext();
      } else {
        onPrevious();
      }
      return;
    }

    if (!isTap) {
      return;
    }

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      return;
    }

    const mediaRect = mediaRef.current?.getBoundingClientRect();
    const targetNode = event.target instanceof Node ? event.target : null;
    const isMediaTap = Boolean(
      targetNode && mediaRef.current?.contains(targetNode)
    );

    if (isMediaTap && mediaRect) {
      const edgeTapWidth = Math.min(56, mediaRect.width * 0.14);
      if (canNavigate && event.clientX <= mediaRect.left + edgeTapWidth) {
        onPrevious();
        return;
      }
      if (canNavigate && event.clientX >= mediaRect.right - edgeTapWidth) {
        onNext();
        return;
      }
      if (zoomImageView) {
        setZoomImage(zoomImageView);
      }
      return;
    }

    const dialogRect = dialogSurfaceRef.current?.getBoundingClientRect();
    if (!dialogRect || !canNavigate) {
      return;
    }

    const xRatio = (event.clientX - dialogRect.left) / dialogRect.width;
    if (xRatio < 0.42) {
      onPrevious();
      return;
    }
    if (xRatio > 0.58) {
      onNext();
      return;
    }
    if (start.navigationControlsVisible) {
      hideNavigationControls();
      return;
    }
    revealNavigationControls();
  };

  return (
    <Fragment>
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
        <Box
          ref={dialogSurfaceRef}
          onPointerDown={handleDialogPointerDown}
          onPointerUp={handleDialogPointerUp}
          onPointerCancel={(event) => {
            pointerStartRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          sx={{
            position: 'relative',
            touchAction: canNavigate || hasImage ? 'pan-y' : 'auto',
          }}
        >
          <Tooltip title={isPinned ? '단서 핀 해제' : '단서 핀 고정'}>
            <span data-card-detail-navigation-skip="true">
              <IconButton
                disabled={!card}
                aria-label={isPinned ? '단서 핀 해제' : '단서 핀 고정'}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePin?.();
                }}
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
            aria-label="단서 창 닫기"
            data-card-detail-navigation-skip="true"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
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
            sx={{
              position: 'relative',
              cursor: hasImage ? 'zoom-in' : 'default',
              touchAction: canNavigate || hasImage ? 'pan-y' : 'auto',
              backgroundColor: hasImage ? '#171c23' : '#f8f1de',
              userSelect: 'none',
            }}
          >
            {card?.imageSrc ? (
              <Box
                component="img"
                src={card.imageSrc}
                alt={card.imageAlt ?? sourceDisplayText}
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
              </>
            ) : null}
          </Box>
          {canNavigate ? (
            <>
              <IconButton
                aria-label="이전 단서"
                tabIndex={areNavigationControlsVisible ? 0 : -1}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  revealNavigationControls();
                  onPrevious();
                }}
                sx={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5,
                  color: '#fff',
                  backgroundColor: 'rgba(0,0,0,0.46)',
                  opacity: areNavigationControlsVisible ? 1 : 0,
                  pointerEvents: areNavigationControlsVisible ? 'auto' : 'none',
                  transition:
                    'opacity 120ms ease-out, background-color 120ms ease-out',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.62)' },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                aria-label="다음 단서"
                tabIndex={areNavigationControlsVisible ? 0 : -1}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  revealNavigationControls();
                  onNext();
                }}
                sx={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5,
                  color: '#fff',
                  backgroundColor: 'rgba(0,0,0,0.46)',
                  opacity: areNavigationControlsVisible ? 1 : 0,
                  pointerEvents: areNavigationControlsVisible ? 'auto' : 'none',
                  transition:
                    'opacity 120ms ease-out, background-color 120ms ease-out',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.62)' },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          ) : null}
          <Stack spacing={1} sx={{ p: { xs: 1.4, sm: 1.8 } }}>
            <Stack direction="row" spacing={0.8} alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  fontWeight={950}
                  sx={{ color: '#2d2419', lineHeight: 1.25 }}
                >
                  {sourceDisplayText}
                </Typography>
              </Box>
              {card?.extraInvestigationOnReveal ? (
                <ExtraInvestigationFrontBadge />
              ) : null}
            </Stack>
            <Typography
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.75,
                color: '#2d2419',
              }}
            >
              {card ? (
                <RulebookRichText
                  text={displayText}
                  highlights={card.textHighlights}
                />
              ) : null}
            </Typography>
          </Stack>
        </Box>
      </Dialog>
      <ClueImageZoomDialog
        image={zoomImage}
        onClose={() => setZoomImage(null)}
      />
    </Fragment>
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
}) => (
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
    <MurderMysteryInvestigationMapViewer
      scene={scene}
      pins={pins}
      onSelectPin={onSelectPin}
      resetKey={open}
      toolbarEnd={
        <IconButton onClick={onClose} sx={{ color: '#f8f1de' }}>
          <CloseIcon />
        </IconButton>
      }
    />
  </Dialog>
);

const PrivateCardsDialog = ({
  open,
  cards,
  fullScreen,
  canRevealPubliclyNow,
  publicRevealNotice,
  publicRevealNoticeSeverity,
  onClose,
  onOpenCard,
  onReorderCards,
  onRevealPublicly,
}: {
  open: boolean;
  cards: MurderMysteryClueVaultCardView[];
  fullScreen: boolean;
  canRevealPubliclyNow: boolean;
  publicRevealNotice: string;
  publicRevealNoticeSeverity: 'info' | 'success' | 'warning';
  onClose: () => void;
  onOpenCard: (card: AnyClueCard) => void;
  onReorderCards: (cards: MurderMysteryClueVaultCardView[]) => void;
  onRevealPublicly: (cardId: string) => void;
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
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
        <Stack spacing={1.25}>
          <Alert severity={publicRevealNoticeSeverity} variant="outlined">
            {publicRevealNotice}
          </Alert>
          <Typography color="text.secondary">
            아직 개인 카드가 없습니다.
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={1.25}>
          <Alert severity={publicRevealNoticeSeverity} variant="outlined">
            {publicRevealNotice}
          </Alert>
          <SortableClueCardGrid
            cards={cards}
            onReorder={onReorderCards}
            renderCard={(card) => (
              <EvidenceCardFace
                key={card.id}
                card={card}
                compactPreview
                previewLineClamp={1}
                previewMaxLength={36}
                cardMinHeight={132}
                mediaHeight={58}
                onOpen={onOpenCard}
                showPublicRevealControl
                publicRevealDisabled={!canRevealPubliclyNow}
                onRevealPublicly={onRevealPublicly}
              />
            )}
          />
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

type FinalVoteReveal = NonNullable<
  MurderMysteryStateSnapshot['finalVote']['reveal']
>;

const FinalVoteParticipantMarker = ({
  player,
  fallbackLabel,
  caption,
}: {
  player?: MurderMysteryPublicPlayerView | null;
  fallbackLabel: string;
  caption: string;
}) => {
  const label = player ? formatParticipantLabel(player) : fallbackLabel;

  return (
    <Stack
      spacing={0.45}
      alignItems="center"
      sx={{ minWidth: 0, width: '100%' }}
    >
      {player ? (
        <CharacterPortraitFrame
          src={player.rolePortraitSrc ?? undefined}
          alt={player.rolePortraitAlt ?? undefined}
          label={player.roleDisplayName ?? player.name}
          variant="thumbnail"
          sx={{
            width: { xs: 44, sm: 50 },
            boxShadow: '0 7px 16px rgba(0,0,0,0.28)',
          }}
        />
      ) : (
        <Box
          aria-hidden
          sx={{
            width: { xs: 44, sm: 50 },
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            border: '1px solid rgba(255,255,255,0.35)',
            background:
              'linear-gradient(180deg, rgba(245,197,66,0.32), rgba(148,84,36,0.48))',
            color: '#fff7df',
            boxShadow: '0 7px 16px rgba(0,0,0,0.28)',
            fontSize: { xs: 16, sm: 18 },
            fontWeight: 950,
          }}
        >
          {getPlayerInitial(label)}
        </Box>
      )}
      <Typography
        variant="caption"
        fontWeight={950}
        sx={{
          width: '100%',
          color: '#f8f1de',
          lineHeight: 1.15,
          textAlign: 'center',
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          width: '100%',
          color: '#cfc5ad',
          fontSize: 10,
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        {caption}
      </Typography>
    </Stack>
  );
};

const FinalVoteRevealPanel = ({
  reveal,
  players,
  options,
}: {
  reveal: FinalVoteReveal;
  players: MurderMysteryPublicPlayerView[];
  options: MurderMysteryFinalVoteOptionScenario[];
}) => {
  const optionById = new Map(options.map((option) => [option.id, option]));
  const voteRows = players
    .map((voter) => {
      const voteOptionId = reveal.votes[voter.id];
      if (!voteOptionId) {
        return null;
      }
      const option = optionById.get(voteOptionId);
      const targetPlayer =
        option?.optionType === 'role' && option.roleId
          ? (players.find((player) => player.roleId === option.roleId) ?? null)
          : null;
      const targetLabel =
        targetPlayer === null
          ? (option?.label ?? voteOptionId)
          : formatParticipantLabel(targetPlayer);

      return {
        voter,
        targetPlayer,
        targetLabel,
        voteOptionId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const knownOptionIds = new Set(options.map((option) => option.id));
  const tallyRows = [
    ...options
      .map((option) => ({
        id: option.id,
        label: option.label,
        count: reveal.tally[option.id] ?? 0,
      }))
      .filter((row) => row.count > 0),
    ...Object.entries(reveal.tally)
      .filter(([optionId]) => !knownOptionIds.has(optionId))
      .map(([optionId, count]) => ({
        id: optionId,
        label: optionId,
        count,
      })),
  ];
  const topVoteCount = tallyRows.reduce(
    (max, row) => Math.max(max, row.count),
    0
  );

  return (
    <Box
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
        border: reveal.requiresRevote
          ? '1px solid rgba(245, 158, 11, 0.45)'
          : '1px solid rgba(255,255,255,0.16)',
        backgroundColor: reveal.requiresRevote
          ? 'rgba(120, 53, 15, 0.35)'
          : 'rgba(15, 19, 24, 0.78)',
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0.8}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={950}>
              {reveal.requiresRevote ? '투표 결과: 동률' : '투표 공개 결과'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
              각 플레이어가 지목한 대상을 공개합니다.
            </Typography>
          </Box>
          <Chip
            size="small"
            color={reveal.requiresRevote ? 'warning' : 'success'}
            icon={
              reveal.requiresRevote ? <WarningAmberIcon /> : <TaskAltIcon />
            }
            label={reveal.requiresRevote ? '재투표 필요' : '집계 완료'}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          />
        </Stack>

        {reveal.requiresRevote ? (
          <Alert
            severity="warning"
            variant="outlined"
            sx={{
              borderColor: 'rgba(245, 158, 11, 0.52)',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              color: '#f8f1de',
              '& .MuiAlert-icon': { color: '#ffcf6a' },
            }}
          >
            동률입니다. 아래 후보 중 다시 지목해주세요.
          </Alert>
        ) : null}

        {tallyRows.length > 0 ? (
          <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
            {tallyRows.map((row) => {
              const isTop = row.count === topVoteCount;
              return (
                <Chip
                  key={row.id}
                  size="small"
                  label={`${row.label} ${row.count}표`}
                  color={isTop ? 'warning' : 'default'}
                  variant={isTop ? 'filled' : 'outlined'}
                  sx={{
                    color: isTop ? undefined : '#f8f1de',
                    borderColor: isTop ? undefined : 'rgba(255,255,255,0.28)',
                    fontWeight: 900,
                  }}
                />
              );
            })}
          </Stack>
        ) : null}

        <Stack spacing={0.8}>
          {voteRows.map((row) => {
            const voterLabel = formatParticipantLabel(row.voter);
            return (
              <Box
                key={`${row.voter.id}:${row.voteOptionId}`}
                aria-label={`${voterLabel} 지목 대상 ${row.targetLabel}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr) 34px minmax(0, 1fr)',
                    sm: 'minmax(0, 1fr) 42px minmax(0, 1fr)',
                  },
                  alignItems: 'center',
                  gap: { xs: 0.75, sm: 1 },
                  px: { xs: 0.85, sm: 1.1 },
                  py: { xs: 0.85, sm: 0.95 },
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.11)',
                }}
              >
                <FinalVoteParticipantMarker
                  player={row.voter}
                  fallbackLabel={voterLabel}
                  caption="투표자"
                />
                <Box
                  aria-hidden
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    color: reveal.requiresRevote ? '#ffcf6a' : '#8bd4a0',
                  }}
                >
                  <ArrowForwardIcon sx={{ fontSize: { xs: 25, sm: 30 } }} />
                </Box>
                <FinalVoteParticipantMarker
                  player={row.targetPlayer}
                  fallbackLabel={row.targetLabel}
                  caption="지목"
                />
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
};

export default function MurderMysteryTableExperience({
  sessionId,
  isHostView,
  snapshot,
  onLeaveRoom,
  onNextPhase,
  onMarkRoleSheetRead,
  onFinalizeVote,
  onSubmitRolePreferences,
  onShareRoleSheet,
  onSubmitInvestigationByTarget,
  onSubmitInvestigationByBack,
  onSetReservation,
  onClearReservation,
  pendingReservationBackId,
  onRevealMyClue,
  onStartPresentationTimer,
  onEndPresentationTimer,
  onSubmitVote,
  onSubmitEndingChoice,
  onReportSpecialEvent,
}: MurderMysteryTableExperienceProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const gameFrameRef = useRef<HTMLDivElement | null>(null);
  const phaseScrollRef = useRef<HTMLDivElement | null>(null);
  const investigationTargetTileRefs = useRef<
    Record<string, HTMLElement | null>
  >({});
  const mapTargetHighlightTimerRef = useRef<number | null>(null);
  const mapTargetHighlightSerialRef = useRef(0);
  const previousHeldBackIdsByPlayerRef = useRef<Record<
    string,
    Set<string>
  > | null>(null);
  const previousMyClueIdsRef = useRef<Set<string> | null>(null);
  const autoOpenedInvestigationCardIdsRef = useRef<Set<string>>(new Set());
  const previousReservationRef =
    useRef<MurderMysteryInvestigationBackCardView | null>(null);
  const modalHistoryDepthRef = useRef(0);
  const openModalCountRef = useRef(0);
  const suppressModalPopCountRef = useRef(0);
  const previousPhaseRef = useRef(snapshot.phase);
  const rulebookLiftTimerRef = useRef<number | null>(null);
  const rulebookCoverResetTimerRef = useRef<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [isRulebookCoverLifted, setIsRulebookCoverLifted] = useState(false);
  const [isPublicScriptsOpen, setIsPublicScriptsOpen] = useState(false);
  const [isPrivateCardsOpen, setIsPrivateCardsOpen] = useState(false);
  const [isFlowOverviewOpen, setIsFlowOverviewOpen] = useState(false);
  const [isNotificationLogOpen, setIsNotificationLogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [lastReadAnnouncementAt, setLastReadAnnouncementAt] = useState(0);
  const [cardViewer, setCardViewer] = useState<CardViewerState | null>(null);
  const [selectedEvidenceRef, setSelectedEvidenceRef] =
    useState<EndbookEvidenceReference | null>(null);
  const [pinnedClue, setPinnedClue] = useState<PinnedClueReference | null>(
    null
  );
  const [pendingSpecialEventAction, setPendingSpecialEventAction] =
    useState<SpecialEventActionRequest | null>(null);
  const [cardOrder, setCardOrder] = useState<StoredCardOrder>({});
  const [clueTakeNotice, setClueTakeNotice] = useState<ClueTakeNotice | null>(
    null
  );
  const [mapHighlightedTarget, setMapHighlightedTarget] =
    useState<MapHighlightedInvestigationTarget | null>(null);
  const [introTab, setIntroTab] = useState<IntroTab>('prologue');
  const [nowTick, setNowTick] = useState(Date.now());
  const selectedCard = cardViewer?.cards[cardViewer.index] ?? null;
  const activeRound = snapshot.investigation.round;
  const cardOrderStorageKey = useMemo(
    () =>
      `${CARD_ORDER_STORAGE_PREFIX}:${snapshot.roomId}:${snapshot.scenario.id}:${sessionId}`,
    [sessionId, snapshot.roomId, snapshot.scenario.id]
  );
  const announcementReadStorageKey = useMemo(
    () => `${ANNOUNCEMENT_READ_STORAGE_PREFIX}:${snapshot.roomId}:${sessionId}`,
    [sessionId, snapshot.roomId]
  );

  const selfPlayer =
    snapshot.players.find((player) => player.id === sessionId) ?? null;
  const selfPlayerName = selfPlayer?.name ?? '접속자';
  const latestAnnouncementAt = snapshot.announcements.reduce(
    (latest, announcement) => Math.max(latest, announcement.at),
    0
  );
  const unreadAnnouncementCount = snapshot.announcements.filter(
    (announcement) => announcement.at > lastReadAnnouncementAt
  ).length;
  const selectedPlayer =
    snapshot.players.find((player) => player.id === selectedPlayerId) ?? null;
  const selfPrivateOnlyClues = useMemo(
    () =>
      getPrivateOnlyClueCards(
        snapshot.clueVault.myClues,
        selfPlayer?.publicRevealedClues ?? []
      ),
    [selfPlayer?.publicRevealedClues, snapshot.clueVault.myClues]
  );
  const discussionPublicClues = useMemo(
    () =>
      getUniqueClueCards([
        ...snapshot.clueVault.publicClues,
        ...snapshot.players.flatMap((player) => player.publicRevealedClues),
      ]),
    [snapshot.clueVault.publicClues, snapshot.players]
  );
  const orderedPublicClues = useMemo(
    () =>
      orderCardsByStoredIds(
        snapshot.clueVault.publicClues,
        cardOrder['public-clues']
      ),
    [cardOrder, snapshot.clueVault.publicClues]
  );
  const orderedDiscussionPublicClues = useMemo(
    () =>
      orderCardsByStoredIds(discussionPublicClues, cardOrder['public-clues']),
    [cardOrder, discussionPublicClues]
  );
  const orderedMyClues = useMemo(
    () =>
      orderCardsByStoredIds(snapshot.clueVault.myClues, cardOrder['my-clues']),
    [cardOrder, snapshot.clueVault.myClues]
  );
  const investigationTargetIds = useMemo(
    () =>
      new Set(
        snapshot.scenario.investigations.rounds.flatMap((round) =>
          round.targets.map((target) => target.id)
        )
      ),
    [snapshot.scenario.investigations.rounds]
  );
  const cardViewerSources = useMemo(() => {
    const sources: Record<string, AnyClueCard[]> = {
      'my-clues': orderedMyClues,
      'my-private-clues': selfPrivateOnlyClues,
      'public-clues': orderedPublicClues,
      'discussion:public': orderedDiscussionPublicClues,
    };
    snapshot.players.forEach((player) => {
      sources[`player:${player.id}:public`] = player.publicRevealedClues;
    });
    return sources;
  }, [
    orderedDiscussionPublicClues,
    orderedMyClues,
    orderedPublicClues,
    snapshot.players,
    selfPrivateOnlyClues,
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
  const firstIntroStepId =
    snapshot.scenario.flow.steps.find((step) => step.kind === 'intro')?.id ??
    null;
  const isPrimaryIntroStep =
    phaseKind === 'intro' && currentStep?.id === firstIntroStepId;
  const isPreRoundBriefingStep = phaseKind === 'intro' && !isPrimaryIntroStep;
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
  const presentationRemainingSec = snapshot.presentation.activeSpeakerStartedAt
    ? Math.max(
        snapshot.presentation.durationSec -
          Math.floor(
            (nowTick - snapshot.presentation.activeSpeakerStartedAt) / 1000
          ),
        0
      )
    : null;
  const activePresentationSpeaker =
    snapshot.presentation.activeSpeakerPlayerId === null
      ? null
      : (snapshot.players.find(
          (player) => player.id === snapshot.presentation.activeSpeakerPlayerId
        ) ?? null);
  const activePresentationSpeakerLabel = activePresentationSpeaker
    ? formatParticipantLabel(activePresentationSpeaker)
    : null;
  const headerTimerLabel =
    phaseKind === 'presentation'
      ? formatSeconds(presentationRemainingSec)
      : formatSeconds(phaseRemainingSec);
  const isHeaderTimerExpired =
    phaseKind === 'presentation'
      ? presentationRemainingSec === 0 &&
        snapshot.presentation.activeSpeakerPlayerId !== null
      : isPhaseTimerExpired;
  const bgmTrack = getMurderMysteryBgmTrack(snapshot);
  const scenarioTitle = useMemo(
    () => splitScenarioTitle(snapshot.scenario.title),
    [snapshot.scenario.title]
  );
  const roleReadingReadyByPlayerId = useMemo<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        snapshot.roleReading.players.map((player) => [
          player.playerId,
          player.ready,
        ])
      ),
    [snapshot.roleReading.players]
  );
  const activeRoundView =
    snapshot.investigation.rounds.find(
      (round) => round.round === activeRound
    ) ?? null;
  const shouldShowInvestigationProgress =
    phaseKind === 'investigate' &&
    snapshot.investigation.playerProgress.length > 0;
  const investigationProgressByPlayerId = useMemo(
    () =>
      Object.fromEntries(
        snapshot.investigation.playerProgress.map((progress) => [
          progress.playerId,
          progress,
        ])
      ) as Record<string, InvestigationPlayerProgress>,
    [snapshot.investigation.playerProgress]
  );
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
  const shouldShowInvestigationMapFab =
    !isRulebookOpen &&
    Boolean(snapshot.investigation.map?.scene) &&
    (phaseKind === 'role_reading' || isMapInvestigationPhase);
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
  const selfInvestigationProgress = shouldShowInvestigationProgress
    ? (investigationProgressByPlayerId[sessionId] ?? null)
    : null;
  const canUseHostTools = isHostView;
  const requiredPlayerCount =
    snapshot.roleSelection.requiredPlayerCount ||
    snapshot.hostParticipation.requiredPlayerCount;
  const connectedPlayerCount = Math.min(
    snapshot.players.filter((player) => Boolean(player.socketId)).length,
    requiredPlayerCount
  );
  const isRoleSelectionLocked = snapshot.roleSelection.status === 'locked';
  const submittedRoleSelectionCount = snapshot.roleSelection.players.filter(
    (player) => player.submitted
  ).length;
  const allRoleSelectionsSubmitted =
    submittedRoleSelectionCount >= requiredPlayerCount;
  const selectableRoleCovers = snapshot.roleSelection.publicCovers.filter(
    (cover) => cover.selectable
  );
  const selectedRoleCovers = selectableRoleCovers.filter(
    (cover) => cover.preferredPlayerIds.length > 0
  );
  const hasConflictFreeRoleSelections =
    submittedRoleSelectionCount >= requiredPlayerCount &&
    selectedRoleCovers.length === requiredPlayerCount &&
    selectedRoleCovers.every((cover) => cover.preferredPlayerIds.length === 1);
  const preferredRoleId = snapshot.roleSelection.yourPreferenceRoleIds[0];
  const preferredRole = preferredRoleId
    ? (snapshot.roleSelection.roles.find(
        (role) => role.id === preferredRoleId
      ) ?? null)
    : null;
  const assignedRoleId = snapshot.roleSelection.yourAssignedRoleId;
  const assignedRole = assignedRoleId
    ? (snapshot.roleSelection.roles.find(
        (role) => role.id === assignedRoleId
      ) ?? null)
    : null;
  const assignedRoleForMismatch =
    assignedRole ??
    (snapshot.roleSheet
      ? {
          displayName: snapshot.roleSheet.displayName,
          publicText: snapshot.roleSheet.publicText,
          portraitSrc: snapshot.roleSheet.portraitSrc,
          portraitAlt: snapshot.roleSheet.portraitAlt,
        }
      : null);
  const shouldShowRoleSelectionMarkerRail =
    (isPrimaryIntroStep || phaseKind === 'role_selection') &&
    !isRoleSelectionLocked;
  const shouldShowPlayerMarkerRail = isRoleSelectionLocked;
  const shouldShowMarkerRail =
    shouldShowRoleSelectionMarkerRail || shouldShowPlayerMarkerRail;
  const isIntroRoleSelectionOpen = isPrimaryIntroStep && !isRoleSelectionLocked;
  const showNextPhaseTool =
    canUseHostTools &&
    phaseKind !== 'lobby' &&
    !isIntroRoleSelectionOpen &&
    phaseKind !== 'role_selection' &&
    phaseKind !== 'final_vote' &&
    phaseKind !== 'endbook';
  const canAdvancePhase =
    (phaseKind !== 'role_reading' || snapshot.roleReading.allReady) &&
    (phaseKind !== 'ending_choice' || snapshot.endingChoices.allSubmitted) &&
    (phaseKind !== 'presentation' || snapshot.presentation.allCompleted);
  const nextPhaseTooltip =
    phaseKind === 'role_reading' && !snapshot.roleReading.allReady
      ? '모든 플레이어가 다 읽었어요를 눌러야 진행할 수 있습니다.'
      : phaseKind === 'ending_choice' && !snapshot.endingChoices.allSubmitted
        ? '모든 엔딩 선택이 제출되어야 진행할 수 있습니다.'
        : phaseKind === 'presentation' && !snapshot.presentation.allCompleted
          ? '모든 플레이어의 개인 발표가 끝나야 진행할 수 있습니다.'
          : '다음 단계';
  const canFinalizeVote =
    canUseHostTools &&
    phaseKind === 'final_vote' &&
    !snapshot.finalVote.result &&
    (snapshot.canUseHostGameMasterControls ||
      snapshot.finalVote.submittedVoters >= snapshot.finalVote.totalVoters);
  const isFloatingActionDockPhase =
    phaseKind === 'role_reading' ||
    phaseKind === 'investigate' ||
    (phaseKind === 'discuss' && showNextPhaseTool) ||
    phaseKind === 'presentation' ||
    phaseKind === 'final_vote' ||
    phaseKind === 'ending_choice';
  const openModalCount =
    Number(isRulebookOpen) +
    Number(isPrivateCardsOpen) +
    Number(isPublicScriptsOpen) +
    Number(isFlowOverviewOpen) +
    Number(isNotificationLogOpen) +
    Number(isSettingsOpen) +
    Number(isMapDialogOpen) +
    Number(Boolean(pendingSpecialEventAction)) +
    Number(Boolean(selectedCard)) +
    Number(Boolean(selectedEvidenceRef)) +
    Number(Boolean(selectedPlayer));
  const hasOpenModal = openModalCount > 0;
  const isIntroPrologueTab = isPrimaryIntroStep && introTab === 'prologue';
  const isScriptReadingLayout = isIntroPrologueTab || isPreRoundBriefingStep;
  const shouldShowHostRoleSelectionDock =
    canUseHostTools &&
    (phaseKind === 'lobby' ||
      isPrimaryIntroStep ||
      phaseKind === 'role_selection') &&
    !isRoleSelectionLocked;
  const shouldShowHostBriefingDock = canUseHostTools && isPreRoundBriefingStep;
  const shouldShowFloatingActionDock =
    isFloatingActionDockPhase &&
    (!hasOpenModal || (phaseKind === 'investigate' && canActNow));
  const isDeskPanelPhase =
    phaseKind !== 'lobby' &&
    phaseKind !== 'intro' &&
    phaseKind !== 'role_selection' &&
    phaseKind !== 'role_reading';
  const shouldShowDeskPanel = isDeskPanelPhase;
  const shouldShowMobileDeskPanel = isSmall && shouldShowDeskPanel;
  const privateCardCount = snapshot.clueVault.myClues.length;
  const canOpenPrivateCards = privateCardCount > 0 && isDeskPanelPhase;
  const canRevealPrivateCardsPublicly =
    phaseKind === 'discuss' || phaseKind === 'presentation';
  const privateCardRevealNoticeSeverity: 'info' | 'success' | 'warning' =
    canRevealPrivateCardsPublicly
      ? 'success'
      : phaseKind === 'investigate'
        ? 'warning'
        : 'info';
  const privateCardRevealNotice = canRevealPrivateCardsPublicly
    ? '회의/발표 단계입니다. 필요한 개인 카드는 전체공개하기로 테이블에 올려 토론에 사용할 수 있습니다.'
    : phaseKind === 'investigate'
      ? '조사 단계에서는 개인 카드를 전체 공개할 수 없습니다. 회의 단계로 넘어가면 전체공개하기 버튼을 사용할 수 있습니다.'
      : '개인 카드 전체공개는 회의 단계에서 사용할 수 있습니다.';
  const shouldShowPublicClues =
    phaseKind === 'investigate' ||
    phaseKind === 'ending_choice' ||
    phaseKind === 'endbook';
  const shouldOverlayHostRoleSelectionDock =
    shouldShowHostRoleSelectionDock && !isSmall;
  const shouldOverlayHostBriefingDock = shouldShowHostBriefingDock && !isSmall;
  const shouldReserveBottomDockSpace =
    shouldOverlayHostRoleSelectionDock ||
    shouldOverlayHostBriefingDock ||
    shouldShowFloatingActionDock ||
    shouldShowMobileDeskPanel;
  const shouldUseTightDeskPanelPadding =
    phaseKind === 'discuss' ||
    phaseKind === 'presentation' ||
    phaseKind === 'endbook';
  const mobileDeskPanelBottomPadding = shouldUseTightDeskPanelPadding
    ? 8.5
    : 22;
  const mobileMainBottomPadding = shouldShowMobileDeskPanel
    ? mobileDeskPanelBottomPadding
    : shouldShowFloatingActionDock
      ? 22
      : 1.4;
  const mainBottomPadding = hasOpenModal
    ? { xs: 10, lg: 1.4 }
    : phaseKind === 'role_reading'
      ? { xs: shouldReserveBottomDockSpace ? 9.5 : 1.4, lg: 1.4 }
      : {
          xs: mobileMainBottomPadding,
          lg: shouldReserveBottomDockSpace ? 10 : 1.4,
        };
  const phasePanelBottomPadding = hasOpenModal
    ? { xs: 8.5, lg: 2 }
    : isScriptReadingLayout
      ? { xs: 1.3, md: 2 }
      : phaseKind === 'role_reading'
        ? { xs: 1.3, md: 2 }
        : shouldUseTightDeskPanelPadding
          ? { xs: 2, md: 2 }
          : {
              xs: shouldReserveBottomDockSpace ? 18 : 2,
              lg: shouldReserveBottomDockSpace ? 11 : 2,
            };
  const floatingFabBottomOffset = hasOpenModal
    ? 96
    : shouldReserveBottomDockSpace
      ? 154
      : 74;
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
  const openRoleReadingRulebook = useCallback(() => {
    if (!snapshot.roleSheet || isRulebookOpen) {
      return;
    }
    if (rulebookLiftTimerRef.current !== null) {
      window.clearTimeout(rulebookLiftTimerRef.current);
    }
    if (rulebookCoverResetTimerRef.current !== null) {
      window.clearTimeout(rulebookCoverResetTimerRef.current);
      rulebookCoverResetTimerRef.current = null;
    }
    setIsRulebookCoverLifted(true);
    rulebookLiftTimerRef.current = window.setTimeout(() => {
      setIsRulebookOpen(true);
      rulebookLiftTimerRef.current = null;
      rulebookCoverResetTimerRef.current = window.setTimeout(() => {
        setIsRulebookCoverLifted(false);
        rulebookCoverResetTimerRef.current = null;
      }, 180);
    }, 160);
  }, [isRulebookOpen, snapshot.roleSheet]);
  const openPrivateCards = () => {
    if (!canOpenPrivateCards) {
      return;
    }
    setIsPrivateCardsOpen(true);
  };
  useEffect(() => {
    setCardOrder(readStoredCardOrder(cardOrderStorageKey));
  }, [cardOrderStorageKey]);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedValue = window.localStorage.getItem(announcementReadStorageKey);
    const storedTimestamp = storedValue ? Number(storedValue) : 0;
    setLastReadAnnouncementAt(
      Number.isFinite(storedTimestamp) ? storedTimestamp : 0
    );
  }, [announcementReadStorageKey]);
  useEffect(() => {
    if (
      !isNotificationLogOpen ||
      latestAnnouncementAt <= 0 ||
      latestAnnouncementAt <= lastReadAnnouncementAt
    ) {
      return;
    }

    setLastReadAnnouncementAt(latestAnnouncementAt);
    try {
      window.localStorage.setItem(
        announcementReadStorageKey,
        String(latestAnnouncementAt)
      );
    } catch (error) {
      // Some browsers block localStorage; unread badges still work in memory.
    }
  }, [
    announcementReadStorageKey,
    isNotificationLogOpen,
    lastReadAnnouncementAt,
    latestAnnouncementAt,
  ]);
  const updateCardOrder = useCallback(
    (bucket: CardOrderBucket, nextCards: { id: string }[]) => {
      setCardOrder((current) => {
        const nextOrder = {
          ...current,
          [bucket]: nextCards.map((card) => card.id),
        };
        writeStoredCardOrder(cardOrderStorageKey, nextOrder);
        return nextOrder;
      });
    },
    [cardOrderStorageKey]
  );
  const updatePublicCardOrder = useCallback(
    (nextCards: AnyClueCard[]) => updateCardOrder('public-clues', nextCards),
    [updateCardOrder]
  );
  const updateMyCardOrder = useCallback(
    (nextCards: MurderMysteryClueVaultCardView[]) =>
      updateCardOrder('my-clues', nextCards),
    [updateCardOrder]
  );
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

  useEffect(() => {
    const currentIds = new Set(
      snapshot.clueVault.myClues.map((card) => card.id)
    );
    const previousIds = previousMyClueIdsRef.current;
    previousMyClueIdsRef.current = currentIds;

    if (!previousIds) {
      return;
    }

    const addedCards = snapshot.clueVault.myClues.filter(
      (card) => !previousIds.has(card.id)
    );
    if (
      addedCards.length === 0 ||
      phaseKind !== 'investigate' ||
      activeRound === null
    ) {
      return;
    }

    const latestAddedCard = addedCards[addedCards.length - 1];
    if (
      latestAddedCard &&
      !autoOpenedInvestigationCardIdsRef.current.has(latestAddedCard.id)
    ) {
      autoOpenedInvestigationCardIdsRef.current.add(latestAddedCard.id);
      openCardViewer('my-clues', orderedMyClues, latestAddedCard);
    }
  }, [
    activeRound,
    openCardViewer,
    orderedMyClues,
    phaseKind,
    snapshot.clueVault.myClues,
  ]);

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
    if (mapTargetHighlightTimerRef.current !== null) {
      window.clearTimeout(mapTargetHighlightTimerRef.current);
    }
    mapTargetHighlightSerialRef.current += 1;
    setMapHighlightedTarget({
      targetId,
      serial: mapTargetHighlightSerialRef.current,
    });
    mapTargetHighlightTimerRef.current = window.setTimeout(() => {
      setMapHighlightedTarget((current) =>
        current?.targetId === targetId ? null : current
      );
      mapTargetHighlightTimerRef.current = null;
    }, 2600);
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
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return;
    }
    if (isNotificationLogOpen) {
      setIsNotificationLogOpen(false);
      return;
    }
    if (isFlowOverviewOpen) {
      setIsFlowOverviewOpen(false);
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
    isFlowOverviewOpen,
    isNotificationLogOpen,
    isPublicScriptsOpen,
    isRulebookOpen,
    isSettingsOpen,
    pendingSpecialEventAction,
    selectedCard,
    selectedEvidenceRef,
    selectedPlayer,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (rulebookLiftTimerRef.current !== null) {
        window.clearTimeout(rulebookLiftTimerRef.current);
      }
      if (rulebookCoverResetTimerRef.current !== null) {
        window.clearTimeout(rulebookCoverResetTimerRef.current);
      }
      if (mapTargetHighlightTimerRef.current !== null) {
        window.clearTimeout(mapTargetHighlightTimerRef.current);
      }
    },
    []
  );

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
    const previousReservation = previousReservationRef.current;
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

      const addedBacks = player.heldCardBacks.filter(
        (back) => !previousBackIds.has(back.backId)
      );
      if (addedBacks.length === 0) {
        return;
      }

      if (player.id === sessionId) {
        return;
      }

      const stolenReservedBack =
        previousReservation && player.id !== sessionId
          ? (addedBacks.find(
              (back) => back.backId === previousReservation.backId
            ) ?? null)
          : null;
      const addedBack = stolenReservedBack ?? addedBacks[0];
      if (!addedBack) {
        return;
      }
      const isReservationStolen = Boolean(stolenReservedBack);

      const notice: ClueTakeNotice = {
        id: `${player.id}:${addedBack.backId}:${Date.now()}`,
        kind: isReservationStolen ? 'reservationStolen' : 'take',
        playerId: player.id,
        playerLabel: formatParticipantLabel(player),
        backLabel:
          isReservationStolen && previousReservation
            ? (previousReservation.shortLabel ??
              previousReservation.targetLabel)
            : (addedBack.shortLabel ?? addedBack.targetLabel),
        targetLabel: addedBack.targetLabel,
      };

      if (isReservationStolen || !nextNotice) {
        nextNotice = notice;
      }
    });

    previousHeldBackIdsByPlayerRef.current = current;
    previousReservationRef.current =
      snapshot.investigation.turn?.myReservation ?? null;
    if (nextNotice) {
      setClueTakeNotice(nextNotice);
    }
  }, [sessionId, snapshot.investigation.turn?.myReservation, snapshot.players]);

  useEffect(() => {
    if (!clueTakeNotice) {
      return;
    }

    const duration =
      clueTakeNotice.kind === 'reservationStolen'
        ? RESERVATION_STOLEN_NOTICE_DURATION_MS
        : CLUE_TAKE_NOTICE_DURATION_MS;
    const timer = window.setTimeout(() => {
      setClueTakeNotice((current) =>
        current?.id === clueTakeNotice.id ? null : current
      );
    }, duration);

    return () => window.clearTimeout(timer);
  }, [clueTakeNotice]);

  useEffect(() => {
    if (
      previousPhaseRef.current === 'ROLE_READING' &&
      snapshot.phase !== 'ROLE_READING'
    ) {
      setIsRulebookOpen(false);
    }
    if (previousPhaseRef.current !== snapshot.phase && phaseKind === 'intro') {
      setIntroTab('prologue');
    }
    previousPhaseRef.current = snapshot.phase;
  }, [phaseKind, snapshot.phase]);

  const renderIntroArea = () => {
    const introText =
      snapshot.publicScripts.find((script) => script.current)?.readAloud ??
      currentStep?.readAloud ??
      snapshot.scenario.intro.readAloud;
    const isHostReading = canUseHostTools;
    const introTabs: Array<{ value: IntroTab; label: string }> = [
      { value: 'prologue', label: '프롤로그' },
      { value: 'public-info', label: '캐릭터 선택' },
    ];
    const playerStatusText = isRoleSelectionLocked
      ? '캐릭터 배정이 완료되었습니다.'
      : preferredRoleId
        ? allRoleSelectionsSubmitted
          ? '전원이 선택을 마쳤습니다. 방장에게 캐릭터 배정을 확정해 달라고 요청해주세요.'
          : '선택을 제출했습니다. 다른 참가자의 선택을 기다려주세요.'
        : '캐릭터 선택 탭에서 원하는 캐릭터를 선택하고 제출해주세요.';
    const playerStatusColor =
      !isRoleSelectionLocked && !preferredRoleId ? '#ffcf6a' : '#d8d0bd';

    return (
      <Stack
        spacing={1.3}
        sx={
          introTab === 'prologue'
            ? { height: '100%', minHeight: 0, display: 'flex' }
            : undefined
        }
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 4,
            flex: '0 0 auto',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.14)',
            backgroundColor: 'rgba(11, 15, 20, 0.94)',
            boxShadow: '0 12px 28px rgba(0,0,0,0.24)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={introTab}
            onChange={(_, nextTab: IntroTab) => setIntroTab(nextTab)}
            variant="fullWidth"
            TabIndicatorProps={{ style: { display: 'none' } }}
            sx={{
              p: 0.65,
              minHeight: 48,
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.045)',
              '& .MuiTabs-flexContainer': {
                gap: 0.75,
              },
              '& .MuiTab-root': {
                minHeight: 36,
                borderRadius: 1.4,
                color: '#cfc5ad',
                fontWeight: 950,
                textTransform: 'none',
                border: '1px solid transparent',
              },
              '& .MuiTab-root.Mui-selected': {
                color: '#231604',
                backgroundColor: '#f5c542',
                borderColor: 'rgba(255,246,219,0.36)',
                boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
              },
            }}
          >
            {introTabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                id={`intro-tab-${tab.value}`}
                aria-controls={`intro-tabpanel-${tab.value}`}
              />
            ))}
          </Tabs>
        </Box>

        <Box
          role="tabpanel"
          hidden={introTab !== 'prologue'}
          id="intro-tabpanel-prologue"
          aria-labelledby="intro-tab-prologue"
          sx={
            introTab === 'prologue'
              ? {
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }
              : undefined
          }
        >
          {introTab === 'prologue' ? (
            <Stack spacing={1.3} sx={{ flex: 1, minHeight: 0 }}>
              <Box
                sx={{
                  flex: '0 0 auto',
                  p: { xs: 1.6, md: 2.2 },
                  borderRadius: 3,
                  border: isHostReading
                    ? '1px solid rgba(245, 197, 66, 0.72)'
                    : '1px solid rgba(255,255,255,0.16)',
                  backgroundColor: isHostReading
                    ? 'rgba(245, 197, 66, 0.12)'
                    : 'rgba(255,255,255,0.06)',
                  boxShadow: isHostReading
                    ? '0 18px 42px rgba(0,0,0,0.28)'
                    : 'none',
                }}
              >
                <Stack spacing={1.4}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      icon={<ArticleIcon />}
                      label={currentStep?.label ?? '프롤로그'}
                      color="warning"
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
                        : '방장이 프롤로그를 낭독 중입니다'}
                    </Typography>
                    <Typography
                      sx={{ mt: 0.8, color: '#d8d0bd', lineHeight: 1.65 }}
                    >
                      {isHostReading
                        ? '프롤로그를 모두 들은 뒤 선택하는 것이 기본입니다. 필요하면 듣는 중에도 캐릭터를 고를 수 있습니다.'
                        : '프롤로그를 모두 들은 뒤 선택하는 것이 기본입니다. 필요하면 듣는 중에도 고를 수 있습니다.'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  p: { xs: 1.4, md: 2 },
                  pr: { xs: 1.85, md: 2.7 },
                  scrollbarWidth: 'thin',
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(248,241,222,0.24)',
                    borderRadius: 999,
                  },
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.14)',
                  backgroundColor: 'rgba(11, 15, 20, 0.58)',
                }}
              >
                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.78 }}>
                  {introText}
                </Typography>
              </Box>
            </Stack>
          ) : null}
        </Box>

        <Box
          role="tabpanel"
          hidden={introTab !== 'public-info'}
          id="intro-tabpanel-public-info"
          aria-labelledby="intro-tab-public-info"
        >
          {introTab === 'public-info' ? (
            <RoleSelectionPanel
              roleSelection={snapshot.roleSelection}
              onSubmitRolePreferences={onSubmitRolePreferences}
              canShareRoleSheets={false}
              onShareRoleSheet={onShareRoleSheet}
              title="캐릭터 선택"
              description={ROLE_SELECTION_GUIDE_TEXT}
            />
          ) : null}
        </Box>

        {!isHostReading ? (
          <Typography sx={{ color: playerStatusColor, fontWeight: 900 }}>
            {playerStatusText}
          </Typography>
        ) : null}
      </Stack>
    );
  };

  const renderIntroBriefingArea = () => {
    const briefingText =
      snapshot.publicScripts.find((script) => script.current)?.readAloud ??
      currentStep?.readAloud ??
      snapshot.scenario.intro.readAloud;
    const isHostReading = canUseHostTools;

    return (
      <Stack
        spacing={1.3}
        sx={{ height: '100%', minHeight: 0, display: 'flex' }}
      >
        <Box
          sx={{
            flex: '0 0 auto',
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
                label={currentStep?.label ?? '조사 전 지문'}
                color="warning"
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
                  : '방장이 지문을 낭독 중입니다'}
              </Typography>
              <Typography sx={{ mt: 0.8, color: '#d8d0bd', lineHeight: 1.65 }}>
                {isHostReading
                  ? '지문을 모두 읽은 뒤 아래 버튼으로 다음 단계로 진행하세요.'
                  : '낭독이 끝나면 방장이 다음 단계로 진행합니다.'}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            p: { xs: 1.4, md: 2 },
            pr: { xs: 1.85, md: 2.7 },
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(248,241,222,0.24)',
              borderRadius: 999,
            },
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.14)',
            backgroundColor: 'rgba(11, 15, 20, 0.58)',
          }}
        >
          <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.78 }}>
            {briefingText}
          </Typography>
        </Box>
      </Stack>
    );
  };

  const renderRoleReadingArea = () => (
    <Stack spacing={1.05} sx={{ height: '100%', minHeight: 0 }}>
      <Stack spacing={0.45} sx={{ flex: '0 0 auto' }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Typography
            variant="h5"
            fontWeight={950}
            sx={{
              minWidth: 0,
              lineHeight: 1.15,
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
            }}
          >
            인물 설정서 읽기
          </Typography>
          <AnimatedProgressChip
            count={snapshot.roleReading.readyCount}
            size="small"
            icon={<TaskAltIcon />}
            label={`${snapshot.roleReading.readyCount}/${snapshot.roleReading.totalCount} 읽음`}
            color={snapshot.roleReading.allReady ? 'success' : 'warning'}
            sx={{
              flex: '0 0 auto',
              height: 28,
              fontWeight: 950,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Stack>
        <Typography sx={{ color: '#d8d0bd', lineHeight: 1.55 }}>
          인물 설정서를 읽고 준비되면 아래 버튼을 눌러주세요.
        </Typography>
      </Stack>

      {snapshot.roleSelection.yourAssignedRoleWasRandom ? (
        <Alert
          severity="warning"
          variant="outlined"
          sx={{
            color: '#fff6db',
            borderColor: 'rgba(245, 158, 11, 0.56)',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            py: 0.65,
            '& .MuiAlert-icon': { color: '#ffcf6a' },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#f3dfac',
              lineHeight: 1.45,
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
            }}
          >
            선택이 겹쳐 {preferredRole?.displayName ?? '선택 캐릭터'} 대신{' '}
            {assignedRoleForMismatch?.displayName ??
              snapshot.roleSheet?.displayName ??
              '실제 배정 캐릭터'}
            이 배정되었습니다.
          </Typography>
        </Alert>
      ) : null}

      <RoleReadingAssignedCard
        roleSheet={snapshot.roleSheet}
        isLifted={isRulebookCoverLifted}
        onOpenRulebook={openRoleReadingRulebook}
      />
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
      const mapTargetHighlight =
        mapHighlightedTarget?.targetId === target.id
          ? mapHighlightedTarget
          : null;
      const mapTargetHighlightAnimationName = mapTargetHighlight
        ? `mmMapTargetHighlight${mapTargetHighlight.serial % 2}`
        : null;
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
      const isReserved = target.availableBacks.some(
        (back) =>
          back.isReservedByMe || pendingReservationBackId === back.backId
      );
      const hasReadBack = target.availableBacks.some(
        (back) => back.hasBeenRead
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
        position: 'relative',
        width: '100%',
        minHeight: hasMultipleBacks ? 66 : 48,
        p: 0.65,
        borderRadius: 1.4,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: mapTargetHighlight
          ? 'rgba(245,197,66,0.98)'
          : target.isExhausted
            ? 'rgba(148,163,184,0.28)'
            : isOwnedInvestigationBlocked
              ? 'rgba(148,163,184,0.28)'
              : isReserved
                ? 'rgba(245,197,66,0.82)'
                : 'rgba(142,202,230,0.34)',
        borderStyle: isOwnedInvestigationBlocked ? 'dashed' : 'solid',
        backgroundColor: mapTargetHighlight
          ? 'rgba(245,197,66,0.16)'
          : target.isExhausted
            ? 'rgba(15,23,42,0.5)'
            : isOwnedInvestigationBlocked
              ? 'rgba(15,23,42,0.38)'
              : 'rgba(255,255,255,0.075)',
        color: isOwnedInvestigationBlocked ? '#94a3b8' : '#f8f1de',
        boxShadow: mapTargetHighlight
          ? '0 0 0 2px rgba(245,197,66,0.34), 0 0 0 8px rgba(245,197,66,0.14), 0 12px 24px rgba(0,0,0,0.32)'
          : isOwnedInvestigationBlocked
            ? 'none'
            : isReserved
              ? '0 0 0 1px rgba(245,197,66,0.26), 0 8px 18px rgba(0,0,0,0.26)'
              : '0 8px 18px rgba(0,0,0,0.22)',
        opacity: mapTargetHighlight
          ? 1
          : isOwnedInvestigationBlocked
            ? 0.72
            : targetDisabled
              ? 0.6
              : 1,
        scrollMarginBlock: '40vh',
        transformOrigin: 'center',
        animation: mapTargetHighlightAnimationName
          ? `${mapTargetHighlightAnimationName} 1600ms ease-out`
          : 'none',
        transition:
          'border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          transform: 'none',
        },
        ...(mapTargetHighlightAnimationName
          ? {
              [`@keyframes ${mapTargetHighlightAnimationName}`]: {
                '0%': {
                  transform: 'scale(0.985)',
                  boxShadow:
                    '0 0 0 0 rgba(245,197,66,0.52), 0 8px 18px rgba(0,0,0,0.22)',
                },
                '24%': {
                  transform: 'scale(1.02)',
                  boxShadow:
                    '0 0 0 3px rgba(245,197,66,0.42), 0 0 0 12px rgba(245,197,66,0.2), 0 16px 30px rgba(0,0,0,0.34)',
                },
                '100%': {
                  transform: 'scale(1)',
                  boxShadow:
                    '0 0 0 2px rgba(245,197,66,0.34), 0 0 0 8px rgba(245,197,66,0.14), 0 12px 24px rgba(0,0,0,0.32)',
                },
              },
            }
          : {}),
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
                <Tooltip
                  title={
                    hasReadBack
                      ? READ_REPEAT_BACK_HINT
                      : '해당 단서는 반복조사 가능합니다.'
                  }
                >
                  <Typography
                    aria-label="해당 단서는 반복조사 가능합니다."
                    fontWeight={950}
                    sx={{
                      color: '#8ecae6',
                      fontSize: 17,
                      lineHeight: 1,
                    }}
                  >
                    ∞
                  </Typography>
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
                const isBackRead = back.hasBeenRead;
                const backActionTitle = targetDisabled
                  ? (targetDisabledReason ?? '지금은 선택할 수 없습니다.')
                  : isBackReserved
                    ? '예약 해제'
                    : canActNow
                      ? '가져가기'
                      : '예약하기';
                const backTooltipTitle = isBackRead
                  ? `${backActionTitle} · ${READ_REPEAT_BACK_HINT}`
                  : backActionTitle;
                return (
                  <Tooltip key={back.backId} title={backTooltipTitle}>
                    <Box
                      component="button"
                      type="button"
                      disabled={targetDisabled}
                      onClick={() => handleBackChoice(back)}
                      sx={{
                        minWidth: 0,
                        position: 'relative',
                        height: 23,
                        borderRadius: 1,
                        overflow: 'hidden',
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
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        px: 0.55,
                      }}
                    >
                      {isBackReserved
                        ? '내 예약'
                        : (back.shortLabel ?? CARD_BACK_LABEL)}
                      {isBackRead ? <ReadRepeatCornerMark size={7} /> : null}
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
        const firstBackActionTitle = targetDisabled
          ? (targetDisabledReason ?? '지금은 선택할 수 없습니다.')
          : isBackReserved
            ? '예약 해제'
            : canActNow
              ? '가져가기'
              : '예약하기';
        const firstBackTooltipTitle = firstBack.hasBeenRead
          ? `${firstBackActionTitle} · ${READ_REPEAT_BACK_HINT}`
          : firstBackActionTitle;

        return (
          <Tooltip key={target.id} title={firstBackTooltipTitle}>
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
              {firstBack.hasBeenRead ? <ReadRepeatCornerMark size={9} /> : null}
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
      <Box
        sx={{
          p: { xs: 1, md: 1.2 },
          borderRadius: 2.4,
          border: '1px solid',
          borderColor: canActNow ? 'rgba(74, 222, 128, 0.9)' : 'transparent',
          backgroundColor: canActNow
            ? 'rgba(22, 101, 52, 0.08)'
            : 'transparent',
          boxShadow: canActNow
            ? '0 0 0 1px rgba(74, 222, 128, 0.18), 0 18px 42px rgba(0,0,0,0.28)'
            : 'none',
          transition:
            'border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease',
        }}
      >
        <Stack spacing={{ xs: 0.95, md: 1.6 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 0.75, md: 1.4 }}
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <Box sx={{ flex: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="h5" fontWeight={950}>
                  {activeRound ? `${activeRound}라운드 조사` : '조사 대기'}
                </Typography>
                {selfInvestigationProgress ? (
                  <Chip
                    size="small"
                    label={`${selfInvestigationProgress.completedCount}/${selfInvestigationProgress.requiredCount}`}
                    aria-label={`내 조사 진행 ${selfInvestigationProgress.completedCount}/${selfInvestigationProgress.requiredCount}`}
                    sx={{
                      flex: '0 0 auto',
                      height: 24,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      color: '#f8f1de',
                      fontWeight: 950,
                    }}
                  />
                ) : null}
              </Stack>
              <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
                {canActNow &&
                snapshot.investigation.turn?.extraInvestigationPending
                  ? '전체 공개 단서를 확인했습니다. 한 번 더 조사할 수 있습니다.'
                  : canActNow
                    ? '내 차례입니다. 테이블 위 뒷면 카드 한 장을 가져가세요.'
                    : '내 차례가 아니면 뒷면 카드를 눌러 예약할 수 있습니다.'}
              </Typography>
            </Box>
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
                    <Typography
                      fontWeight={950}
                      sx={{ flex: 1, minWidth: 120 }}
                    >
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
                      <ExtraInvestigationLegend />
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
                        <Divider
                          sx={{ borderColor: 'rgba(255,255,255,0.12)' }}
                        />
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
      </Box>
    );
  };

  const renderPublicClues = () => (
    <Stack spacing={1.2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <StyleIcon fontSize="small" />
        <Typography fontWeight={950}>공개된 단서</Typography>
        <Chip size="small" label={`${orderedPublicClues.length}장`} />
      </Stack>
      {orderedPublicClues.length > 0 ? (
        <SortableClueCardGrid
          cards={orderedPublicClues}
          onReorder={updatePublicCardOrder}
          renderCard={(card) => (
            <EvidenceCardFace
              key={`public:${card.id}`}
              card={card}
              compactPreview
              previewLineClamp={1}
              previewMaxLength={36}
              cardMinHeight={132}
              mediaHeight={58}
              onOpen={(openedCard) =>
                openCardViewer('public-clues', orderedPublicClues, openedCard)
              }
            />
          )}
        />
      ) : (
        <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
          아직 테이블 중앙에 공개된 단서가 없습니다.
        </Typography>
      )}
    </Stack>
  );

  const renderDiscussionArea = () => {
    const hasAnyPublicCard = orderedDiscussionPublicClues.length > 0;
    const reportableSpecialEvents = snapshot.specialEvents;

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
                필요한 개인 카드는 전체공개하기로 테이블에 올리고, 맵과 단서를
                함께 보며 결론을 정리하세요.
              </Typography>
            </Box>
          </Stack>
        </Box>

        {reportableSpecialEvents.length > 0 ? (
          <Stack spacing={1}>
            {reportableSpecialEvents.map((event) => (
              <Box
                key={`discussion-special-event:${event.id}`}
                sx={{
                  p: { xs: 1.2, md: 1.4 },
                  borderRadius: 2,
                  border: '1px solid rgba(245, 197, 66, 0.48)',
                  backgroundColor: 'rgba(245, 197, 66, 0.1)',
                  boxShadow: '0 16px 34px rgba(0,0,0,0.22)',
                }}
              >
                <Stack spacing={1.1}>
                  <Stack direction="row" spacing={0.9} alignItems="center">
                    <LockIcon
                      fontSize="small"
                      sx={{ color: '#f5c542', flex: '0 0 auto' }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={950}>잠금 증언 신고</Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.25,
                          color: '#f5e7bf',
                          lineHeight: 1.55,
                          wordBreak: 'keep-all',
                        }}
                      >
                        여우 조희수가 먼저 한다정을 범인 후보로 언급했을 때만
                        누르세요. 다른 사람이 먼저 제기했다면 폐기 처리하세요.
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={0.8}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      startIcon={<TaskAltIcon />}
                      onClick={() =>
                        requestSpecialEventReport(event.id, 'reveal')
                      }
                      sx={{ fontWeight: 900 }}
                    >
                      여우가 한다정을 범인 후보로 올렸어요
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      startIcon={<LockIcon />}
                      onClick={() =>
                        requestSpecialEventReport(event.id, 'seal')
                      }
                      sx={{
                        borderColor: 'rgba(245, 231, 191, 0.45)',
                        color: '#f5e7bf',
                        fontWeight: 900,
                      }}
                    >
                      다른 사람이 먼저 말했어요
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : null}

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
              label={`${orderedDiscussionPublicClues.length}장`}
              sx={{
                height: 24,
                backgroundColor: 'rgba(245, 197, 66, 0.24)',
                border: '1px solid rgba(245, 197, 66, 0.64)',
                color: '#f8f1de',
                fontWeight: 950,
                '& .MuiChip-label': { px: 0.9 },
              }}
            />
          </Stack>

          {!hasAnyPublicCard ? (
            <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
              아직 전체 공개된 단서가 없습니다.
            </Typography>
          ) : null}

          {hasAnyPublicCard ? (
            <SortableClueCardGrid
              cards={orderedDiscussionPublicClues}
              onReorder={updatePublicCardOrder}
              renderCard={(card) => {
                const specialEventSourceLabel = getSpecialEventSourceLabel(
                  card,
                  investigationTargetIds
                );

                return (
                  <EvidenceCardFace
                    key={`discussion:public:${card.id}`}
                    card={card}
                    compactPreview
                    previewLineClamp={1}
                    previewMaxLength={36}
                    cardMinHeight={132}
                    mediaHeight={58}
                    highlightLabel={
                      specialEventSourceLabel ? '잠금 증언 공개' : undefined
                    }
                    highlightTooltip={
                      specialEventSourceLabel
                        ? `${specialEventSourceLabel}로 공개된 카드입니다.`
                        : undefined
                    }
                    onOpen={(openedCard) =>
                      openCardViewer(
                        'discussion:public',
                        orderedDiscussionPublicClues,
                        openedCard
                      )
                    }
                  />
                );
              }}
            />
          ) : null}
        </Stack>
      </Stack>
    );
  };

  const renderPresentationArea = () => {
    const hasAnyPublicCard = orderedDiscussionPublicClues.length > 0;

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
                {currentStep?.label ?? '개인 발표'}
              </Typography>
              <Typography sx={{ mt: 0.6, color: '#f5e7bf', lineHeight: 1.6 }}>
                {currentStep?.description ??
                  '원하는 순서대로 본인 발표 타이머를 시작하고, 사건의 전말을 2분 안에 설명하세요.'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color={
                  snapshot.presentation.allCompleted ? 'success' : 'warning'
                }
                label={`발표 ${snapshot.presentation.completedCount}/${snapshot.presentation.totalCount}`}
                sx={{ fontWeight: 900 }}
              />
              {activePresentationSpeakerLabel ? (
                <Chip
                  size="small"
                  color="warning"
                  icon={<TimerIcon />}
                  label={`${activePresentationSpeakerLabel} ${formatSeconds(
                    presentationRemainingSec
                  )}`}
                  sx={{ fontWeight: 900 }}
                />
              ) : null}
            </Stack>
          </Stack>
        </Box>

        <Stack spacing={0.9}>
          {snapshot.presentation.speakers.map((speaker) => {
            const player =
              snapshot.players.find((entry) => entry.id === speaker.playerId) ??
              null;
            const isSelfSpeaker = speaker.playerId === sessionId;
            const isSpeaking = speaker.status === 'speaking';
            const isDone = speaker.status === 'done';
            const statusLabel = isSpeaking
              ? '발표 중'
              : isDone
                ? '완료'
                : '대기';
            const statusColor: ChipProps['color'] = isSpeaking
              ? 'warning'
              : isDone
                ? 'success'
                : 'default';

            return (
              <Box
                key={`presentation-speaker:${speaker.playerId}`}
                sx={{
                  p: { xs: 1.1, sm: 1.25 },
                  borderRadius: 2,
                  border: isSpeaking
                    ? '1px solid rgba(245, 197, 66, 0.66)'
                    : '1px solid rgba(255,255,255,0.13)',
                  backgroundColor: isSpeaking
                    ? 'rgba(245, 197, 66, 0.13)'
                    : 'rgba(15, 19, 24, 0.68)',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ minWidth: 0, flex: 1 }}
                  >
                    <CharacterPortraitFrame
                      src={player?.rolePortraitSrc ?? undefined}
                      alt={player?.rolePortraitAlt ?? undefined}
                      label={
                        player?.roleDisplayName ??
                        speaker.roleDisplayName ??
                        speaker.playerName
                      }
                      variant="thumbnail"
                      sx={{
                        width: { xs: 46, sm: 52 },
                        boxShadow: '0 8px 20px rgba(0,0,0,0.28)',
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={0.7}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Typography fontWeight={950}>
                          {player
                            ? formatParticipantLabel(player)
                            : speaker.playerName}
                        </Typography>
                        {isSelfSpeaker ? (
                          <Chip size="small" label="나" sx={{ height: 22 }} />
                        ) : null}
                      </Stack>
                      <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
                        {speaker.roleDisplayName ?? '역할 미확정'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={0.7}
                    alignItems="center"
                    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Chip
                      size="small"
                      color={statusColor}
                      variant={
                        statusColor === 'default' ? 'outlined' : 'filled'
                      }
                      label={statusLabel}
                      sx={{
                        color:
                          statusColor === 'default' ? '#f8f1de' : undefined,
                        borderColor:
                          statusColor === 'default'
                            ? 'rgba(255,255,255,0.28)'
                            : undefined,
                        fontWeight: 900,
                      }}
                    />
                    {isSpeaking ? (
                      <Chip
                        size="small"
                        color="warning"
                        icon={<TimerIcon />}
                        label={formatSeconds(presentationRemainingSec)}
                        sx={{ fontWeight: 900 }}
                      />
                    ) : null}
                    {isSelfSpeaker && snapshot.presentation.canStart ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        startIcon={<TimerIcon />}
                        onClick={onStartPresentationTimer}
                        sx={{ fontWeight: 900 }}
                      >
                        2분 발표 시작
                      </Button>
                    ) : null}
                    {isSelfSpeaker && snapshot.presentation.canEnd ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<TaskAltIcon />}
                        onClick={onEndPresentationTimer}
                        sx={{ fontWeight: 900 }}
                      >
                        발표 종료
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>

        <Stack spacing={1.2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <StyleIcon fontSize="small" />
            <Typography fontWeight={950}>발표 참고 공개 카드</Typography>
            <Chip
              size="small"
              label={`${orderedDiscussionPublicClues.length}장`}
              sx={{
                height: 24,
                backgroundColor: 'rgba(245, 197, 66, 0.24)',
                border: '1px solid rgba(245, 197, 66, 0.64)',
                color: '#f8f1de',
                fontWeight: 950,
                '& .MuiChip-label': { px: 0.9 },
              }}
            />
          </Stack>

          {!hasAnyPublicCard ? (
            <Typography variant="body2" sx={{ color: '#d8d0bd' }}>
              아직 전체 공개된 단서가 없습니다.
            </Typography>
          ) : null}

          {hasAnyPublicCard ? (
            <SortableClueCardGrid
              cards={orderedDiscussionPublicClues}
              onReorder={updatePublicCardOrder}
              renderCard={(card) => {
                const specialEventSourceLabel = getSpecialEventSourceLabel(
                  card,
                  investigationTargetIds
                );

                return (
                  <EvidenceCardFace
                    key={`presentation:public:${card.id}`}
                    card={card}
                    compactPreview
                    previewLineClamp={1}
                    previewMaxLength={36}
                    cardMinHeight={132}
                    mediaHeight={58}
                    highlightLabel={
                      specialEventSourceLabel ? '잠금 증언 공개' : undefined
                    }
                    highlightTooltip={
                      specialEventSourceLabel
                        ? `${specialEventSourceLabel}로 공개된 카드입니다.`
                        : undefined
                    }
                    onOpen={(openedCard) =>
                      openCardViewer(
                        'discussion:public',
                        orderedDiscussionPublicClues,
                        openedCard
                      )
                    }
                  />
                );
              }}
            />
          ) : null}
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
      {snapshot.finalVote.reveal ? (
        <FinalVoteRevealPanel
          reveal={snapshot.finalVote.reveal}
          players={snapshot.players}
          options={snapshot.finalVote.options}
        />
      ) : null}
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
        {snapshot.finalVote.reveal ? (
          <FinalVoteRevealPanel
            reveal={snapshot.finalVote.reveal}
            players={snapshot.players}
            options={snapshot.finalVote.options}
          />
        ) : null}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <AnimatedProgressChip
            count={endingChoices.submittedCount}
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
    if (!shouldShowFloatingActionDock) {
      return null;
    }

    if (phaseKind === 'role_reading') {
      return (
        <Box
          sx={{
            position: 'fixed',
            left: { xs: 10, md: '50%' },
            right: { xs: 10, md: 'auto' },
            bottom: { xs: 14, md: 18 },
            transform: { xs: 'none', md: 'translateX(-50%)' },
            zIndex: 1500,
            width: { xs: 'auto', md: 'min(560px, calc(100vw - 360px))' },
            pointerEvents: 'auto',
          }}
        >
          <Button
            fullWidth
            size="large"
            variant="contained"
            color="warning"
            startIcon={<TaskAltIcon />}
            disabled={!selfPlayer || snapshot.roleReading.yourReady}
            onClick={onMarkRoleSheetRead}
            sx={{
              minHeight: 52,
              borderRadius: 1.7,
              fontWeight: 950,
              fontSize: 16,
              boxShadow: '0 16px 36px rgba(0,0,0,0.42)',
              '&.Mui-disabled': {
                backgroundColor: '#22643a',
                color: '#eafff0',
                opacity: 1,
                boxShadow: '0 12px 28px rgba(0,0,0,0.34)',
              },
            }}
          >
            다 읽었어요
          </Button>
        </Box>
      );
    }

    let title = '';
    let description = '';
    let chips: React.ReactNode = null;
    let actions: React.ReactNode = null;
    const hostAdvanceAction = showNextPhaseTool ? (
      <Button
        size="small"
        variant="contained"
        color="success"
        startIcon={<SkipNextIcon />}
        disabled={!canAdvancePhase}
        title={nextPhaseTooltip}
        onClick={onNextPhase}
      >
        다음 단계
      </Button>
    ) : null;

    if (phaseKind === 'investigate') {
      title = canActNow
        ? snapshot.investigation.turn?.extraInvestigationPending
          ? '지금 추가 조사해야 합니다'
          : '지금 조사해야 합니다'
        : currentTurnLabel
          ? `${currentTurnLabel} 조사 차례입니다`
          : '다른 플레이어 조사 차례입니다';
      description = canActNow ? '카드 한 장을 바로 선택하세요.' : '';
      chips = canActNow ? (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Chip size="small" color="error" label="즉시 행동" />
        </Stack>
      ) : null;
      actions = (
        <Button
          size={canActNow ? 'medium' : 'small'}
          variant={canActNow ? 'contained' : 'outlined'}
          color={canActNow ? 'warning' : 'inherit'}
          startIcon={canActNow ? <SearchIcon /> : undefined}
          disabled={!canActNow}
          onClick={bringPhaseActionsIntoView}
          sx={
            canActNow
              ? {
                  minHeight: 40,
                  px: 1.6,
                  border: '1px solid rgba(255,255,255,0.42)',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.34)',
                }
              : {
                  minHeight: 38,
                  px: 1.4,
                  border: '1px solid rgba(148,163,184,0.28)',
                  backgroundColor: 'rgba(148,163,184,0.08)',
                  color: 'rgba(203,213,225,0.55)',
                  boxShadow: 'none',
                  '&.Mui-disabled': {
                    border: '1px solid rgba(148,163,184,0.28)',
                    backgroundColor: 'rgba(148,163,184,0.1)',
                    color: 'rgba(203,213,225,0.5)',
                    WebkitTextFillColor: 'rgba(203,213,225,0.5)',
                  },
                }
          }
        >
          조사하러 가기
        </Button>
      );
    } else if (phaseKind === 'discuss' && showNextPhaseTool) {
      title = '회의 진행';
      description = '회의가 끝났다면 방장이 다음 단계로 진행합니다.';
      chips = currentStep?.round ? (
        <Chip size="small" color="warning" label={`${currentStep.round}R`} />
      ) : null;
      actions = hostAdvanceAction;
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
    } else if (phaseKind === 'presentation') {
      if (snapshot.presentation.canEnd) {
        title = '내 발표 진행 중';
        description = `${formatSeconds(presentationRemainingSec)} 남았습니다. 발표를 마쳤다면 종료할 수 있습니다.`;
        chips = <Chip size="small" color="warning" label="발표 중" />;
        actions = (
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<TaskAltIcon />}
            onClick={onEndPresentationTimer}
          >
            발표 종료
          </Button>
        );
      } else if (snapshot.presentation.canStart) {
        title = '개인 발표를 시작하세요';
        description = '준비가 되면 2분 타이머를 시작하세요.';
        chips = <Chip size="small" color="warning" label="내 차례 가능" />;
        actions = (
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<TimerIcon />}
            onClick={onStartPresentationTimer}
          >
            2분 발표 시작
          </Button>
        );
      } else if (activePresentationSpeakerLabel) {
        title = `${activePresentationSpeakerLabel} 발표 중`;
        description = '현재 발표가 끝나면 다른 사람이 시작할 수 있습니다.';
        chips = (
          <Chip
            size="small"
            color="warning"
            label={formatSeconds(presentationRemainingSec)}
          />
        );
      } else if (snapshot.presentation.allCompleted) {
        title = '개인 발표 완료';
        description = '방장이 다음 단계로 넘기면 최종 투표가 시작됩니다.';
        chips = <Chip size="small" color="success" label="전원 완료" />;
      }
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
          <AnimatedProgressChip
            count={endingChoices.submittedCount}
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
        auxiliaryActions={phaseKind === 'discuss' ? null : hostAdvanceAction}
        tone={phaseKind === 'investigate' && canActNow ? 'urgent' : 'default'}
        bottomOffset={{
          xs: isSmall ? 74 : 16,
          md: 18,
        }}
      />
    );
  };

  const renderHostBriefingDock = () => {
    if (!shouldShowHostBriefingDock) {
      return null;
    }

    const currentStepIndex = snapshot.scenario.flow.steps.findIndex(
      (step) => step.id === snapshot.phase
    );
    const nextStep =
      currentStepIndex >= 0
        ? (snapshot.scenario.flow.steps[currentStepIndex + 1] ?? null)
        : null;
    const buttonLabel =
      nextStep?.kind === 'investigate'
        ? `${nextStep.label} 시작`
        : '다 읽고 다음 단계로';

    return (
      <Box
        sx={{
          position: { xs: 'relative', md: 'fixed' },
          left: { xs: 'auto', md: '50%' },
          right: { xs: 'auto', md: 'auto' },
          bottom: { xs: 'auto', md: 18 },
          transform: { xs: 'none', md: 'translateX(-50%)' },
          zIndex: 1200,
          width: { xs: 'auto', md: 'min(640px, calc(100vw - 320px))' },
          maxWidth: { md: 640 },
          mx: { xs: 1.25, md: 0 },
          mb: { xs: 1, md: 0 },
          flexShrink: 0,
          pointerEvents: 'auto',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0.9}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{
            p: 1,
            borderRadius: 2,
            border: '1px solid rgba(74, 222, 128, 0.42)',
            backgroundColor: 'rgba(15, 38, 25, 0.96)',
            boxShadow: '0 18px 38px rgba(0,0,0,0.32)',
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={950} sx={{ color: '#f8f1de' }}>
              지문 낭독
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#cfc5ad',
                display: 'block',
                mt: 0.25,
                wordBreak: 'keep-all',
              }}
            >
              지문을 모두 읽었다면 다음 단계로 진행하세요.
            </Typography>
          </Box>
          <Button
            disableElevation
            variant="contained"
            color="success"
            startIcon={<TaskAltIcon />}
            onClick={onNextPhase}
            sx={{
              minHeight: 38,
              px: 1.5,
              borderRadius: 1.4,
              fontWeight: 950,
              whiteSpace: 'nowrap',
            }}
          >
            {buttonLabel}
          </Button>
        </Stack>
      </Box>
    );
  };

  const renderHostRoleSelectionDock = () => {
    if (!shouldShowHostRoleSelectionDock) {
      return null;
    }

    const isLobbyPhase = phaseKind === 'lobby';
    const allConnected = connectedPlayerCount >= requiredPlayerCount;
    const allSubmitted = submittedRoleSelectionCount >= requiredPlayerCount;
    const canAssignPreferredRolesDirectly =
      !isLobbyPhase &&
      allConnected &&
      allSubmitted &&
      hasConflictFreeRoleSelections;
    const canProceed = isLobbyPhase
      ? allConnected
      : allConnected && allSubmitted;
    const dockTone = isLobbyPhase
      ? allConnected
        ? 'success'
        : 'warning'
      : allSubmitted
        ? 'success'
        : 'warning';
    const buttonLabel = isLobbyPhase ? '프롤로그 시작' : '이대로 캐릭터 배정';
    const helperText = isLobbyPhase
      ? allConnected
        ? '전원이 모였습니다. 아래 버튼을 눌러 낭독 화면으로 넘어가세요.'
        : '아직 입장하지 않은 참가자가 있습니다.'
      : canAssignPreferredRolesDirectly
        ? '아래 버튼을 누르면 원하는 캐릭터 그대로 진행됩니다.'
        : !allConnected
          ? '참가자 재접속 후 배정을 확정할 수 있습니다.'
          : allSubmitted
            ? '선택이 겹친 캐릭터는 자동 조정됩니다.\n필요하면 캐릭터를 겹치지않게 조정 후 확정하셔도 좋습니다.'
            : '프롤로그를 읽고 참가자들이 캐릭터를 고르면 아래 버튼이 켜집니다.';
    const dockTitle = isLobbyPhase
      ? allConnected
        ? '버튼 클릭 후 낭독'
        : '참가자 대기 중'
      : canAssignPreferredRolesDirectly
        ? '겹침 없이 전원 선택 완료'
        : allSubmitted
          ? '전원 선택 완료'
          : '읽은 뒤 캐릭터 선택';
    const shouldUseMutedDisabledButton = !canProceed;

    return (
      <Box
        sx={{
          position: { xs: 'relative', md: 'fixed' },
          left: { xs: 'auto', md: '50%' },
          right: { xs: 'auto', md: 'auto' },
          bottom: { xs: 'auto', md: 18 },
          transform: { xs: 'none', md: 'translateX(-50%)' },
          zIndex: 1200,
          width: { xs: 'auto', md: 'min(760px, calc(100vw - 320px))' },
          maxWidth: { md: 760 },
          mx: { xs: 1.25, md: 0 },
          mb: { xs: 1, md: 0 },
          flexShrink: 0,
          pointerEvents: 'auto',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0.9}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{
            p: 1,
            borderRadius: 2,
            border: `1px solid ${
              dockTone === 'success'
                ? 'rgba(74, 222, 128, 0.42)'
                : 'rgba(245, 158, 11, 0.34)'
            }`,
            backgroundColor:
              dockTone === 'success'
                ? 'rgba(15, 38, 25, 0.96)'
                : 'rgba(20, 26, 24, 0.94)',
            boxShadow: '0 18px 38px rgba(0,0,0,0.32)',
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              spacing={0.7}
              alignItems="center"
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              <Typography fontWeight={950} sx={{ color: '#f8f1de' }}>
                {dockTitle}
              </Typography>
              {canAssignPreferredRolesDirectly ? (
                <Chip
                  size="small"
                  label="겹침 없음"
                  color="success"
                  sx={{ height: 24, fontWeight: 900 }}
                />
              ) : null}
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: '#cfc5ad',
                display: 'block',
                mt: 0.25,
                whiteSpace: 'pre-line',
                wordBreak: 'keep-all',
              }}
            >
              {helperText}
            </Typography>
          </Box>
          <Button
            disableElevation
            disabled={!canProceed}
            variant="contained"
            color={dockTone}
            onClick={onNextPhase}
            sx={{
              minHeight: 38,
              px: 1.5,
              borderRadius: 1.4,
              fontWeight: 950,
              whiteSpace: 'nowrap',
              border: '1px solid transparent',
              '&.Mui-disabled': {
                color: shouldUseMutedDisabledButton
                  ? 'rgba(248, 241, 222, 0.42)'
                  : dockTone === 'success'
                    ? '#052e16'
                    : '#3a2600',
                backgroundColor: shouldUseMutedDisabledButton
                  ? 'rgba(248, 241, 222, 0.12)'
                  : dockTone === 'success'
                    ? '#86efac'
                    : '#fbbf24',
                borderColor: shouldUseMutedDisabledButton
                  ? 'rgba(248, 241, 222, 0.18)'
                  : 'transparent',
                boxShadow: 'none',
              },
            }}
          >
            {buttonLabel}
          </Button>
        </Stack>
      </Box>
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

        {snapshot.finalVote.reveal ? (
          <FinalVoteRevealPanel
            reveal={snapshot.finalVote.reveal}
            players={snapshot.players}
            options={snapshot.finalVote.options}
          />
        ) : null}

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
                감상전처럼 정답 루트에서 갈라지는 주요 선택 엔딩을 함께 확인할
                수 있습니다.
              </Typography>
            </Box>

            {endbook.alternateOutcomes.map((outcome) => {
              const alternateText = [outcome.title, outcome.body]
                .filter(Boolean)
                .join('\n\n');
              const outcomeSummary = outcome.selectedOptionLabel
                ? `${outcome.choiceLabel} - 다른 선택: ${outcome.alternateOptionLabel}`
                : `${outcome.choiceLabel} - 선택 엔딩: ${outcome.alternateOptionLabel}`;

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
                      <Typography fontWeight={950}>{outcomeSummary}</Typography>
                      {outcome.selectedOptionLabel ? (
                        <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
                          {`실제 선택: ${outcome.selectedOptionLabel}`}
                        </Typography>
                      ) : null}
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
      const allConnected = connectedPlayerCount >= requiredPlayerCount;

      return (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={950} sx={{ flex: 1 }}>
              참가 현황
            </Typography>
            <AnimatedProgressChip
              animateOnMount
              count={connectedPlayerCount}
              label={`접속 ${connectedPlayerCount}/${requiredPlayerCount}`}
              color={allConnected ? 'success' : 'warning'}
              sx={{ fontWeight: 900 }}
            />
          </Stack>
          <Alert
            severity={canUseHostTools ? 'info' : 'warning'}
            variant="outlined"
            sx={{
              borderColor: canUseHostTools
                ? 'rgba(96, 165, 250, 0.44)'
                : 'rgba(245, 158, 11, 0.44)',
              backgroundColor: canUseHostTools
                ? 'rgba(59, 130, 246, 0.1)'
                : 'rgba(245, 158, 11, 0.1)',
              color: '#f8f1de',
              '& .MuiAlert-icon': {
                color: canUseHostTools ? '#93c5fd' : '#ffcf6a',
              },
            }}
          >
            <Typography fontWeight={950} sx={{ lineHeight: 1.35 }}>
              {canUseHostTools
                ? '캐릭터 선택은 프롤로그 이후에 진행됩니다.'
                : '지금은 캐릭터 공개정보만 확인합니다.'}
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 0.3, color: '#d8d0bd', lineHeight: 1.45 }}
            >
              프롤로그를 모두 들은 뒤 선택하는 것이 기본이며, 필요하면 듣는
              중에도 선택할 수 있습니다.
            </Typography>
          </Alert>
          <RoleSelectionPanel
            roleSelection={snapshot.roleSelection}
            onSubmitRolePreferences={onSubmitRolePreferences}
            canShareRoleSheets={canUseHostTools}
            onShareRoleSheet={onShareRoleSheet}
            title="캐릭터 공개정보"
            allowRoleChoice={false}
          />
        </Stack>
      );
    }

    if (phaseKind === 'role_selection') {
      return (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={950} sx={{ flex: 1 }}>
              캐릭터 선택
            </Typography>
            <Chip
              label={`제출 ${submittedRoleSelectionCount}/${requiredPlayerCount}`}
              color={
                submittedRoleSelectionCount >= requiredPlayerCount
                  ? 'success'
                  : 'warning'
              }
              sx={{ fontWeight: 900 }}
            />
          </Stack>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: '#d8d0bd',
              fontWeight: 900,
              lineHeight: 1.45,
            }}
          >
            {ROLE_SELECTION_GUIDE_TEXT}
          </Typography>
          <RoleSelectionPanel
            roleSelection={snapshot.roleSelection}
            onSubmitRolePreferences={onSubmitRolePreferences}
            canShareRoleSheets={false}
            onShareRoleSheet={onShareRoleSheet}
          />
        </Stack>
      );
    }

    if (phaseKind === 'intro') {
      if (isPreRoundBriefingStep) {
        return renderIntroBriefingArea();
      }
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

    if (phaseKind === 'presentation') {
      return renderPresentationArea();
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
      ref={gameFrameRef}
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
          label={headerTimerLabel}
          color={isHeaderTimerExpired ? 'warning' : 'default'}
          size="small"
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: { xs: 72, md: 84 },
            height: { xs: 28, md: 32 },
            backgroundColor: isHeaderTimerExpired
              ? undefined
              : 'rgba(255,255,255,0.12)',
            color: isHeaderTimerExpired ? undefined : '#f8f1de',
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
          <Tooltip title="전체 진행표">
            <IconButton
              onClick={() => setIsFlowOverviewOpen(true)}
              sx={{ color: '#f8f1de' }}
            >
              <TimelineIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="알림">
            <IconButton
              onClick={() => setIsNotificationLogOpen(true)}
              sx={{ color: '#f8f1de' }}
            >
              <Badge
                color="warning"
                badgeContent={unreadAnnouncementCount}
                max={99}
              >
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="설정">
            <IconButton
              onClick={() => setIsSettingsOpen(true)}
              sx={{ color: '#f8f1de' }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {shouldShowRoleSelectionMarkerRail ? (
        <RoleSelectionMarkerRail
          players={snapshot.roleSelection.players}
          sessionId={sessionId}
          requiredPlayerCount={requiredPlayerCount}
        />
      ) : shouldShowPlayerMarkerRail ? (
        <PlayerMarkerRail
          players={snapshot.players}
          sessionId={sessionId}
          clueTakeHighlightPlayerId={clueTakeNotice?.playerId ?? null}
          investigationProgressByPlayerId={
            shouldShowInvestigationProgress
              ? investigationProgressByPlayerId
              : undefined
          }
          roleReadingReadyByPlayerId={
            phaseKind === 'role_reading'
              ? roleReadingReadyByPlayerId
              : undefined
          }
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
          pb: mainBottomPadding,
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
            pb: phasePanelBottomPadding,
            overflow:
              isScriptReadingLayout || phaseKind === 'role_reading'
                ? 'hidden'
                : 'auto',
            touchAction: phaseKind === 'role_reading' ? 'none' : undefined,
            overscrollBehavior:
              phaseKind === 'role_reading' ? 'none' : undefined,
          }}
        >
          <Stack
            spacing={1.8}
            sx={
              isScriptReadingLayout || phaseKind === 'role_reading'
                ? { height: '100%', minHeight: 0 }
                : undefined
            }
          >
            {renderPhaseBody()}
            {shouldShowPublicClues ? (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.14)' }} />
                {renderPublicClues()}
              </>
            ) : null}
          </Stack>
        </Box>

        {!isSmall && shouldShowDeskPanel ? (
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
              cardCount={privateCardCount}
              publicScriptCount={snapshot.publicScripts.length}
              canOpenRulebook={Boolean(snapshot.roleSheet)}
              canOpenPublicScripts={snapshot.publicScripts.length > 0}
              canOpenPrivateCards={canOpenPrivateCards}
              onOpenRulebook={() => setIsRulebookOpen(true)}
              onOpenPublicScripts={() => setIsPublicScriptsOpen(true)}
              onOpenPrivateCards={openPrivateCards}
            />
          </Stack>
        ) : null}
      </Box>

      {shouldShowMobileDeskPanel ? (
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
            cardCount={privateCardCount}
            publicScriptCount={snapshot.publicScripts.length}
            canOpenRulebook={Boolean(snapshot.roleSheet)}
            canOpenPublicScripts={snapshot.publicScripts.length > 0}
            canOpenPrivateCards={canOpenPrivateCards}
            onOpenRulebook={() => setIsRulebookOpen(true)}
            onOpenPublicScripts={() => setIsPublicScriptsOpen(true)}
            onOpenPrivateCards={openPrivateCards}
          />
        </Box>
      ) : null}

      {renderHostRoleSelectionDock()}
      {renderHostBriefingDock()}
      {renderFloatingActionDock()}
      <ClueTakeOverlay
        notice={clueTakeNotice}
        topOffset={{
          xs: shouldShowMarkerRail ? 118 : 60,
          md: shouldShowMarkerRail ? 126 : 66,
        }}
      />
      {shouldShowInvestigationMapFab && snapshot.investigation.map?.scene ? (
        <InvestigationMapFab
          scene={snapshot.investigation.map.scene}
          bottomOffset={floatingFabBottomOffset}
          frameRef={gameFrameRef}
          onOpen={() => setIsMapDialogOpen(true)}
        />
      ) : null}
      {pinnedCard && !selectedCard ? (
        <PinnedClueFab
          card={pinnedCard}
          bottomOffset={floatingFabBottomOffset}
          frameRef={gameFrameRef}
          onOpen={openPinnedClue}
        />
      ) : null}

      <PublicCoverDialog
        open={Boolean(selectedPlayer)}
        player={selectedPlayer}
        isSelf={selectedPlayer?.id === sessionId}
        canOpenRulebook={Boolean(snapshot.roleSheet)}
        canOpenPrivateCards={canOpenPrivateCards}
        fullScreen={isSmall}
        selfPrivateCards={selfPrivateOnlyClues}
        onClose={() => setSelectedPlayerId(null)}
        onOpenRulebook={() => {
          setSelectedPlayerId(null);
          setIsRulebookOpen(true);
        }}
        onOpenPrivateCards={() => {
          setSelectedPlayerId(null);
          openPrivateCards();
        }}
        onOpenCard={(card) =>
          openCardViewer(
            `player:${selectedPlayer?.id}:public`,
            selectedPlayer?.publicRevealedClues ?? [],
            card
          )
        }
        onOpenSelfPrivateCard={(card) =>
          openCardViewer('my-private-clues', selfPrivateOnlyClues, card)
        }
      />
      <FlowOverviewDialog
        open={isFlowOverviewOpen}
        snapshot={snapshot}
        fullScreen={isSmall}
        onClose={() => setIsFlowOverviewOpen(false)}
      />
      <NotificationLogDialog
        open={isNotificationLogOpen}
        announcements={snapshot.announcements}
        fullScreen={isSmall}
        onClose={() => setIsNotificationLogOpen(false)}
      />
      <SettingsDialog
        open={isSettingsOpen}
        playerName={selfPlayerName}
        bgmTrack={bgmTrack}
        fullScreen={isSmall}
        onLeaveRoom={onLeaveRoom}
        onClose={() => setIsSettingsOpen(false)}
      />
      <RulebookModal
        open={isRulebookOpen}
        roleSheet={snapshot.roleSheet}
        introText={snapshot.scenario.intro.readAloud}
        mapScene={snapshot.investigation.map?.scene ?? null}
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
        cards={orderedMyClues}
        fullScreen={isSmall}
        canRevealPubliclyNow={canRevealPrivateCardsPublicly}
        publicRevealNotice={privateCardRevealNotice}
        publicRevealNoticeSeverity={privateCardRevealNoticeSeverity}
        onClose={() => setIsPrivateCardsOpen(false)}
        onOpenCard={(card) => openCardViewer('my-clues', orderedMyClues, card)}
        onReorderCards={updateMyCardOrder}
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
