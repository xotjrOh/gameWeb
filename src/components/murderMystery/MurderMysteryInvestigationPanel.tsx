'use client';

import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  MurderMysteryClueVaultCardView,
  MurderMysteryInvestigationTargetView,
  MurderMysteryInvestigationView,
  MurderMysteryPublicPlayerView,
} from '@/types/murderMystery';

interface MurderMysteryInvestigationPanelProps {
  round?: number;
  layoutSections: MurderMysteryInvestigationView['layoutSections'];
  investigation: MurderMysteryInvestigationView;
  selectedRoundTargets: MurderMysteryInvestigationTargetView[];
  stepDescription?: string;
  stepAnnouncement?: string;
  canActAsPlayer: boolean;
  isActivePhase: boolean;
  isMobile: boolean;
  isReadOnly: boolean;
  myCards: MurderMysteryClueVaultCardView[];
  players: MurderMysteryPublicPlayerView[];
  nowTick: number;
  turnAttentionLevel: 0 | 1 | 2;
  onSubmitInvestigationByTarget: (targetId: string) => void;
  onSubmitInvestigationByBack: (backId: string) => void;
  onSetReservation: (backId: string) => void;
  onClearReservation: () => void;
}

const panelPaperSx = {
  p: 2.25,
  borderRadius: 3,
} as const;

const getPlayerLabel = (
  playerId: string | null,
  players: MurderMysteryPublicPlayerView[]
) => {
  if (!playerId) {
    return null;
  }
  const found = players.find((player) => player.id === playerId);
  return found?.displayName ?? found?.name ?? null;
};

