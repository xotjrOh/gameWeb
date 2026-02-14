import { CommonResponse } from '@/types/socket';

export type MurderMysteryPhase = string;
export type MurderMysteryStepKind =
  | 'intro'
  | 'investigate'
  | 'discuss'
  | 'final_vote'
  | 'endbook';

export type MurderMysteryPlayerStatus = '감시' | '격리' | '결박';
export type MurderMysteryDeliveryMode = 'auto' | 'manual';
export type MurderMysteryClueDepletionMode = 'global' | 'per_target';
export type MurderMysteryInvestigationRound = number;
export type MurderMysteryTargetType = 'location' | 'character' | 'item';

export interface MurderMysteryPlayersConfig {
  min: number;
  max: number;
}

export interface MurderMysteryDynamicDisplayNameRule {
  id?: string;
  trigger: {
    type: 'cardRevealed';
    cardId: string;
    round?: MurderMysteryInvestigationRound;
  };
  newDisplayName: string;
}

export interface MurderMysteryRoleScenario {
  id: string;
  displayName: string;
  publicText: string;
  secretText: string;
  dynamicDisplayNameRules?: MurderMysteryDynamicDisplayNameRule[];
}

export interface MurderMysteryPartScenario {
  id: string;
  name: string;
  source: string;
  note: string;
}

export interface MurderMysteryCardEffectAddPart {
  type: 'addPart';
  partId: string;
}

export interface MurderMysteryCardEffectRevealRoleName {
  type: 'revealRoleName';
  roleId: string;
  newDisplayName: string;
}

export type MurderMysteryCardEffect =
  | MurderMysteryCardEffectAddPart
  | MurderMysteryCardEffectRevealRoleName;

export interface MurderMysteryCardScenario {
  id: string;
  title: string;
  text: string;
  effects?: MurderMysteryCardEffect[];
}

export interface MurderMysteryInvestigationTargetScenario {
  id: string;
  label: string;
  description?: string;
  targetType: MurderMysteryTargetType;
  entityKey: string;
  sectionId?: string;
  order?: number;
  icon?: string;
  cardPool: string[];
}

export interface MurderMysteryInvestigationRoundScenario {
  round: MurderMysteryInvestigationRound;
  targets: MurderMysteryInvestigationTargetScenario[];
}

export interface MurderMysteryInvestigationLayoutSection {
  id: string;
  title: string;
  targetTypes?: MurderMysteryTargetType[];
  targetIds?: string[];
  order?: number;
  icon?: string;
}

export interface MurderMysteryFlowStepScenario {
  id: string;
  label: string;
  kind: MurderMysteryStepKind;
  round?: number;
  durationSec?: number;
  description?: string;
  enterAnnouncement?: string;
}

export interface MurderMysteryFlowScenario {
  steps: MurderMysteryFlowStepScenario[];
}

export interface MurderMysteryScenario {
  id: string;
  title: string;
  roomDisplayName: string;
  players: MurderMysteryPlayersConfig;
  rules: {
    investigationsPerRound: number;
    noEliminationDuringGame: boolean;
    partsAutoReveal: boolean;
    partsPublicDetail: boolean;
  };
  flow: MurderMysteryFlowScenario;
  intro: {
    readAloud: string;
  };
  roles: MurderMysteryRoleScenario[];
  parts: MurderMysteryPartScenario[];
  investigations: {
    deliveryMode: MurderMysteryDeliveryMode;
    depletionMode: MurderMysteryClueDepletionMode;
    layout: {
      sections: MurderMysteryInvestigationLayoutSection[];
    };
    rounds: MurderMysteryInvestigationRoundScenario[];
  };
  cards: MurderMysteryCardScenario[];
  finalVote: {
    question: string;
    correctRoleId: string;
  };
  endbook: {
    common: string;
    variantMatched: string;
    variantNotMatched: string;
    closingLine: string;
  };
}

export interface MurderMysteryPlayerData {
  statusText: MurderMysteryPlayerStatus;
}

export type MurderMysteryInvestigationUsage = Record<
  MurderMysteryInvestigationRound,
  boolean
>;

export interface MurderMysteryPendingInvestigation {
  requestId: string;
  playerId: string;
  targetId: string;
  round: MurderMysteryInvestigationRound;
  requestedAt: number;
}

export interface MurderMysteryAnnouncement {
  id: string;
  type: 'INTRO' | 'ENDBOOK' | 'SYSTEM';
  text: string;
  at: number;
}

export interface MurderMysteryFinalVoteResult {
  suspectPlayerId: string | null;
  matched: boolean;
  tally: Record<string, number>;
}

export interface MurderMysteryGameData {
  scenarioId: string;
  scenarioTitle: string;
  scenarioRoomDisplayName: string;
  hostParticipatesAsPlayer: boolean;
  phase: MurderMysteryPhase;
  phaseStartedAt: number | null;
  phaseDurationSec: number | null;
  roleByPlayerId: Record<string, string>;
  roleDisplayNameByPlayerId: Record<string, string>;
  investigationUsedByPlayerId: Record<string, MurderMysteryInvestigationUsage>;
  pendingInvestigations: MurderMysteryPendingInvestigation[];
  revealedCardsByPlayerId: Record<string, string[]>;
  revealedCardIds: string[];
  revealedCardIdsByTargetId: Record<string, string[]>;
  revealedPartIds: string[];
  voteByPlayerId: Record<string, string>;
  finalVoteResult: MurderMysteryFinalVoteResult | null;
  endbookVariant: 'matched' | 'notMatched' | null;
  announcements: MurderMysteryAnnouncement[];
  appliedDynamicRuleIds: Record<string, true>;
}

