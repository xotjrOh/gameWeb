'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/components/provider/SocketProvider';
import useCheckVersion from '@/hooks/useCheckVersion';
import useUpdateSocketId from '@/hooks/useUpdateSocketId';
import useLeaveRoom from '@/hooks/useLeaveRoom';
import useRedirectIfInvalidRoom from '@/hooks/useRedirectIfInvalidRoom';
import useRedirectIfNotHost from '@/hooks/useRedirectIfNotHost';
import useMurderMysteryGameData from '@/hooks/useMurderMysteryGameData';
import { useCustomSnackbar } from '@/hooks/useCustomSnackbar';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { MurderMysteryPhase } from '@/types/murderMystery';

interface MurderMysteryGameScreenProps {
  roomId: string;
  isHostView: boolean;
}

const PHASE_STEPS: Array<{ phase: MurderMysteryPhase; label: string }> = [
  { phase: 'LOBBY', label: '대기' },
  { phase: 'INTRO', label: '오프닝' },
  { phase: 'ROUND1_DISCUSS', label: '1라운드 토론' },
  { phase: 'ROUND1_INVESTIGATE', label: '1라운드 조사' },
  { phase: 'ROUND2_DISCUSS', label: '2라운드 토론' },
  { phase: 'ROUND2_INVESTIGATE', label: '2라운드 조사' },
  { phase: 'FINAL_VOTE', label: '최종 투표' },
  { phase: 'ENDBOOK', label: '엔딩' },
];

const phaseLabelMap = PHASE_STEPS.reduce(
  (acc, step) => {
    acc[step.phase] = step.label;
    return acc;
  },
  {} as Record<MurderMysteryPhase, string>
);

const PHASE_INDEX_MAP = PHASE_STEPS.reduce(
  (acc, step, index) => {
    acc[step.phase] = index;
    return acc;
  },
  {} as Record<MurderMysteryPhase, number>
);

const INVESTIGATE_ROUND_BY_PHASE: Partial<Record<MurderMysteryPhase, 1 | 2>> = {
  ROUND1_INVESTIGATE: 1,
  ROUND2_INVESTIGATE: 2,
};

const DISCUSS_GUIDE_BY_ROUND: Record<1 | 2, string> = {
  1: '1라운드 목표: 각자 확보한 단서와 알리바이를 공유해 의심 포인트를 좁혀주세요.',
  2: '2라운드 목표: 수사와 탈출 준비를 병행하며 최종 지목 근거를 정리해주세요.',
};

const GUIDE_REVEAL_CARD_ID = 'card_dog_tag';
const GUIDE_REAL_NAME = '연새사리 누도만쳐사라';
const GUIDE_REVEAL_LOG_ID = 'guide_name_revealed';
const GUIDE_REVEAL_LOG_TEXT =
  '가이드의 본명이 공개되었습니다: 연새사리 누도만쳐사라';

type SidebarTab = 'SHEET' | 'PARTS' | 'LOG';

interface TimelineLogEntry {
  id: string;
  type: string;
  text: string;
  at: number;
}

interface HostPanelProps {
  open: boolean;
  phase: MurderMysteryPhase;
  hostParticipatesAsPlayer: boolean;
  canUseHostGameMasterControls: boolean;
  hostControls: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['hostControls'];
  selectedCardByRequestId: Record<string, string>;
  onClose: () => void;
  onSelectCard: (requestId: string, cardId: string) => void;
  onStartGame: () => void;
  onNextPhase: () => void;
  onBroadcastIntro: () => void;
  onFinalizeVote: () => void;
  onBroadcastEndbook: () => void;
  onResolvePending: (requestId: string, cardId?: string) => void;
  onResetGame: () => void;
}

const panelPaperSx = {
  p: 2.25,
  borderRadius: 3,
} as const;

const getPhaseIndex = (phase: MurderMysteryPhase) => PHASE_INDEX_MAP[phase];

const PanelCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <Paper sx={panelPaperSx}>
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Stack>
  </Paper>
);