const InvestigationTurnRail = ({
  investigation,
  players,
}: {
  investigation: MurderMysteryInvestigationView;
  players: MurderMysteryPublicPlayerView[];
}) => {
  if (investigation.mode !== 'map' || !investigation.turn?.enabled) {
    return null;
  }

  const currentPlayerLabel = getPlayerLabel(
    investigation.turn.currentPlayerId,
    players
  );
  const nextRoundFirstLabel = getPlayerLabel(
    investigation.turn.nextRoundFirstPlayerId,
    players
  );

  return (
    <Paper sx={panelPaperSx}>
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6" fontWeight={800}>
              조사 순서
            </Typography>
            <Typography variant="body2" color="text.secondary">
              역할 순서 기준으로 조사 차례가 진행되고, 다음 라운드는
              선플레이어가 한 칸 회전합니다.
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.8} flexWrap="wrap">
            {currentPlayerLabel ? (
              <Chip
                color="primary"
                size="small"
                label={`현재 차례 ${currentPlayerLabel}`}
              />
            ) : (
              <Chip
                size="small"
                color="success"
                label="이번 라운드 조사 완료"
              />
            )}
            {nextRoundFirstLabel ? (
              <Chip
                size="small"
                variant="outlined"
                label={`다음 라운드 선 ${nextRoundFirstLabel}`}
              />
            ) : null}
          </Stack>
        </Stack>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          sx={{ overflowX: 'auto', pb: 0.5 }}
        >
          {investigation.turn.players.map((player) => (
            <Card
              key={player.playerId}
              variant="outlined"
              sx={{
                minWidth: 150,
                borderRadius: 2.5,
                borderColor: player.isCurrent
                  ? 'primary.main'
                  : player.isCompleted
                    ? 'success.light'
                    : 'divider',
                backgroundColor: player.isCurrent
                  ? 'rgba(191,219,254,0.5)'
                  : player.isCompleted
                    ? 'rgba(220,252,231,0.65)'
                    : 'rgba(255,255,255,0.7)',
              }}
            >
              <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Stack spacing={0.6}>
                  <Typography variant="caption" color="text.secondary">
                    {player.order}번째
                  </Typography>
                  <Typography fontWeight={800}>{player.displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {player.name}
                  </Typography>
                  <Chip
                    size="small"
                    color={
                      player.isCurrent
                        ? 'primary'
                        : player.isCompleted
                          ? 'success'
                          : 'default'
                    }
                    label={
                      player.isCurrent
                        ? '지금 조사'
                        : player.isCompleted
                          ? '완료'
                          : '대기'
                    }
                  />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
};

const InvestigationActionBanner = ({
  investigation,
  canActAsPlayer,
  isActivePhase,
  isReadOnly,
  players,
  turnAttentionLevel,
}: {
  investigation: MurderMysteryInvestigationView;
  canActAsPlayer: boolean;
  isActivePhase: boolean;
  isReadOnly: boolean;
  players: MurderMysteryPublicPlayerView[];
  turnAttentionLevel: 0 | 1 | 2;
}) => {
  if (investigation.mode !== 'map' || !investigation.turn) {
    return null;
  }

  if (isReadOnly) {
    return <Alert severity="info">이전 단계 열람 모드입니다.</Alert>;
  }

  if (!canActAsPlayer) {
    return (
      <Alert severity="info">
        플레이어 참가자가 아니므로 조사 맵은 열람만 가능합니다.
      </Alert>
    );
  }

  if (!isActivePhase) {
    return (
      <Alert severity="info">
        현재 활성 조사 단계가 아닙니다. 맵은 열람만 가능합니다.
      </Alert>
    );
  }

  if (investigation.turn.allPlayersDone) {
    return (
      <Alert severity="success">
        이번 라운드 조사 차례가 모두 끝났습니다. 개인 시트와 로그를 정리한 뒤
        다음 단계 이동을 기다리세요.
      </Alert>
    );
  }

  if (investigation.turn.canActNow) {
    const severity = turnAttentionLevel >= 2 ? 'warning' : 'info';
    const emphasisText =
      turnAttentionLevel === 0
        ? '지금 맵에서 카드 한 장을 직접 집어가세요.'
        : turnAttentionLevel === 1
          ? '8초 이상 대기 중입니다. 지금 바로 카드 한 장을 선택하세요.'
          : '20초 이상 대기 중입니다. 강한 리마인드가 울리고 있습니다.';
    return (
      <Alert severity={severity}>
        현재 당신의 조사 차례입니다. {emphasisText}
      </Alert>
    );
  }

  const currentPlayerLabel = getPlayerLabel(
    investigation.turn.currentPlayerId,
    players
  );
  return (
    <Alert severity="info">
      현재 차례는 {currentPlayerLabel ?? '알 수 없는 플레이어'}입니다. 당신은
      맵의 카드 뒷면을 미리 확인하고 1장만 비공개 예약할 수 있습니다.
    </Alert>
  );
};

const CardBackFace = ({
  back,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
}: {
  back: MurderMysteryInvestigationTargetView['availableBacks'][number];
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  showPrimaryAction: boolean;
}) => (
  <Card
    variant="outlined"
    sx={{
      borderRadius: 3,
      overflow: 'hidden',
      borderColor: back.isReservedByMe ? 'warning.main' : 'divider',
    }}
  >
    <Box
      sx={{
        minHeight: 184,
        p: 1.2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: back.imageSrc
          ? `linear-gradient(rgba(15,23,42,0.18), rgba(15,23,42,0.62)), url(${back.imageSrc}) center / cover`
          : 'linear-gradient(145deg, #082f49 0%, #0f766e 45%, #78350f 100%)',
        color: '#f8fafc',
      }}
    >
      <Stack direction="row" spacing={0.8} justifyContent="space-between">
        <Chip
          size="small"
          label={back.isReservedByMe ? '내 예약' : '카드 뒷면'}
          color={back.isReservedByMe ? 'warning' : 'default'}
        />
        <Typography variant="caption">{back.targetLabel}</Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Typography variant="h6" fontWeight={900}>
          {back.shortLabel ?? '단서'}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          아직 앞면은 확인할 수 없습니다.
        </Typography>
      </Stack>
    </Box>
    {showPrimaryAction ? (
      <CardContent sx={{ p: 1.2, '&:last-child': { pb: 1.2 } }}>
        <Button fullWidth variant="contained" onClick={onPrimaryAction}>
          {primaryActionLabel}
        </Button>
      </CardContent>
    ) : null}
  </Card>
);

const InvestigationBackDeckSheet = ({
  canActAsPlayer,
  investigation,
  isActivePhase,
  isMobile,
  isReadOnly,
  onClearReservation,
  onClose,
  onSetReservation,
  onSubmitByBack,
  selectedTarget,
}: {
  canActAsPlayer: boolean;
  investigation: MurderMysteryInvestigationView;
  isActivePhase: boolean;
  isMobile: boolean;
  isReadOnly: boolean;
  onClearReservation: () => void;
  onClose: () => void;
  onSetReservation: (backId: string) => void;
  onSubmitByBack: (backId: string) => void;
  selectedTarget: MurderMysteryInvestigationTargetView | null;
}) => {
  const turn = investigation.turn;
  const open = Boolean(selectedTarget);
  const canTakeCard =
    investigation.mode === 'map' &&
    Boolean(turn?.canActNow && canActAsPlayer && isActivePhase && !isReadOnly);
  const canReserve =
    investigation.mode === 'map' &&
    Boolean(
      !turn?.canActNow &&
        !turn?.allPlayersDone &&
        canActAsPlayer &&
        isActivePhase &&
        !isReadOnly
    );

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 420,
          maxHeight: isMobile ? '78vh' : '100vh',
          borderTopLeftRadius: isMobile ? 20 : 0,
          borderTopRightRadius: isMobile ? 20 : 0,
        },
      }}
    >
      <Stack spacing={1.5} sx={{ p: 2 }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography variant="h6" fontWeight={800}>
              카드 더미
            </Typography>
            <Typography fontWeight={700}>
              {selectedTarget?.label ?? '대상 없음'}
            </Typography>
            {selectedTarget?.description ? (
              <Typography variant="body2" color="text.secondary">
                {selectedTarget.description}
              </Typography>
            ) : null}
          </Box>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            닫기
          </Button>
        </Stack>

        {selectedTarget ? (
          <Stack direction="row" spacing={0.8} flexWrap="wrap">
            <Chip
              size="small"
              label={`남은 카드 ${selectedTarget.remainingClues}/${selectedTarget.totalClues}`}
              color={selectedTarget.isExhausted ? 'default' : 'primary'}
            />
            {turn?.myReservation ? (
              <Chip
                size="small"
                color="warning"
                label={`내 예약 ${turn.myReservation.targetLabel}`}
              />
            ) : null}
          </Stack>
        ) : null}

        {selectedTarget?.availableBacks.length ? (
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
            }}
          >
            {selectedTarget.availableBacks.map((back) => (
              <CardBackFace
                key={back.backId}
                back={back}
                onPrimaryAction={() => {
                  if (canTakeCard) {
                    onSubmitByBack(back.backId);
                    onClose();
                    return;
                  }
                  if (canReserve) {
                    onSetReservation(back.backId);
                  }
                }}
                primaryActionLabel={
                  canTakeCard
                    ? '이 카드 가져가기'
                    : back.isReservedByMe
                      ? '예약됨'
                      : '이 카드 예약'
                }
                showPrimaryAction={canTakeCard || canReserve}
              />
            ))}
          </Box>
        ) : (
          <Alert severity="info">
            이 위치의 남은 카드가 없습니다. 이미 누군가가 모두 가져갔습니다.
          </Alert>
        )}

        {canReserve && turn?.myReservation ? (
          <Button
            variant="outlined"
            color="warning"
            onClick={onClearReservation}
          >
            현재 예약 해제
          </Button>
        ) : null}
      </Stack>
    </Drawer>
  );
};