export interface MurderMysteryRoleSheetView {
  roleId: string;
  displayName: string;
  publicText: string;
  secretText: string;
}

export interface MurderMysteryPublicPlayerView {
  id: string;
  name: string;
  socketId: string;
  displayName: string;
  statusText: MurderMysteryPlayerStatus;
}

export interface MurderMysteryHostRoleAssignmentView {
  playerId: string;
  playerName: string;
  roleId: string;
  displayName: string;
  secretText: string;
}

export interface MurderMysteryHostPendingView {
  requestId: string;
  playerId: string;
  playerName: string;
  targetId: string;
  targetLabel: string;
  round: MurderMysteryInvestigationRound;
  requestedAt: number;
  cardOptions: MurderMysteryCardScenario[];
}

export interface MurderMysteryHostControlsView {
  pendingInvestigations: MurderMysteryHostPendingView[];
  roleAssignments: MurderMysteryHostRoleAssignmentView[];
  cardsByPlayerId: Record<string, MurderMysteryCardScenario[]>;
}

export interface MurderMysteryInvestigationView {
  round: MurderMysteryInvestigationRound | null;
  revealedCardIds: string[];
  revealedCardIdsByTargetId: Record<string, string[]>;
  layoutSections: MurderMysteryInvestigationLayoutSection[];
  used: boolean;
  targets: Array<
    MurderMysteryInvestigationTargetScenario & {
      totalClues: number;
      revealedClues: number;
      remainingClues: number;
      isExhausted: boolean;
    }
  >;
}

export interface MurderMysteryClueVaultCardView
  extends MurderMysteryCardScenario {
  sourceTargetIds: string[];
  sourceTargetLabels: string[];
}

export interface MurderMysteryFinalVoteView {
  question: string;
  totalVoters: number;
  submittedVoters: number;
  yourVote: string | null;
  votes: Record<string, string>;
  result: MurderMysteryFinalVoteResult | null;
}

export interface MurderMysteryEndbookView {
  common: string;
  variant: string;
  closingLine: string;
}

export interface MurderMysteryStateSnapshot {
  roomId: string;
  scenario: {
    id: string;
    title: string;
    roomDisplayName: string;
    intro: {
      readAloud: string;
    };
    rules: {
      partsPublicDetail: boolean;
    };
    flow: MurderMysteryFlowScenario;
    parts: MurderMysteryPartScenario[];
    investigations: MurderMysteryScenario['investigations'];
    finalVote: MurderMysteryScenario['finalVote'];
    endbook: MurderMysteryScenario['endbook'];
  };
  phase: MurderMysteryPhase;
  phaseOrder: MurderMysteryPhase[];
  players: MurderMysteryPublicPlayerView[];
  roleSheet: MurderMysteryRoleSheetView | null;
  myCards: MurderMysteryCardScenario[];
  clueVault: {
    myClues: MurderMysteryClueVaultCardView[];
    publicClues: MurderMysteryClueVaultCardView[];
  };
  partsBoard: {
    totalCount: number;
    revealedCount: number;
    revealedPartIds: string[];
    parts?: MurderMysteryPartScenario[];
  };
  announcements: MurderMysteryAnnouncement[];
  phaseTimer: {
    durationSec: number | null;
    startedAt: number | null;
    remainingSec: number | null;
    isExpired: boolean;
  };
  investigation: MurderMysteryInvestigationView;
  finalVote: MurderMysteryFinalVoteView;
  endbook: MurderMysteryEndbookView | null;
  isHostView: boolean;
  hostParticipation: {
    hostParticipatesAsPlayer: boolean;
    playerCountIncludesHost: boolean;
    currentPlayerCount: number;
    requiredPlayerCount: number;
  };
  canUseHostGameMasterControls: boolean;
  hostControls?: MurderMysteryHostControlsView;
}

export interface MurderMysteryScenarioCatalogItem {
  id: string;
  title: string;
  roomDisplayName: string;
  players: MurderMysteryPlayersConfig;
}

export interface MurderMysteryClientToServerEvents {
  mm_get_state: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_host_start_game: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_host_next_phase: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_host_finalize_vote: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_host_broadcast_intro: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_host_broadcast_endbook: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_host_resolve_investigation: (
    data: {
      roomId: string;
      sessionId: string;
      requestId: string;
      cardId?: string;
    },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_host_reset_game: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_submit_investigation: (
    data: { roomId: string; sessionId: string; targetId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_submit_vote: (
    data: {
      roomId: string;
      sessionId: string;
      suspectPlayerId: string;
    },
    callback: (response: CommonResponse) => void
  ) => void;
}

export interface MurderMysteryServerToClientEvents {
  mm_state_snapshot: (data: MurderMysteryStateSnapshot) => void;
  mm_part_revealed: (data: {
    partId: string;
    partName: string;
    byPlayerId: string;
    cardId: string;
    revealedCount: number;
    totalCount: number;
  }) => void;
  mm_announcement: (data: MurderMysteryAnnouncement) => void;
}