const TabRouter = ({
  currentPhase,
  selectedPhase,
  onSelect,
}: {
  currentPhase: MurderMysteryPhase;
  selectedPhase: MurderMysteryPhase;
  onSelect: (phase: MurderMysteryPhase) => void;
}) => {
  const currentIndex = getPhaseIndex(currentPhase);
  return (
    <Paper sx={{ ...panelPaperSx, p: 1.2 }}>
      <Tabs
        value={selectedPhase}
        onChange={(_, value: MurderMysteryPhase) => {
          if (getPhaseIndex(value) > currentIndex) {
            return;
          }
          onSelect(value);
        }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {PHASE_STEPS.map((step, index) => {
          const isLocked = index > currentIndex;
          const isCurrent = step.phase === currentPhase;
          return (
            <Tab
              key={step.phase}
              value={step.phase}
              disabled={isLocked}
              label={
                <Stack spacing={0.1} alignItems="flex-start">
                  <Typography
                    variant="caption"
                    color={isCurrent ? 'primary.main' : 'text.secondary'}
                    fontWeight={800}
                  >
                    {index}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={isCurrent ? 'primary.main' : 'text.primary'}
                    fontWeight={isCurrent ? 800 : 600}
                  >
                    {step.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isLocked ? '잠금' : isCurrent ? '현재' : '열람'}
                  </Typography>
                </Stack>
              }
              sx={{
                alignItems: 'flex-start',
                textTransform: 'none',
                minHeight: 72,
              }}
            />
          );
        })}
      </Tabs>
    </Paper>
  );
};

const LobbyPanel = ({
  players,
  isHostView,
  hostParticipation,
  onOpenGmPanel,
}: {
  players: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['players'];
  isHostView: boolean;
  hostParticipation: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['hostParticipation'];
  onOpenGmPanel: () => void;
}) => (
  <PanelCard
    title="대기실"
    subtitle="참가자 상태를 확인하고 게임 시작을 준비하세요."
  >
    <Stack spacing={1.1}>
      {players.map((player) => (
        <Stack
          key={player.id}
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{
            p: 1.2,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
        >
          <Typography fontWeight={700}>
            {player.name} ({player.displayName})
          </Typography>
          <Stack direction="row" spacing={0.8}>
            <Chip
              size="small"
              color={player.socketId ? 'success' : 'default'}
              label={player.socketId ? '준비 완료' : '연결 대기'}
            />
            <Chip size="small" label={player.statusText} />
          </Stack>
        </Stack>
      ))}
    </Stack>
    <Alert severity="info">
      {hostParticipation.hostParticipatesAsPlayer
        ? '플레이어 정원은 방장을 포함한 인원 기준'
        : '플레이어 정원은 방장을 제외한 인원 기준'}
      {` (${hostParticipation.currentPlayerCount}/${hostParticipation.requiredPlayerCount})`}
    </Alert>
    {isHostView ? (
      <Alert
        severity="info"
        action={<Button onClick={onOpenGmPanel}>GM 패널</Button>}
      >
        게임 시작은 상단 GM 패널에서 실행할 수 있습니다.
      </Alert>
    ) : (
      <Alert severity="info">GM이 게임을 시작할 때까지 대기해주세요.</Alert>
    )}
  </PanelCard>
);

const IntroPanel = ({
  readAloud,
  isHostView,
  canUseHostGameMasterControls,
  canActAsPlayer,
  introConfirmed,
  onConfirmIntro,
  isReadOnly,
  onOpenGmPanel,
}: {
  readAloud: string;
  isHostView: boolean;
  canUseHostGameMasterControls: boolean;
  canActAsPlayer: boolean;
  introConfirmed: boolean;
  onConfirmIntro: () => void;
  isReadOnly: boolean;
  onOpenGmPanel: () => void;
}) => (
  <PanelCard
    title="오프닝"
    subtitle="낭독문을 확인하고 이번 사건의 시작 조건을 공유하세요."
  >
    {isReadOnly ? (
      <Alert severity="info">이전 단계 열람 모드입니다.</Alert>
    ) : null}
    <Card
      variant="outlined"
      sx={{ backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 2.5 }}
    >
      <CardContent>
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
          {readAloud}
        </Typography>
      </CardContent>
    </Card>
    {isHostView && canUseHostGameMasterControls ? (
      <Alert
        severity="info"
        action={
          <Button size="small" onClick={onOpenGmPanel}>
            INTRO 전체 표시
          </Button>
        }
      >
        INTRO 전체 표시는 GM 패널에서 진행할 수 있습니다.
      </Alert>
    ) : canActAsPlayer ? (
      <Button
        variant={introConfirmed ? 'outlined' : 'contained'}
        onClick={onConfirmIntro}
      >
        {introConfirmed ? '확인 완료' : '확인했어요'}
      </Button>
    ) : isHostView ? (
      <Alert severity="info">
        방장이 플레이어로 참가 중이라 INTRO 전체 표시 기능은 잠겨 있습니다.
      </Alert>
    ) : (
      <Alert severity="info">
        플레이어 참가자만 확인 버튼을 사용할 수 있습니다.
      </Alert>
    )}
  </PanelCard>
);

const DiscussPanel = ({
  round,
  isReadOnly,
}: {
  round: 1 | 2;
  isReadOnly: boolean;
}) => (
  <PanelCard
    title={`${round}라운드 토론`}
    subtitle="토론 탭에서는 조사 버튼이 표시되지 않습니다. 조사 단계로 이동해 행동하세요."
  >
    {isReadOnly ? (
      <Alert severity="info">이전 단계 열람 모드입니다.</Alert>
    ) : null}
    <Card
      variant="outlined"
      sx={{ borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.6)' }}
    >
      <CardContent>
        <Typography fontWeight={700} sx={{ mb: 1 }}>
          이번 라운드 목표/가이드
        </Typography>
        <Typography>{DISCUSS_GUIDE_BY_ROUND[round]}</Typography>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="body2" color="text.secondary">
          권장 토론 시간: 10~15분
        </Typography>
      </CardContent>
    </Card>
  </PanelCard>
);

const InvestigatePanel = ({
  round,
  canActAsPlayer,
  isActivePhase,
  isReadOnly,
  targets,
  used,
  deliveryMode,
  myCards,
  onSubmitInvestigation,
}: {
  round: 1 | 2;
  canActAsPlayer: boolean;
  isActivePhase: boolean;
  isReadOnly: boolean;
  targets: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['investigation']['targets'];
  used: boolean;
  deliveryMode: 'auto' | 'manual';
  myCards: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['myCards'];
  onSubmitInvestigation: (targetId: string) => void;
}) => {
  const canSubmit = canActAsPlayer && isActivePhase && !isReadOnly;
  const myRemainingText = used ? '0' : canSubmit ? '1' : '0';

  return (
    <PanelCard
      title={`${round}라운드 조사`}
      subtitle="조사 결과 카드는 조사 단계 탭에서만 크게 표시됩니다."
    >
      {isReadOnly ? (
        <Alert severity="info">이전 단계 열람 모드입니다.</Alert>
      ) : null}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Chip label={`배포 모드: ${deliveryMode}`} size="small" />
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

      <Stack spacing={1}>
        {targets.map((target) => (
          <Card key={target.id} variant="outlined" sx={{ borderRadius: 2 }}>
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
                {canActAsPlayer ? (
                  <Button
                    variant="contained"
                    color="inherit"
                    onClick={() => onSubmitInvestigation(target.id)}
                    disabled={!canSubmit || used}
                  >
                    {used ? '이번 라운드 조사 완료' : '조사하기'}
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
      </Stack>

      {canActAsPlayer ? (
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
                    <Typography fontWeight={700}>{card.title}</Typography>
                    <Typography sx={{ mt: 0.5 }}>{card.text}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      ) : null}
    </PanelCard>
  );
};

const VotePanel = ({
  isHostView,
  canActAsPlayer,
  canUseHostGameMasterControls,
  isActivePhase,
  isReadOnly,
  finalVote,
  players,
  onSubmitVote,
  onOpenGmPanel,
}: {
  isHostView: boolean;
  canActAsPlayer: boolean;
  canUseHostGameMasterControls: boolean;
  isActivePhase: boolean;
  isReadOnly: boolean;
  finalVote: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['finalVote'];
  players: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['players'];
  onSubmitVote: (suspectPlayerId: string) => void;
  onOpenGmPanel: () => void;
}) => {
  const tallyEntries = finalVote.result
    ? Object.entries(finalVote.result.tally).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <PanelCard
      title="최종 투표"
      subtitle="최종 지목을 제출하고 집계를 확인합니다."
    >
      {isReadOnly ? (
        <Alert severity="info">이전 단계 열람 모드입니다.</Alert>
      ) : null}
      <Stack spacing={0.8}>
        <Typography fontWeight={700}>{finalVote.question}</Typography>
        <Typography color="text.secondary">
          제출 현황: {finalVote.submittedVoters}/{finalVote.totalVoters}
        </Typography>
        {canActAsPlayer ? (
          <Typography color="text.secondary">
            제출 여부: {finalVote.yourVote ? '1/1' : '0/1'}
          </Typography>
        ) : null}
      </Stack>

      {canActAsPlayer ? (
        isActivePhase && !isReadOnly ? (
          <Stack spacing={1}>
            {players.map((player) => (
              <Button
                key={player.id}
                variant={
                  finalVote.yourVote === player.id ? 'contained' : 'outlined'
                }
                onClick={() => onSubmitVote(player.id)}
              >
                {player.displayName}
              </Button>
            ))}
          </Stack>
        ) : (
          <Alert severity="info">
            현재 단계에서만 투표를 제출할 수 있습니다.
          </Alert>
        )
      ) : canUseHostGameMasterControls ? (
        <Alert
          severity="info"
          action={
            <Button size="small" onClick={onOpenGmPanel}>
              GM 패널
            </Button>
          }
        >
          집계/결과 공개는 GM 패널에서 실행할 수 있습니다.
        </Alert>
      ) : isHostView ? (
        <Alert severity="info">
          방장이 플레이어로 참가 중이어서 수동 집계는 잠겨 있습니다. 모든
          플레이어가 제출하면 자동 집계됩니다.
        </Alert>
      ) : (
        <Alert severity="info">
          플레이어 참가자만 투표를 제출할 수 있습니다.
        </Alert>
      )}

      {finalVote.result ? (
        <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
          <CardContent>
            <Typography fontWeight={800}>
              집계 결과: {finalVote.result.matched ? '정답' : '오답'}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              최고 지목 대상:{' '}
              {finalVote.result.suspectPlayerId
                ? (players.find(
                    (player) => player.id === finalVote.result?.suspectPlayerId
                  )?.displayName ?? finalVote.result.suspectPlayerId)
                : '동률 또는 없음'}
            </Typography>
            <Stack direction="row" spacing={0.8} flexWrap="wrap" sx={{ mt: 1 }}>
              {tallyEntries.map(([playerId, count]) => {
                const playerName =
                  players.find((player) => player.id === playerId)
                    ?.displayName ?? playerId;
                return (
                  <Chip key={playerId} label={`${playerName} ${count}표`} />
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </PanelCard>
  );
};

const EndbookPanel = ({
  endbook,
  canUseHostGameMasterControls,
  isReadOnly,
  onOpenGmPanel,
}: {
  endbook: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['endbook'];
  canUseHostGameMasterControls: boolean;
  isReadOnly: boolean;
  onOpenGmPanel: () => void;
}) => (
  <PanelCard title="엔딩북" subtitle="사건 결말을 확인하고 마무리합니다.">
    {isReadOnly ? (
      <Alert severity="info">이전 단계 열람 모드입니다.</Alert>
    ) : null}
    {!endbook ? (
      <Typography color="text.secondary">
        엔딩북이 아직 공개되지 않았습니다.
      </Typography>
    ) : (
      <Card
        variant="outlined"
        sx={{ borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.7)' }}
      >
        <CardContent>
          <Stack spacing={1}>
            <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {endbook.common}
            </Typography>
            <Divider />
            <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {endbook.variant}
            </Typography>
            <Typography fontWeight={800}>{endbook.closingLine}</Typography>
          </Stack>
        </CardContent>
      </Card>
    )}
    {canUseHostGameMasterControls ? (
      <Alert
        severity="info"
        action={
          <Button size="small" onClick={onOpenGmPanel}>
            ENDBOOK 전체 표시
          </Button>
        }
      >
        ENDBOOK 전체 표시는 GM 패널에서 실행할 수 있습니다.
      </Alert>
    ) : null}
  </PanelCard>
);

const MySheetPanel = ({
  roleSheet,
  mode,
  onChangeMode,
  myCards,
}: {
  roleSheet: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['roleSheet'];
  mode: 'public' | 'secret';
  onChangeMode: (nextMode: 'public' | 'secret') => void;
  myCards: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['myCards'];
}) => {
  const recentCards = useMemo(
    () => [...myCards].slice(-3).reverse(),
    [myCards]
  );
  return (
    <PanelCard title="내 캐릭터" subtitle="공개/비밀 시트를 전환해 확인하세요.">
      {!roleSheet ? (
        <Typography color="text.secondary">
          아직 역할 시트가 배정되지 않았습니다.
        </Typography>
      ) : (
        <Stack spacing={1}>
          <Typography fontWeight={700}>{roleSheet.displayName}</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant={mode === 'public' ? 'contained' : 'outlined'}
              onClick={() => onChangeMode('public')}
            >
              공개 시트
            </Button>
            <Button
              size="small"
              variant={mode === 'secret' ? 'contained' : 'outlined'}
              onClick={() => onChangeMode('secret')}
            >
              비밀 시트
            </Button>
          </Stack>
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                {mode === 'public'
                  ? roleSheet.publicText
                  : roleSheet.secretText}
              </Typography>
            </CardContent>
          </Card>
          {recentCards.length > 0 ? (
            <Stack spacing={0.8}>
              <Typography variant="body2" color="text.secondary">
                최근 조사 카드 3개
              </Typography>
              <Stack direction="row" spacing={0.8} flexWrap="wrap">
                {recentCards.map((card) => (
                  <Chip key={card.id} label={card.title} size="small" />
                ))}
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      )}
    </PanelCard>
  );
};

const PartsBoardPanel = ({
  partsBoard,
}: {
  partsBoard: NonNullable<
    ReturnType<typeof useMurderMysteryGameData>['snapshot']
  >['partsBoard'];
}) => (
  <PanelCard title="파츠 보드" subtitle="획득 파츠는 즉시 전체 공개됩니다.">
    <Stack spacing={1}>
      {partsBoard.parts.map((part) => {
        const revealed = partsBoard.revealedPartIds.includes(part.id);
        return (
          <Card
            key={part.id}
            variant="outlined"
            sx={{
              backgroundColor: revealed
                ? 'rgba(187,247,208,0.45)'
                : 'rgba(241,245,249,0.7)',
            }}
          >
            <CardContent sx={{ pb: '12px !important' }}>
              <Stack spacing={0.6}>
                <Typography fontWeight={700}>{part.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  출처: {part.source}
                </Typography>
                <Typography variant="body2">{part.note}</Typography>
                <Chip
                  size="small"
                  color={revealed ? 'success' : 'default'}
                  label={revealed ? '공개됨' : '미공개'}
                />
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  </PanelCard>
);

const LogPanel = ({ logs }: { logs: TimelineLogEntry[] }) => (
  <PanelCard
    title="진행 로그"
    subtitle="공개 로그 기준으로 최신 이벤트를 확인합니다."
  >
    {logs.length === 0 ? (
      <Typography color="text.secondary">아직 로그가 없습니다.</Typography>
    ) : (
      <Stack spacing={1}>
        {logs.map((log) => (
          <Paper key={log.id} variant="outlined" sx={{ p: 1.2 }}>
            <Typography variant="caption" color="text.secondary">
              {new Date(log.at).toLocaleTimeString('ko-KR')} / {log.type}
            </Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{log.text}</Typography>
          </Paper>
        ))}
      </Stack>
    )}
  </PanelCard>
);

const HostPanel = ({
  open,
  phase,
  hostParticipatesAsPlayer,
  canUseHostGameMasterControls,
  hostControls,
  selectedCardByRequestId,
  onClose,
  onSelectCard,
  onStartGame,
  onNextPhase,
  onBroadcastIntro,
  onFinalizeVote,
  onBroadcastEndbook,
  onResolvePending,
  onResetGame,
}: HostPanelProps) => (
  <Drawer anchor="right" open={open} onClose={onClose}>
    <Box
      sx={{
        width: { xs: '100vw', sm: 460 },
        p: 2.5,
      }}
      role="presentation"
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6" fontWeight={800}>
            GM 패널
          </Typography>
          <Chip color="primary" label={`${phaseLabelMap[phase]} (${phase})`} />
        </Stack>

        <Stack spacing={1}>
          {phase === 'LOBBY' ? (
            <Button variant="contained" color="secondary" onClick={onStartGame}>
              게임 시작
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              onClick={onNextPhase}
              disabled={phase === 'FINAL_VOTE' || phase === 'ENDBOOK'}
            >
              다음 단계
            </Button>
          )}
          {canUseHostGameMasterControls ? (
            <>
              <Button
                variant="outlined"
                onClick={onBroadcastIntro}
                disabled={phase !== 'INTRO'}
              >
                INTRO 전체 표시
              </Button>
              <Button
                variant="outlined"
                onClick={onFinalizeVote}
                disabled={phase !== 'FINAL_VOTE'}
              >
                최종 투표 집계/결과 공개
              </Button>
              <Button
                variant="outlined"
                onClick={onBroadcastEndbook}
                disabled={phase !== 'ENDBOOK'}
              >
                ENDBOOK 전체 표시
              </Button>
            </>
          ) : (
            <Alert severity="info">
              방장이 플레이어로 참가 중이므로 진행자 전용 기능(전체 공개/수동
              배포/수동 집계)은 잠겨 있습니다.
            </Alert>
          )}
          <Button variant="text" color="inherit" onClick={onResetGame}>
            게임 리셋
          </Button>
        </Stack>

        {canUseHostGameMasterControls ? (
          <>
            <Divider />
            <Stack spacing={1}>
              <Typography fontWeight={700}>조사카드 수동 배포</Typography>
              {hostControls && hostControls.pendingInvestigations.length > 0 ? (
                hostControls.pendingInvestigations.map((pending) => (
                  <Paper
                    key={pending.requestId}
                    variant="outlined"
                    sx={{ p: 1.2, borderRadius: 2 }}
                  >
                    <Stack spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        {pending.playerName} / {pending.targetLabel} / 라운드{' '}
                        {pending.round}
                      </Typography>
                      <FormControl size="small" fullWidth>
                        <InputLabel id={`pending-card-${pending.requestId}`}>
                          카드 선택
                        </InputLabel>
                        <Select
                          labelId={`pending-card-${pending.requestId}`}
                          label="카드 선택"
                          value={
                            selectedCardByRequestId[pending.requestId] ?? ''
                          }
                          onChange={(event) =>
                            onSelectCard(
                              pending.requestId,
                              String(event.target.value ?? '')
                            )
                          }
                        >
                          {pending.cardOptions.map((card) => (
                            <MenuItem key={card.id} value={card.id}>
                              {card.title}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        onClick={() =>
                          onResolvePending(
                            pending.requestId,
                            selectedCardByRequestId[pending.requestId]
                          )
                        }
                      >
                        배포
                      </Button>
                    </Stack>
                  </Paper>
                ))
              ) : (
                <Typography color="text.secondary">
                  대기 중인 수동 배포 요청이 없습니다.
                </Typography>
              )}
            </Stack>

            <Divider />
            <Stack spacing={1}>
              <Typography fontWeight={700}>플레이어 조사 카드 현황</Typography>
              {hostControls ? (
                Object.entries(hostControls.cardsByPlayerId).map(
                  ([playerId, cards]) => {
                    const playerName =
                      hostControls.roleAssignments.find(
                        (entry) => entry.playerId === playerId
                      )?.playerName ?? playerId;
                    return (
                      <Paper key={playerId} variant="outlined" sx={{ p: 1.2 }}>
                        <Typography fontWeight={700}>{playerName}</Typography>
                        {cards.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            카드 없음
                          </Typography>
                        ) : (
                          <Stack direction="row" spacing={0.8} flexWrap="wrap">
                            {cards.map((card) => (
                              <Chip
                                key={card.id}
                                label={card.title}
                                size="small"
                              />
                            ))}
                          </Stack>
                        )}
                      </Paper>
                    );
                  }
                )
              ) : (
                <Typography color="text.secondary">
                  카드 현황을 표시할 데이터가 없습니다.
                </Typography>
              )}
            </Stack>
          </>
        ) : hostParticipatesAsPlayer ? (
          <Alert severity="info">
            방장이 플레이어로 참가 중이라 다른 플레이어의 비밀 정보와 카드
            현황은 표시되지 않습니다.
          </Alert>
        ) : null}
      </Stack>
    </Box>
  </Drawer>
);

export default function MurderMysteryGameScreen({
  roomId,
  isHostView,
}: MurderMysteryGameScreenProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useAppDispatch();
  const { socket } = useSocket();
  const { data: session } = useSession();
  const router = useRouter();
  const { enqueueSnackbar } = useCustomSnackbar();
  const sessionId = session?.user?.id ?? '';
  const [selectedPhase, setSelectedPhase] =
    useState<MurderMysteryPhase>('LOBBY');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('SHEET');
  const [sheetMode, setSheetMode] = useState<'public' | 'secret'>('public');
  const [isHostPanelOpen, setIsHostPanelOpen] = useState(false);
  const [introConfirmed, setIntroConfirmed] = useState(false);
  const [selectedCardByRequestId, setSelectedCardByRequestId] = useState<
    Record<string, string>
  >({});
  const [timelineLogs, setTimelineLogs] = useState<TimelineLogEntry[]>([]);
  const guideRevealNotifiedRef = useRef(false);
  const prevPhaseRef = useRef<MurderMysteryPhase | null>(null);

  useCheckVersion(socket);
  useUpdateSocketId(socket, session, roomId);
  useLeaveRoom(socket, dispatch);
  useRedirectIfNotHost(roomId, isHostView);
  useRedirectIfInvalidRoom(roomId, !isHostView);

  const { snapshot, latestAnnouncement, latestPartReveal } =
    useMurderMysteryGameData(roomId, socket, sessionId);

  const appendTimelineLog = (entry: TimelineLogEntry) => {
    setTimelineLogs((prev) => {
      if (prev.some((log) => log.id === entry.id)) {
        return prev;
      }
      return [entry, ...prev].slice(0, 60);
    });
  };

  const notifyGuideReveal = (at: number) => {
    if (guideRevealNotifiedRef.current) {
      return;
    }
    guideRevealNotifiedRef.current = true;
    appendTimelineLog({
      id: GUIDE_REVEAL_LOG_ID,
      type: 'SYSTEM',
      text: GUIDE_REVEAL_LOG_TEXT,
      at,
    });
    enqueueSnackbar(GUIDE_REVEAL_LOG_TEXT, {
      variant: 'info',
    });
  };

  useEffect(() => {
    if (!latestPartReveal) {
      return;
    }
    const at = Date.now();
    enqueueSnackbar(`파츠 공개: ${latestPartReveal.part.name}`, {
      variant: 'info',
    });
    appendTimelineLog({
      id: `part:${latestPartReveal.cardId}:${latestPartReveal.byPlayerId}:${latestPartReveal.part.id}:${at}`,
      type: 'PART',
      text: `파츠 공개: ${latestPartReveal.part.name} (${latestPartReveal.part.source})`,
      at,
    });
    if (latestPartReveal.cardId === GUIDE_REVEAL_CARD_ID) {
      notifyGuideReveal(at);
    }
  }, [latestPartReveal, enqueueSnackbar]);

  useEffect(() => {
    if (!latestAnnouncement) {
      return;
    }
    if (
      latestAnnouncement.type === 'INTRO' ||
      latestAnnouncement.type === 'ENDBOOK'
    ) {
      enqueueSnackbar(
        `${latestAnnouncement.type} 낭독문이 전체 표시되었습니다.`,
        {
          variant: 'success',
        }
      );
    }
  }, [latestAnnouncement, enqueueSnackbar]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    if (
      snapshot.players.some((player) => player.displayName === GUIDE_REAL_NAME)
    ) {
      notifyGuideReveal(Date.now());
    }
  }, [snapshot?.players]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    setSelectedPhase(snapshot.phase);
    if (
      prevPhaseRef.current &&
      prevPhaseRef.current !== 'LOBBY' &&
      snapshot.phase === 'LOBBY'
    ) {
      setTimelineLogs([]);
      setIntroConfirmed(false);
      guideRevealNotifiedRef.current = false;
      setSelectedCardByRequestId({});
      setSidebarTab('SHEET');
    }
    prevPhaseRef.current = snapshot.phase;
  }, [snapshot?.phase]);

  const emitWithAck = <T extends object>(
    eventName: string,
    payload: T,
    successMessage?: string
  ) => {
    if (!socket) {
      return;
    }
    const looseSocket = socket as unknown as {
      emit: (
        event: string,
        data: unknown,
        callback: (response: { success: boolean; message?: string }) => void
      ) => void;
    };
    looseSocket.emit(
      eventName,
      payload,
      (response: { success: boolean; message?: string }) => {
        if (!response.success) {
          enqueueSnackbar(response.message ?? '요청 처리에 실패했습니다.', {
            variant: 'error',
          });
          return;
        }
        if (successMessage) {
          enqueueSnackbar(successMessage, { variant: 'success' });
        }
      }
    );
  };

  const handleLeaveRoom = () => {
    if (!socket || !sessionId) {
      return;
    }
    socket.emit('leave-room', { roomId, sessionId }, (response) => {
      if (!response.success) {
        enqueueSnackbar(response.message ?? '방 나가기에 실패했습니다.', {
          variant: 'error',
        });
        return;
      }
      router.replace('/');
    });
  };

  const handleSubmitInvestigation = (targetId: string) => {
    emitWithAck(
      'mm_submit_investigation',
      {
        roomId,
        sessionId,
        targetId,
      },
      '조사를 완료했습니다.'
    );
  };

  const handleSubmitVote = (suspectPlayerId: string) => {
    emitWithAck(
      'mm_submit_vote',
      {
        roomId,
        sessionId,
        suspectPlayerId,
      },
      '최종 투표를 제출했습니다.'
    );
  };

  const handleResolvePending = (requestId: string, cardId?: string) => {
    emitWithAck(
      'mm_host_resolve_investigation',
      {
        roomId,
        sessionId,
        requestId,
        cardId: cardId || undefined,
      },
      '조사 결과 카드를 배포했습니다.'
    );
  };

  const combinedLogs = useMemo(() => {
    const announcementLogs =
      snapshot?.announcements.map((announcement) => ({
        id: announcement.id,
        type: announcement.type,
        text: announcement.text,
        at: announcement.at,
      })) ?? [];
    const merged = [...announcementLogs, ...timelineLogs];
    const unique = new Map<string, TimelineLogEntry>();
    merged.forEach((entry) => {
      if (!unique.has(entry.id)) {
        unique.set(entry.id, entry);
      }
    });
    return [...unique.values()].sort((a, b) => b.at - a.at).slice(0, 60);
  }, [snapshot?.announcements, timelineLogs]);

  if (!snapshot) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Typography>머더미스터리 상태를 불러오는 중입니다.</Typography>
      </Box>
    );
  }

  const {
    scenario,
    phase,
    players,
    roleSheet,
    myCards,
    partsBoard,
    investigation,
    finalVote,
    endbook,
    hostParticipation,
    canUseHostGameMasterControls,
    hostControls,
  } = snapshot;
  const hostParticipatesAsPlayer = hostParticipation.hostParticipatesAsPlayer;
  const canActAsPlayer = Boolean(roleSheet);

  const currentPhaseIndex = getPhaseIndex(phase);
  const selectedPhaseIndex = getPhaseIndex(selectedPhase);
  const isReadOnlyTab = selectedPhaseIndex < currentPhaseIndex;
  const selectedInvestigateRound = INVESTIGATE_ROUND_BY_PHASE[selectedPhase];
  const selectedDiscussRound =
    selectedPhase === 'ROUND1_DISCUSS'
      ? 1
      : selectedPhase === 'ROUND2_DISCUSS'
        ? 2
        : null;
  const selectedRoundTargets = selectedInvestigateRound
    ? (scenario.investigations.rounds.find(
        (entry) => entry.round === selectedInvestigateRound
      )?.targets ?? [])
    : [];

  const activeSidebarTabs: SidebarTab[] =
    selectedPhase === 'LOBBY' ? ['SHEET'] : ['SHEET', 'PARTS', 'LOG'];
  const resolvedSidebarTab = activeSidebarTabs.includes(sidebarTab)
    ? sidebarTab
    : 'SHEET';

  const renderMainPanel = () => {
    switch (selectedPhase) {
      case 'LOBBY':
        return (
          <LobbyPanel
            players={players}
            isHostView={isHostView}
            hostParticipation={hostParticipation}
            onOpenGmPanel={() => setIsHostPanelOpen(true)}
          />
        );
      case 'INTRO':
        return (
          <IntroPanel
            readAloud={scenario.intro.readAloud}
            isHostView={isHostView}
            canUseHostGameMasterControls={canUseHostGameMasterControls}
            canActAsPlayer={canActAsPlayer}
            introConfirmed={introConfirmed}
            onConfirmIntro={() => setIntroConfirmed(true)}
            isReadOnly={isReadOnlyTab}
            onOpenGmPanel={() => setIsHostPanelOpen(true)}
          />
        );
      case 'ROUND1_DISCUSS':
      case 'ROUND2_DISCUSS':
        return (
          <DiscussPanel
            round={selectedDiscussRound ?? 1}
            isReadOnly={isReadOnlyTab}
          />
        );
      case 'ROUND1_INVESTIGATE':
      case 'ROUND2_INVESTIGATE':
        return (
          <InvestigatePanel
            round={selectedInvestigateRound ?? 1}
            canActAsPlayer={canActAsPlayer}
            isActivePhase={selectedPhase === phase}
            isReadOnly={isReadOnlyTab}
            targets={selectedRoundTargets}
            used={selectedPhase === phase ? investigation.used : false}
            deliveryMode={scenario.investigations.deliveryMode}
            myCards={myCards}
            onSubmitInvestigation={handleSubmitInvestigation}
          />
        );
      case 'FINAL_VOTE':
        return (
          <VotePanel
            isHostView={isHostView}
            canActAsPlayer={canActAsPlayer}
            canUseHostGameMasterControls={canUseHostGameMasterControls}
            isActivePhase={selectedPhase === phase}
            isReadOnly={isReadOnlyTab}
            finalVote={finalVote}
            players={players}
            onSubmitVote={handleSubmitVote}
            onOpenGmPanel={() => setIsHostPanelOpen(true)}
          />
        );
      case 'ENDBOOK':
        return (
          <EndbookPanel
            endbook={endbook}
            canUseHostGameMasterControls={canUseHostGameMasterControls}
            isReadOnly={isReadOnlyTab}
            onOpenGmPanel={() => setIsHostPanelOpen(true)}
          />
        );
      default:
        return null;
    }
  };

  const renderSidebarContent = (tab: SidebarTab) => {
    if (tab === 'SHEET') {
      return (
        <MySheetPanel
          roleSheet={roleSheet}
          mode={sheetMode}
          onChangeMode={setSheetMode}
          myCards={myCards}
        />
      );
    }
    if (tab === 'PARTS') {
      return <PartsBoardPanel partsBoard={partsBoard} />;
    }
    return <LogPanel logs={combinedLogs} />;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 400px at 10% -10%, rgba(180,83,9,0.2), transparent 60%), radial-gradient(900px 420px at 100% -20%, rgba(14,116,144,0.17), transparent 60%), linear-gradient(180deg, #fff7ed 0%, #ffedd5 52%, #e0f2fe 100%)',
        px: { xs: 2, md: 4 },
        py: 3,
      }}
    >
      <Stack spacing={2.2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={1.2}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={1}
          >
            <Typography variant="h4" fontWeight={800}>
              🕵️ {scenario.roomDisplayName}
            </Typography>
            <Chip label={`ROOM ${roomId}`} />
            <Chip
              color="primary"
              label={`${phaseLabelMap[phase]} (${phase})`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            {isHostView ? (
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setIsHostPanelOpen(true)}
              >
                GM 패널
              </Button>
            ) : null}
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleLeaveRoom}
            >
              나가기
            </Button>
          </Stack>
        </Stack>

        <Paper sx={panelPaperSx}>
          <Typography variant="h6" fontWeight={700}>
            시나리오
          </Typography>
          <Typography color="text.secondary">{scenario.title}</Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={0.8}
            sx={{ mt: 1 }}
          >
            <Chip
              size="small"
              label={
                hostParticipatesAsPlayer
                  ? '방장도 플레이어 참가'
                  : '방장은 진행자 전용'
              }
            />
            <Chip
              size="small"
              color="primary"
              label={
                hostParticipatesAsPlayer
                  ? '정원 기준: 방장 포함'
                  : '정원 기준: 방장 제외'
              }
            />
            <Chip
              size="small"
              label={`현재 인원 ${hostParticipation.currentPlayerCount}/${hostParticipation.requiredPlayerCount}`}
            />
          </Stack>
        </Paper>

        <TabRouter
          currentPhase={phase}
          selectedPhase={selectedPhase}
          onSelect={setSelectedPhase}
        />

        {isReadOnlyTab ? (
          <Alert severity="info">
            현재 단계는 {phaseLabelMap[phase]}입니다. 이 탭은 이전 단계 열람
            모드입니다.
          </Alert>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' },
          }}
        >
          <Box>{renderMainPanel()}</Box>

          {isMobile ? (
            <Paper
              sx={{
                ...panelPaperSx,
                p: 1.2,
                position: 'sticky',
                bottom: 12,
                zIndex: 12,
              }}
            >
              {activeSidebarTabs.length > 1 ? (
                <Tabs
                  value={resolvedSidebarTab}
                  onChange={(_, value: SidebarTab) => setSidebarTab(value)}
                  variant="fullWidth"
                >
                  {activeSidebarTabs.map((tab) => (
                    <Tab
                      key={tab}
                      value={tab}
                      label={
                        tab === 'SHEET'
                          ? '내 시트'
                          : tab === 'PARTS'
                            ? '파츠'
                            : '로그'
                      }
                    />
                  ))}
                </Tabs>
              ) : null}
              <Box sx={{ mt: activeSidebarTabs.length > 1 ? 1.2 : 0 }}>
                {renderSidebarContent(resolvedSidebarTab)}
              </Box>
            </Paper>
          ) : (
            <Stack spacing={2}>
              <MySheetPanel
                roleSheet={roleSheet}
                mode={sheetMode}
                onChangeMode={setSheetMode}
                myCards={myCards}
              />
              {selectedPhase !== 'LOBBY' ? (
                <>
                  <PartsBoardPanel partsBoard={partsBoard} />
                  <LogPanel logs={combinedLogs} />
                </>
              ) : null}
            </Stack>
          )}
        </Box>
      </Stack>

      {isHostView ? (
        <HostPanel
          open={isHostPanelOpen}
          phase={phase}
          hostParticipatesAsPlayer={hostParticipatesAsPlayer}
          canUseHostGameMasterControls={canUseHostGameMasterControls}
          hostControls={hostControls}
          selectedCardByRequestId={selectedCardByRequestId}
          onClose={() => setIsHostPanelOpen(false)}
          onSelectCard={(requestId, cardId) =>
            setSelectedCardByRequestId((prev) => ({
              ...prev,
              [requestId]: cardId,
            }))
          }
          onStartGame={() =>
            emitWithAck(
              'mm_host_start_game',
              { roomId, sessionId },
              '게임을 시작했습니다.'
            )
          }
          onNextPhase={() =>
            emitWithAck(
              'mm_host_next_phase',
              { roomId, sessionId },
              '다음 단계로 이동했습니다.'
            )
          }
          onBroadcastIntro={() =>
            emitWithAck(
              'mm_host_broadcast_intro',
              { roomId, sessionId },
              'INTRO 낭독문을 전체 표시했습니다.'
            )
          }
          onFinalizeVote={() =>
            emitWithAck(
              'mm_host_finalize_vote',
              { roomId, sessionId },
              '최종 투표를 집계했습니다.'
            )
          }
          onBroadcastEndbook={() =>
            emitWithAck(
              'mm_host_broadcast_endbook',
              { roomId, sessionId },
              'ENDBOOK 낭독문을 전체 표시했습니다.'
            )
          }
          onResolvePending={handleResolvePending}
          onResetGame={() =>
            emitWithAck(
              'mm_host_reset_game',
              { roomId, sessionId },
              '게임을 LOBBY 상태로 초기화했습니다.'
            )
          }
        />
      ) : null}
    </Box>
  );
}
