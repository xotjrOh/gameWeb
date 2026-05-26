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
} from '@mui/icons-material';
import {
  MurderMysteryCardScenario,
  MurderMysteryClueVaultCardView,
  MurderMysteryFinalVoteOptionScenario,
  MurderMysteryInvestigationBackCardView,
  MurderMysteryPublicPlayerView,
  MurderMysteryRoleSheetView,
  MurderMysterySeatPosition,
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
  onSubmitRolePreferences: (roleIds: string[]) => void;
  onClearRolePreferences: () => void;
  onUpdateSeatPosition: (
    playerId: string,
    position: MurderMysterySeatPosition
  ) => Promise<boolean>;
  onResetSeatLayout: () => void;
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

type PhaseKind = MurderMysteryStepKind | 'lobby';
type AnyClueCard = MurderMysteryClueVaultCardView | MurderMysteryCardScenario;

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
  return playerIds.reduce<Record<string, MurderMysterySeatPosition>>(
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

const SeatMarker = ({
  player,
  isSelf,
  canDrag,
  position,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  player: MurderMysteryPublicPlayerView;
  isSelf: boolean;
  canDrag: boolean;
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
      <Box
        sx={{
          borderRadius: 999,
          border: isSelf
            ? '2px solid rgba(245, 197, 66, 0.98)'
            : '1px solid rgba(255,255,255,0.3)',
          background:
            'linear-gradient(180deg, rgba(247,243,231,0.98), rgba(224,214,190,0.96))',
          color: '#2a231a',
          boxShadow: isDragging
            ? '0 14px 34px rgba(0,0,0,0.42)'
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
          {player.publicRevealedClues.length > 0 ? (
            <Chip
              size="small"
              label={player.publicRevealedClues.length}
              sx={{ height: 20, minWidth: 24, fontWeight: 900 }}
            />
          ) : null}
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

const SeatCompass = ({
  players,
  sessionId,
  positions,
  tableRef,
  canEdit,
  canReset,
  isCompact,
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
              {canEdit ? '자리 맞추기' : '자리 나침반'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#d8d0bd' }}>
              {canEdit
                ? '자기 토큰만 움직여 실제 자리감을 맞추세요.'
                : '누가 내 옆과 맞은편에 있는지만 확인합니다.'}
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
            height: isCompact ? { xs: 132, md: 160 } : { xs: 210, md: 250 },
            borderRadius: '50%',
            overflow: 'visible',
            background:
              'radial-gradient(ellipse at center, rgba(98, 77, 47, 0.62) 0%, rgba(45, 67, 59, 0.72) 58%, rgba(8, 13, 17, 0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.16)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: { xs: '42%', md: '46%' },
              height: { xs: '34%', md: '38%' },
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
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
              TABLE
            </Typography>
          </Box>
          {players.map((player) => (
            <SeatMarker
              key={player.id}
              player={player}
              isSelf={player.id === sessionId}
              canDrag={canEdit && player.id === sessionId}
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
            />
          ) : (
            <Chip size="small" label="NPC 용의자" />
          )}
        </Stack>
        <Typography
          variant="body2"
          sx={{
            color: '#d8d0bd',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.55,
          }}
        >
          {cover.publicText}
        </Typography>
        {canRank ? (
          <Stack direction="row" spacing={0.6} flexWrap="wrap">
            {Array.from({ length: rankCount }, (_, rankIndex) => (
              <Button
                key={`${cover.id}:rank:${rankIndex}`}
                size="small"
                variant={currentRank === rankIndex ? 'contained' : 'outlined'}
                color={rankIndex === 0 ? 'warning' : 'inherit'}
                onClick={() => onSetRank?.(rankIndex)}
              >
                {rankIndex + 1}순위
              </Button>
            ))}
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
  onSubmit,
  onClear,
}: {
  roleSelection: MurderMysteryStateSnapshot['roleSelection'];
  draftRolePreferenceIds: string[];
  onSetRoleRank: (roleId: string, rankIndex: number) => void;
  onSubmit: () => void;
  onClear: () => void;
}) => {
  const roleById = new Map(roleSelection.roles.map((role) => [role.id, role]));
  const orderedRoles = draftRolePreferenceIds
    .map((roleId) => roleById.get(roleId))
    .filter(Boolean) as MurderMysteryStateSnapshot['roleSelection']['roles'];
  const assignedPlayerNameById = new Map(
    roleSelection.players.map((player) => [player.playerId, player.playerName])
  );
  const hasSubmitted =
    roleSelection.yourPreferenceRoleIds.length === roleSelection.roles.length;
  const canSubmit =
    roleSelection.status === 'open' &&
    draftRolePreferenceIds.length === roleSelection.roles.length &&
    new Set(draftRolePreferenceIds).size === roleSelection.roles.length;

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
                {orderedRoles.map((role, index) => (
                  <Chip
                    key={role.id}
                    size="small"
                    color={index === 0 ? 'warning' : 'default'}
                    label={`${index + 1}순위 ${role.displayName}`}
                  />
                ))}
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

            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                color="warning"
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                {hasSubmitted ? '선호 다시 제출' : '선호 제출'}
              </Button>
              {hasSubmitted ? (
                <Button variant="outlined" color="inherit" onClick={onClear}>
                  제출 취소
                </Button>
              ) : null}
            </Stack>
          </>
        )}
      </Stack>
    </Box>
  );
};

const MyDeskPanel = ({
  cardCount,
  canOpenRulebook = true,
  onOpenRulebook,
  onOpenPrivateCards,
  compact = false,
}: {
  cardCount: number;
  canOpenRulebook?: boolean;
  onOpenRulebook: () => void;
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
  playerName,
  fullScreen,
  onClose,
}: {
  open: boolean;
  roleSheet: MurderMysteryRoleSheetView | null;
  playerName: string;
  fullScreen: boolean;
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
            비공개 룰북
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#f7f0df' }}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box
          sx={{
            perspective: '1600px',
            minHeight: {
              xs: fullScreen ? 'calc(100vh - 32px)' : 520,
              sm: 600,
            },
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Box
            key={`${roleSheet?.roleId ?? 'empty'}:${pageIndex}`}
            sx={{
              width: 'min(100%, 720px)',
              minHeight: {
                xs: fullScreen ? 'calc(100vh - 96px)' : 500,
                sm: 560,
              },
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
                minHeight: {
                  xs: fullScreen ? 'calc(100vh - 96px)' : 500,
                  sm: 560,
                },
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
  canOpenRulebook,
  fullScreen,
  onClose,
  onOpenRulebook,
  onOpenCard,
}: {
  open: boolean;
  player: MurderMysteryPublicPlayerView | null;
  isSelf: boolean;
  canOpenRulebook: boolean;
  fullScreen: boolean;
  onClose: () => void;
  onOpenRulebook: () => void;
  onOpenCard: (card: AnyClueCard) => void;
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
        <AutoStoriesIcon />
        <Typography fontWeight={900} sx={{ flex: 1 }}>
          자리 정보
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
        {player?.publicRevealedClues.length ? (
          <Stack spacing={1}>
            <Typography fontWeight={900}>
              이 자리에 공개된 단서 {player.publicRevealedClues.length}장
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ overflowX: 'auto', pb: 1 }}
            >
              {player.publicRevealedClues.map((card) => (
                <EvidenceCardFace
                  key={`${player.id}:${card.id}`}
                  card={card}
                  dense
                  onOpen={onOpenCard}
                />
              ))}
            </Stack>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            아직 이 자리에 공개 단서가 없습니다.
          </Typography>
        )}
        {isSelf ? (
          <Button
            variant="contained"
            startIcon={<AutoStoriesIcon />}
            disabled={!canOpenRulebook}
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
  fullScreen,
  onClose,
}: {
  card: AnyClueCard | null;
  fullScreen: boolean;
  onClose: () => void;
}) => (
  <Dialog
    open={Boolean(card)}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    fullScreen={fullScreen}
  >
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
  fullScreen,
  onClose,
  onOpenCard,
}: {
  open: boolean;
  cards: MurderMysteryClueVaultCardView[];
  fullScreen: boolean;
  onClose: () => void;
  onOpenCard: (card: AnyClueCard) => void;
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
  onSubmitRolePreferences,
  onClearRolePreferences,
  onUpdateSeatPosition,
  onResetSeatLayout,
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
  const seatPositionsRef = useRef<Record<string, MurderMysterySeatPosition>>(
    {}
  );
  const dragStateRef = useRef<{
    playerId: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    canDrag: boolean;
  } | null>(null);
  const [seatPositions, setSeatPositions] = useState<
    Record<string, MurderMysterySeatPosition>
  >({});
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [isPrivateCardsOpen, setIsPrivateCardsOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AnyClueCard | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [draftRolePreferenceIds, setDraftRolePreferenceIds] = useState<
    string[]
  >([]);

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
  const canEditSeatLayout = snapshot.phase === 'LOBBY';
  const hasRequiredPlayerCount =
    snapshot.hostParticipation.currentPlayerCount >=
    snapshot.hostParticipation.requiredPlayerCount;
  const isRoleSelectionLocked = snapshot.roleSelection.status === 'locked';
  const canStartGame =
    canUseHostTools &&
    snapshot.phase === 'LOBBY' &&
    hasRequiredPlayerCount &&
    isRoleSelectionLocked;
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
            {canActNow && snapshot.investigation.turn?.extraInvestigationPending
              ? '전체 공개 단서를 확인했습니다. 한 번 더 조사할 수 있습니다.'
              : canActNow
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

  const renderSpecialEvents = () =>
    snapshot.specialEvents.length > 0 ? (
      <Stack spacing={1}>
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
    ) : null;

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
            onSubmit={() => onSubmitRolePreferences(draftRolePreferenceIds)}
            onClear={onClearRolePreferences}
          />
          {canUseHostTools ? (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={onStartGame}
              disabled={!canStartGame}
            >
              게임 시작
            </Button>
          ) : null}
          {!hasRequiredPlayerCount ? (
            <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
              모든 참가자가 입장하면 캐릭터 선호 제출을 완료할 수 있습니다.
            </Typography>
          ) : !isRoleSelectionLocked ? (
            <Typography variant="caption" sx={{ color: '#cfc5ad' }}>
              모든 참가자의 캐릭터 선호가 제출되면 배정이 공개되고 게임을 시작할
              수 있습니다.
            </Typography>
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
          {canUseHostTools && snapshot.phase === 'LOBBY' ? (
            <Tooltip
              title={
                canStartGame
                  ? '게임 시작'
                  : '참가자 입장과 캐릭터 배정이 완료되어야 시작할 수 있습니다.'
              }
            >
              <span>
                <IconButton
                  onClick={onStartGame}
                  disabled={!canStartGame}
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
          pb: { xs: 10, lg: 1.4 },
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
          <SeatCompass
            players={snapshot.players}
            sessionId={sessionId}
            positions={seatPositions}
            tableRef={tableRef}
            canEdit={canEditSeatLayout}
            canReset={canUseHostTools && snapshot.phase === 'LOBBY'}
            isCompact={phaseKind !== 'lobby'}
            draggingPlayerId={draggingPlayerId}
            onPointerDown={handleSeatPointerDown}
            onPointerMove={handleSeatPointerMove}
            onPointerUp={handleSeatPointerUp}
            onReset={resetSeats}
          />
          {renderSpecialEvents()}
        </Stack>

        <Box
          sx={{
            gridColumn: { xs: '1', lg: '2' },
            gridRow: { xs: '2', lg: '1' },
            minHeight: 0,
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.18)',
            backgroundColor: 'rgba(14, 23, 25, 0.86)',
            boxShadow: '0 28px 70px rgba(0,0,0,0.42)',
            p: { xs: 1.3, md: 2 },
            pb: { xs: 8.5, lg: 2 },
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
              canOpenRulebook={Boolean(snapshot.roleSheet)}
              onOpenRulebook={() => setIsRulebookOpen(true)}
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
            canOpenRulebook={Boolean(snapshot.roleSheet)}
            onOpenRulebook={() => setIsRulebookOpen(true)}
            onOpenPrivateCards={() => setIsPrivateCardsOpen(true)}
          />
        </Box>
      ) : null}

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
        onOpenCard={setSelectedCard}
      />
      <RulebookModal
        open={isRulebookOpen}
        roleSheet={snapshot.roleSheet}
        playerName={selfPlayer?.name ?? ''}
        fullScreen={isSmall}
        onClose={() => setIsRulebookOpen(false)}
      />
      <PrivateCardsDialog
        open={isPrivateCardsOpen}
        cards={snapshot.clueVault.myClues}
        fullScreen={isSmall}
        onClose={() => setIsPrivateCardsOpen(false)}
        onOpenCard={setSelectedCard}
      />
      <CardDetailDialog
        card={selectedCard}
        fullScreen={isSmall}
        onClose={() => setSelectedCard(null)}
      />
    </Box>
  );
}