const InvestigationMapBoard = ({
  investigation,
  isReadOnly,
  selectedTargetId,
  selectedTargetIds,
  turnAttentionLevel,
  onOpenTarget,
}: {
  investigation: MurderMysteryInvestigationView;
  isReadOnly: boolean;
  selectedTargetId: string | null;
  selectedTargetIds: Set<string>;
  turnAttentionLevel: 0 | 1 | 2;
  onOpenTarget: (targetId: string) => void;
}) => {
  if (investigation.mode !== 'map' || !investigation.map) {
    return null;
  }

  const filteredHotspots = investigation.map.hotspots.filter((hotspot) =>
    selectedTargetIds.has(hotspot.targetId)
  );

  return (
    <Paper sx={panelPaperSx}>
      <Stack spacing={1.25}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            조사 맵
          </Typography>
          <Typography variant="body2" color="text.secondary">
            실제 보드처럼 위치를 눌러 카드 뒷면을 확인하세요.
          </Typography>
        </Box>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: `${investigation.map.scene.width} / ${investigation.map.scene.height}`,
            overflow: 'hidden',
            borderRadius: 3,
            border: '1px solid rgba(15,23,42,0.14)',
            boxShadow:
              turnAttentionLevel >= 1
                ? '0 0 0 4px rgba(251,191,36,0.22)'
                : '0 18px 40px rgba(15,23,42,0.08)',
            ...(turnAttentionLevel >= 1
              ? {
                  '@keyframes mmMapPulse': {
                    '0%': { boxShadow: '0 0 0 0 rgba(251,191,36,0.12)' },
                    '50%': { boxShadow: '0 0 0 7px rgba(251,191,36,0.22)' },
                    '100%': { boxShadow: '0 0 0 0 rgba(251,191,36,0.12)' },
                  },
                  animation: 'mmMapPulse 1.8s ease-in-out infinite',
                }
              : {}),
          }}
        >
          <Box
            component="img"
            src={investigation.map.scene.imageSrc}
            alt={investigation.map.scene.alt}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {filteredHotspots.map((hotspot) => (
            <Button
              key={hotspot.id}
              onClick={() => onOpenTarget(hotspot.targetId)}
              sx={{
                position: 'absolute',
                left: `${hotspot.xPct}%`,
                top: `${hotspot.yPct}%`,
                width: `${hotspot.widthPct}%`,
                height: `${hotspot.heightPct}%`,
                minWidth: 0,
                p: 0.8,
                borderRadius: 2.5,
                alignItems: 'stretch',
                justifyContent: 'stretch',
                textTransform: 'none',
                border: '2px solid',
                borderColor:
                  selectedTargetId === hotspot.targetId
                    ? 'warning.main'
                    : hotspot.isExhausted
                      ? 'rgba(148,163,184,0.85)'
                      : 'rgba(14,165,233,0.95)',
                backgroundColor:
                  selectedTargetId === hotspot.targetId
                    ? 'rgba(254,240,138,0.42)'
                    : hotspot.isExhausted
                      ? 'rgba(226,232,240,0.58)'
                      : 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(1.5px)',
                color: '#0f172a',
                '&:hover': {
                  backgroundColor: hotspot.isExhausted
                    ? 'rgba(226,232,240,0.72)'
                    : 'rgba(255,255,255,0.28)',
                },
              }}
            >
              <Stack
                spacing={0.35}
                justifyContent="space-between"
                alignItems="flex-start"
                sx={{ width: '100%', height: '100%' }}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  sx={{ lineHeight: 1.2, textAlign: 'left' }}
                >
                  {hotspot.label ?? hotspot.targetLabel}
                </Typography>
                <Chip
                  size="small"
                  label={`${hotspot.remainingClues}/${hotspot.totalClues}`}
                  color={hotspot.isExhausted ? 'default' : 'primary'}
                  sx={{ alignSelf: 'flex-end' }}
                />
              </Stack>
            </Button>
          ))}
          {isReadOnly ? (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.28))',
                pointerEvents: 'none',
              }}
            />
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
};

const MyReservedCardDock = ({
  investigation,
  isActivePhase,
  isReadOnly,
  onClearReservation,
}: {
  investigation: MurderMysteryInvestigationView;
  isActivePhase: boolean;
  isReadOnly: boolean;
  onClearReservation: () => void;
}) => {
  if (investigation.mode !== 'map' || !investigation.turn?.myReservation) {
    return null;
  }

  return (
    <Paper sx={panelPaperSx}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            내 예약 카드
          </Typography>
          <Typography fontWeight={700}>
            {investigation.turn.myReservation.targetLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {investigation.turn.myReservation.shortLabel ?? '예약한 카드 뒷면'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.8} flexWrap="wrap">
          <Chip size="small" color="warning" label="비공개 예약 1/1" />
          {isActivePhase && !isReadOnly ? (
            <Button
              variant="outlined"
              color="warning"
              onClick={onClearReservation}
            >
              예약 해제
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
};

const LegacyInvestigatePanel = ({
  canActAsPlayer,
  isActivePhase,
  isReadOnly,
  layoutSections,
  myCards,
  onSubmitInvestigationByTarget,
  round,
  stepAnnouncement,
  stepDescription,
  targets,
  used,
}: {
  canActAsPlayer: boolean;
  isActivePhase: boolean;
  isReadOnly: boolean;
  layoutSections: MurderMysteryInvestigationView['layoutSections'];
  myCards: MurderMysteryClueVaultCardView[];
  onSubmitInvestigationByTarget: (targetId: string) => void;
  round?: number;
  stepAnnouncement?: string;
  stepDescription?: string;
  targets: MurderMysteryInvestigationTargetView[];
  used: boolean;
}) => {
  const canSubmit = canActAsPlayer && isActivePhase && !isReadOnly;
  const myRemainingText = used ? '0' : canSubmit ? '1' : '0';
  const targetById = Object.fromEntries(
    targets.map((target) => [target.id, target])
  );
  const sortedLayoutSections = [...layoutSections].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) -
      (b.order ?? Number.MAX_SAFE_INTEGER)
  );
  const renderedTargetIds = new Set<string>();

  const getSectionTargets = (
    section: MurderMysteryInvestigationView['layoutSections'][number]
  ) => {
    const fromTargetIds =
      section.targetIds
        ?.map((targetId) => targetById[targetId])
        .filter(Boolean) ?? [];

    const resolvedTargets =
      fromTargetIds.length > 0
        ? fromTargetIds
        : targets.filter((target) => {
            if (section.targetTypes?.length) {
              return section.targetTypes.includes(target.targetType);
            }
            if (target.sectionId) {
              return target.sectionId === section.id;
            }
            return false;
          });

    const sortedTargets = [...resolvedTargets].sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label)
    );

    sortedTargets.forEach((target) => renderedTargetIds.add(target.id));
    return sortedTargets;
  };

  const renderTargetCards = (
    sectionTargets: MurderMysteryInvestigationTargetView[]
  ) => (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
      }}
    >
      {sectionTargets.map((target) => (
        <Card
          key={target.id}
          variant="outlined"
          sx={{
            borderRadius: 2,
            backgroundColor: target.isExhausted
              ? 'rgba(226,232,240,0.65)'
              : 'rgba(254,249,195,0.45)',
            opacity: target.isExhausted ? 0.78 : 1,
          }}
        >
          <CardContent>
            <Stack spacing={1}>
              <Box>
                <Typography fontWeight={700}>{target.label}</Typography>
                {target.description ? (
                  <Typography variant="body2" color="text.secondary">
                    {target.description}
                  </Typography>
                ) : null}
              </Box>
              <Stack direction="row" spacing={0.8} flexWrap="wrap">
                <Chip
                  size="small"
                  label={`남은 단서 ${target.remainingClues}/${target.totalClues}`}
                  color={target.isExhausted ? 'default' : 'primary'}
                />
                <Chip
                  size="small"
                  label={target.isExhausted ? '이미 공개됨' : '미확인'}
                />
              </Stack>
              {canActAsPlayer ? (
                <Button
                  variant="contained"
                  color="inherit"
                  onClick={() => onSubmitInvestigationByTarget(target.id)}
                  disabled={!canSubmit || used || target.isExhausted}
                >
                  {target.isExhausted
                    ? '단서 공개 완료'
                    : used
                      ? '이번 라운드 조사 완료'
                      : '여기 조사하기'}
                </Button>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  플레이어 참가자가 아니므로 조사 제출 버튼이 비활성화됩니다.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  return (
    <Paper sx={panelPaperSx}>
      <Stack spacing={1.35}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {round ? `${round}라운드 조사` : '조사'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            맵 메타가 없는 시나리오는 기존 조사 목록 UI를 유지합니다.
          </Typography>
        </Box>
        {isReadOnly ? (
          <Alert severity="info">이전 단계 열람 모드입니다.</Alert>
        ) : null}
        {stepAnnouncement && isActivePhase ? (
          <Alert severity="warning">{stepAnnouncement}</Alert>
        ) : null}
        {stepDescription ? (
          <Alert severity="info">{stepDescription}</Alert>
        ) : null}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          {canActAsPlayer ? (
            <Chip
              color={canSubmit && !used ? 'primary' : 'default'}
              label={`내 조사 남음: ${myRemainingText}`}
              size="small"
            />
          ) : (
            <Chip
              label="플레이어별 조사 제한은 서버에서 검증됩니다."
              size="small"
            />
          )}
        </Stack>
        <Alert severity="info">
          공개된 단서는 다시 선택되지 않습니다. 남은 단서가 0인 대상은 조사할 수
          없습니다.
        </Alert>
        {targets.length === 0 ? (
          <Typography color="text.secondary">
            이 라운드에 조사 가능한 대상이 없습니다.
          </Typography>
        ) : (
          <Stack spacing={1.2}>
            {sortedLayoutSections.map((section) => {
              const sectionTargets = getSectionTargets(section);
              if (sectionTargets.length === 0) {
                return null;
              }
              return (
                <Stack key={section.id} spacing={1}>
                  <Typography fontWeight={700}>
                    {section.icon ? `${section.icon} ` : ''}
                    {section.title}
                  </Typography>
                  {renderTargetCards(sectionTargets)}
                </Stack>
              );
            })}
            {targets.filter((target) => !renderedTargetIds.has(target.id))
              .length > 0 ? (
              <Stack spacing={1}>
                <Typography fontWeight={700}>추가 조사 대상</Typography>
                {renderTargetCards(
                  targets
                    .filter((target) => !renderedTargetIds.has(target.id))
                    .sort(
                      (a, b) =>
                        (a.order ?? Number.MAX_SAFE_INTEGER) -
                          (b.order ?? Number.MAX_SAFE_INTEGER) ||
                        a.label.localeCompare(b.label)
                    )
                )}
              </Stack>
            ) : null}
          </Stack>
        )}
        <Divider />
        <Stack spacing={1}>
          <Typography fontWeight={700}>조사 결과 카드</Typography>
          {myCards.length === 0 ? (
            <Typography color="text.secondary">
              아직 배정된 조사 카드가 없습니다.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {myCards.map((card) => (
                <Card key={card.id} variant="outlined">
                  <CardContent>
                    <Stack spacing={0.8}>
                      <Typography fontWeight={700}>{card.title}</Typography>
                      <Stack direction="row" spacing={0.8} flexWrap="wrap">
                        {(card.sourceTargetLabels.length > 0
                          ? card.sourceTargetLabels
                          : ['출처 미확인']
                        ).map((label) => (
                          <Chip
                            key={`${card.id}:${label}`}
                            size="small"
                            label={label}
                          />
                        ))}
                      </Stack>
                      <Typography sx={{ mt: 0.5 }}>{card.text}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default function MurderMysteryInvestigationPanel({
  round,
  layoutSections,
  investigation,
  selectedRoundTargets,
  stepDescription,
  stepAnnouncement,
  canActAsPlayer,
  isActivePhase,
  isMobile,
  isReadOnly,
  myCards,
  players,
  nowTick,
  turnAttentionLevel,
  onSubmitInvestigationByTarget,
  onSubmitInvestigationByBack,
  onSetReservation,
  onClearReservation,
}: MurderMysteryInvestigationPanelProps) {
  const [selectedTargetId, setSelectedTargetId] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    if (!selectedTargetId) {
      return;
    }
    if (
      !selectedRoundTargets.some((target) => target.id === selectedTargetId)
    ) {
      setSelectedTargetId(null);
    }
  }, [selectedRoundTargets, selectedTargetId]);

  const selectedTarget =
    selectedRoundTargets.find((target) => target.id === selectedTargetId) ??
    null;
  const selectedTargetIds = new Set(
    selectedRoundTargets.map((target) => target.id)
  );

  if (investigation.mode !== 'map') {
    return (
      <LegacyInvestigatePanel
        canActAsPlayer={canActAsPlayer}
        isActivePhase={isActivePhase}
        isReadOnly={isReadOnly}
        layoutSections={layoutSections}
        myCards={myCards}
        onSubmitInvestigationByTarget={onSubmitInvestigationByTarget}
        round={round}
        stepAnnouncement={stepAnnouncement}
        stepDescription={stepDescription}
        targets={selectedRoundTargets}
        used={isActivePhase ? investigation.used : false}
      />
    );
  }

  const turnStartedAgoSec =
    investigation.turn?.turnStartedAt && isActivePhase
      ? Math.max(
          Math.floor((nowTick - investigation.turn.turnStartedAt) / 1000),
          0
        )
      : 0;

  return (
    <Stack spacing={2}>
      <Paper sx={panelPaperSx}>
        <Stack spacing={1.2}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {round ? `${round}라운드 조사` : '조사'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              맵에서 위치를 눌러 카드 뒷면을 확인하고, 차례가 오면 직접 한 장을
              집어가세요.
            </Typography>
          </Box>
          {stepAnnouncement && isActivePhase ? (
            <Alert severity="warning">{stepAnnouncement}</Alert>
          ) : null}
          {stepDescription ? (
            <Alert severity="info">{stepDescription}</Alert>
          ) : null}
          <Stack direction="row" spacing={0.8} flexWrap="wrap">
            <Chip
              size="small"
              color={investigation.turn?.canActNow ? 'primary' : 'default'}
              label={
                investigation.turn?.canActNow
                  ? `내 차례 진행 중 (${turnStartedAgoSec}s)`
                  : '맵 열람 가능'
              }
            />
            <Chip
              size="small"
              label={
                investigation.turn?.myReservation
                  ? '예약 1/1 사용 중'
                  : '예약 1/1 비어 있음'
              }
              color={investigation.turn?.myReservation ? 'warning' : 'default'}
            />
            <Chip
              size="small"
              label={
                investigation.turn?.allPlayersDone
                  ? '이번 라운드 전체 완료'
                  : '차례 순서 강제'
              }
            />
          </Stack>
        </Stack>
      </Paper>

      <InvestigationActionBanner
        investigation={investigation}
        canActAsPlayer={canActAsPlayer}
        isActivePhase={isActivePhase}
        isReadOnly={isReadOnly}
        players={players}
        turnAttentionLevel={turnAttentionLevel}
      />

      <InvestigationTurnRail investigation={investigation} players={players} />

      <InvestigationMapBoard
        investigation={investigation}
        isReadOnly={isReadOnly}
        selectedTargetId={selectedTargetId}
        selectedTargetIds={selectedTargetIds}
        turnAttentionLevel={turnAttentionLevel}
        onOpenTarget={setSelectedTargetId}
      />

      <MyReservedCardDock
        investigation={investigation}
        isActivePhase={isActivePhase}
        isReadOnly={isReadOnly}
        onClearReservation={onClearReservation}
      />

      <Paper sx={panelPaperSx}>
        <Stack spacing={1}>
          <Typography fontWeight={800}>조사 결과 카드</Typography>
          {myCards.length === 0 ? (
            <Typography color="text.secondary">
              아직 배정된 조사 카드가 없습니다.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {myCards.map((card) => (
                <Card key={card.id} variant="outlined">
                  <CardContent>
                    <Stack spacing={0.8}>
                      <Typography fontWeight={700}>{card.title}</Typography>
                      <Stack direction="row" spacing={0.8} flexWrap="wrap">
                        {(card.sourceTargetLabels.length > 0
                          ? card.sourceTargetLabels
                          : ['출처 미확인']
                        ).map((label) => (
                          <Chip
                            key={`${card.id}:${label}`}
                            size="small"
                            label={label}
                          />
                        ))}
                      </Stack>
                      <Typography sx={{ mt: 0.5 }}>{card.text}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      <InvestigationBackDeckSheet
        canActAsPlayer={canActAsPlayer}
        investigation={investigation}
        isActivePhase={isActivePhase}
        isMobile={isMobile}
        isReadOnly={isReadOnly}
        onClearReservation={onClearReservation}
        onClose={() => setSelectedTargetId(null)}
        onSetReservation={onSetReservation}
        onSubmitByBack={onSubmitInvestigationByBack}
        selectedTarget={selectedTarget}
      />
    </Stack>
  );
}
