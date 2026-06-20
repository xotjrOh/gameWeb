import { CommonResponse } from '@/types/socket';

export type MurderMysteryPhase = string;
export type MurderMysteryStepKind =
  | 'intro'
  | 'role_selection'
  | 'role_reading'
  | 'investigate'
  | 'discuss'
  | 'final_vote'
  | 'ending_choice'
  | 'endbook';

export type MurderMysteryPlayerStatus = '감시' | '격리' | '결박';
export type MurderMysteryDeliveryMode = 'auto' | 'manual';
export type MurderMysteryClueDepletionMode = 'global' | 'per_target';
export type MurderMysteryInvestigationRound = number;
export type MurderMysteryTargetType = 'location' | 'character' | 'item';
export type MurderMysterySpecialEventOutcome = 'reveal' | 'seal';
export type MurderMysterySpecialEventStatus = 'pending' | 'revealed' | 'sealed';
export type MurderMysteryRoleSelectionStatus = 'open' | 'locked';

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
  personalGoal?: string;
  ruleText?: string;
  belongingHints?: MurderMysteryRoleBelongingHintScenario[];
  secretTextHighlights?: string[];
  portraitSrc?: string;
  portraitAlt?: string;
  secretTextPath?: string;
  dynamicDisplayNameRules?: MurderMysteryDynamicDisplayNameRule[];
}

export interface MurderMysteryRoleBelongingHintScenario {
  label: string;
  hint: string;
}

export interface MurderMysteryPublicCoverScenario {
  id: string;
  displayName: string;
  publicText: string;
  portraitSrc?: string;
  portraitAlt?: string;
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

export interface MurderMysteryCardBackStyle {
  imageSrc?: string;
  shortLabel?: string;
}

export interface MurderMysteryCardScenario {
  id: string;
  text: string;
  textHighlights?: string[];
  imageSrc?: string;
  imageAlt?: string;
  backId?: string;
  back?: MurderMysteryCardBackStyle;
  extraInvestigationOnReveal?: boolean;
  publicRevealDisabled?: boolean;
  effects?: MurderMysteryCardEffect[];
}

export interface MurderMysteryInitialRoleCardScenario {
  roleId: string;
  cardId: string;
  sourceLabel?: string;
}

export interface MurderMysterySpecialEventScenario {
  id: string;
  label: string;
  description: string;
  reporterRoleIds: string[];
  revealCardId: string;
  revealAnnouncement?: string;
  sealAnnouncement?: string;
}

export interface MurderMysteryInvestigationTargetScenario {
  id: string;
  label: string;
  description?: string;
  targetType: MurderMysteryTargetType;
  entityKey: string;
  containerId?: string;
  containerLabel?: string;
  ownerRoleId?: string;
  sectionId?: string;
  order?: number;
  icon?: string;
  repeatable?: boolean;
  cardBack?: MurderMysteryCardBackStyle;
  cardPool: string[];
}

export interface MurderMysteryInvestigationRoundScenario {
  round: MurderMysteryInvestigationRound;
  investigationsPerPlayer?: number;
  targets: MurderMysteryInvestigationTargetScenario[];
}

export interface MurderMysteryInvestigationTurnOrderScenario {
  roleIds: string[];
  rotateFirstPlayerEachRound: boolean;
}

export interface MurderMysteryRequiredFirstInvestigationScenario {
  roleId: string;
  round: MurderMysteryInvestigationRound;
  targetId: string;
  reason?: string;
}

export interface MurderMysteryInvestigationLayoutSection {
  id: string;
  title: string;
  targetTypes?: MurderMysteryTargetType[];
  targetIds?: string[];
  order?: number;
  icon?: string;
}

export interface MurderMysteryInvestigationMapSceneScenario {
  imageSrc: string;
  alt: string;
  width: number;
  height: number;
}

export interface MurderMysteryInvestigationMapHotspotScenario {
  id: string;
  targetId: string;
  label?: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface MurderMysteryInvestigationLayoutMapScenario {
  scene: MurderMysteryInvestigationMapSceneScenario;
  hotspots: MurderMysteryInvestigationMapHotspotScenario[];
}

export interface MurderMysteryInvestigationLayoutScenario {
  sections: MurderMysteryInvestigationLayoutSection[];
  map?: MurderMysteryInvestigationLayoutMapScenario;
}

export interface MurderMysteryInvestigationsScenario {
  deliveryMode: MurderMysteryDeliveryMode;
  depletionMode: MurderMysteryClueDepletionMode;
  turnOrder?: MurderMysteryInvestigationTurnOrderScenario;
  requiredFirstInvestigations?: MurderMysteryRequiredFirstInvestigationScenario[];
  layout: MurderMysteryInvestigationLayoutScenario;
  rounds: MurderMysteryInvestigationRoundScenario[];
}

export interface MurderMysteryFlowStepScenario {
  id: string;
  label: string;
  kind: MurderMysteryStepKind;
  round?: number;
  durationSec?: number;
  description?: string;
  readAloud?: string;
  enterAnnouncement?: string;
}

export interface MurderMysteryFlowScenario {
  steps: MurderMysteryFlowStepScenario[];
}

export type MurderMysteryFinalVoteOptionType = 'role' | 'npc' | 'none';

export interface MurderMysteryFinalVoteOptionScenario {
  id: string;
  label: string;
  optionType: MurderMysteryFinalVoteOptionType;
  roleId?: string;
}

export interface MurderMysteryEndingChoiceConditionScenario {
  finalVoteMatched?: boolean;
  finalVoteOptionId?: string | null;
}

export interface MurderMysteryEndingChoiceOptionScenario {
  id: string;
  label: string;
  description?: string;
}

export interface MurderMysteryEndingChoiceScenario {
  id: string;
  roleId: string;
  label: string;
  description: string;
  opensWhen?: MurderMysteryEndingChoiceConditionScenario;
  options: MurderMysteryEndingChoiceOptionScenario[];
}

export interface MurderMysteryEndbookConditionScenario {
  finalVoteMatched?: boolean;
  finalVoteOptionId?: string | null;
  choices?: Record<string, string>;
}

export interface MurderMysteryEndbookVariantScenario {
  id: string;
  title: string;
  body: string;
  when: MurderMysteryEndbookConditionScenario;
}

export interface MurderMysteryEndbookSectionScenario {
  id: string;
  title?: string;
  body: string;
  when?: MurderMysteryEndbookConditionScenario;
}

export type MurderMysteryEndbookEvidenceSourceType =
  | 'investigation_card'
  | 'role_sheet'
  | 'public_script';

export interface MurderMysteryEndbookEvidenceReferenceScenario {
  id: string;
  sourceType: MurderMysteryEndbookEvidenceSourceType;
  label: string;
  sourceName: string;
  excerpt: string;
  inference: string;
  cardId?: string;
  roleId?: string;
  stepId?: string;
}

export type MurderMysteryEndbookEvidenceOriginalSourceView =
  | {
      kind: 'investigation_card';
      card: MurderMysteryClueVaultCardView;
    }
  | {
      kind: 'role_sheet';
      roleSheet: MurderMysteryRoleSheetView;
    }
  | {
      kind: 'public_script';
      script: MurderMysteryPublicScriptView;
    };

export interface MurderMysteryEndbookEvidenceReferenceView
  extends MurderMysteryEndbookEvidenceReferenceScenario {
  originalSource?: MurderMysteryEndbookEvidenceOriginalSourceView;
}

export interface MurderMysteryEndbookEvidenceQnaItemScenario {
  id: string;
  question: string;
  answer: string;
  evidenceRefs: MurderMysteryEndbookEvidenceReferenceScenario[];
}

export interface MurderMysteryEndbookEvidenceQnaScenario {
  title?: string;
  description?: string;
  items: MurderMysteryEndbookEvidenceQnaItemScenario[];
}

export interface MurderMysteryEndbookEvidenceQnaItemView
  extends Omit<MurderMysteryEndbookEvidenceQnaItemScenario, 'evidenceRefs'> {
  evidenceRefs: MurderMysteryEndbookEvidenceReferenceView[];
}

export interface MurderMysteryEndbookEvidenceQnaView
  extends Omit<MurderMysteryEndbookEvidenceQnaScenario, 'items'> {
  items: MurderMysteryEndbookEvidenceQnaItemView[];
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
  publicCovers?: MurderMysteryPublicCoverScenario[];
  parts: MurderMysteryPartScenario[];
  initialRoleCards: MurderMysteryInitialRoleCardScenario[];
  specialEvents: MurderMysterySpecialEventScenario[];
  investigations: MurderMysteryInvestigationsScenario;
  cards: MurderMysteryCardScenario[];
  finalVote: {
    question: string;
    correctRoleId: string;
    correctOptionId: string;
    options: MurderMysteryFinalVoteOptionScenario[];
  };
  endingChoices: MurderMysteryEndingChoiceScenario[];
  endbook: {
    title?: string;
    variants: MurderMysteryEndbookVariantScenario[];
    sections: MurderMysteryEndbookSectionScenario[];
    evidenceQna?: MurderMysteryEndbookEvidenceQnaScenario;
  };
}

export interface MurderMysteryPlayerData {
  statusText: MurderMysteryPlayerStatus;
}

export type MurderMysteryInvestigationUsage = Record<
  MurderMysteryInvestigationRound,
  number
>;

export interface MurderMysteryPendingInvestigation {
  requestId: string;
  playerId: string;
  targetId: string;
  round: MurderMysteryInvestigationRound;
  requestedAt: number;
}

export interface MurderMysteryInvestigationTurnState {
  round: MurderMysteryInvestigationRound | null;
  orderedPlayerIds: string[];
  currentPlayerIndex: number;
  completedPlayerIds: string[];
  turnStartedAt: number | null;
  reservationByPlayerId: Record<string, string>;
  extraInvestigationPendingPlayerId: string | null;
}

export interface MurderMysteryAnnouncement {
  id: string;
  type: 'INTRO' | 'ENDBOOK' | 'SYSTEM';
  text: string;
  at: number;
}

export interface MurderMysteryFinalVoteResult {
  voteOptionId: string | null;
  suspectPlayerId: string | null;
  matched: boolean;
  tally: Record<string, number>;
}

export interface MurderMysterySeatPosition {
  x: number;
  y: number;
}

export interface MurderMysteryRoleSelectionRoleView {
  id: string;
  displayName: string;
  publicText: string;
  portraitSrc?: string;
  portraitAlt?: string;
  assignedPlayerId: string | null;
}

export interface MurderMysteryRoleSelectionPublicCoverView {
  id: string;
  displayName: string;
  publicText: string;
  portraitSrc?: string;
  portraitAlt?: string;
  selectable: boolean;
  assignedPlayerId: string | null;
  preferredPlayerIds: string[];
}

export interface MurderMysteryRoleSelectionPlayerView {
  playerId: string;
  playerName: string;
  submitted: boolean;
}

export interface MurderMysteryRoleSelectionView {
  status: MurderMysteryRoleSelectionStatus;
  roles: MurderMysteryRoleSelectionRoleView[];
  publicCovers: MurderMysteryRoleSelectionPublicCoverView[];
  players: MurderMysteryRoleSelectionPlayerView[];
  requiredPlayerCount: number;
  submittedCount: number;
  yourPreferenceRoleIds: string[];
  yourAssignedRoleId: string | null;
  yourAssignedRoleWasRandom: boolean;
}

export interface MurderMysteryRoleReadingPlayerView {
  playerId: string;
  playerName: string;
  ready: boolean;
  readyAt: number | null;
}

export interface MurderMysteryRoleReadingView {
  readyCount: number;
  totalCount: number;
  allReady: boolean;
  yourReady: boolean;
  players: MurderMysteryRoleReadingPlayerView[];
}

export interface MurderMysteryPublicScriptView {
  stepId: string;
  label: string;
  readAloud: string;
  unlocked: boolean;
  current: boolean;
}

export interface MurderMysteryGameData {
  scenarioId: string;
  scenarioTitle: string;
  scenarioRoomDisplayName: string;
  hostParticipatesAsPlayer: boolean;
  phase: MurderMysteryPhase;
  phaseStartedAt: number | null;
  phaseDurationSec: number | null;
  roleSelectionStatus: MurderMysteryRoleSelectionStatus;
  rolePreferencesByPlayerId: Record<string, string[]>;
  roleReadingReadyByPlayerId: Record<string, number>;
  initialRoleCardsGranted: boolean;
  roleByPlayerId: Record<string, string>;
  roleDisplayNameByPlayerId: Record<string, string>;
  investigationUsedByPlayerId: Record<string, MurderMysteryInvestigationUsage>;
  investigationBackIdByTargetCardKey: Record<string, string>;
  investigationTargetCardKeyByBackId: Record<string, string>;
  investigationTurn: MurderMysteryInvestigationTurnState;
  pendingInvestigations: MurderMysteryPendingInvestigation[];
  privateCardIdsByPlayerId: Record<string, string[]>;
  revealedCardsByPlayerId: Record<string, string[]>;
  revealedCardIds: string[];
  revealedCardIdsByTargetId: Record<string, string[]>;
  revealedPartIds: string[];
  specialEventStatusById: Record<string, MurderMysterySpecialEventStatus>;
  voteByPlayerId: Record<string, string>;
  finalVoteResult: MurderMysteryFinalVoteResult | null;
  endingChoiceById: Record<string, string>;
  announcements: MurderMysteryAnnouncement[];
  appliedDynamicRuleIds: Record<string, true>;
  seatLayoutByPlayerId: Record<string, MurderMysterySeatPosition>;
}

export interface MurderMysteryRoleSheetView {
  roleId: string;
  displayName: string;
  publicText: string;
  secretText: string;
  personalGoal?: string;
  ruleText?: string;
  belongingHints?: MurderMysteryRoleBelongingHintScenario[];
  secretTextHighlights?: string[];
  portraitSrc?: string;
  portraitAlt?: string;
}

export interface MurderMysteryPublicPlayerView {
  id: string;
  name: string;
  socketId: string;
  displayName: string;
  roleId: string | null;
  roleDisplayName: string | null;
  rolePublicText: string | null;
  rolePortraitSrc: string | null;
  rolePortraitAlt: string | null;
  statusText: MurderMysteryPlayerStatus;
  heldCardBacks: MurderMysteryInvestigationBackCardView[];
  publicRevealedClues: MurderMysteryClueVaultCardView[];
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

export interface MurderMysteryInvestigationBackCardView
  extends MurderMysteryCardBackStyle {
  backId: string;
  targetId: string;
  targetLabel: string;
  extraInvestigationOnReveal: boolean;
  isReservedByMe: boolean;
  hasBeenRead: boolean;
  readCount: number;
}

export interface MurderMysteryInvestigationTargetView
  extends MurderMysteryInvestigationTargetScenario {
  totalClues: number;
  revealedClues: number;
  remainingClues: number;
  isExhausted: boolean;
  isOwnedByViewer: boolean;
  canInvestigateByViewer: boolean;
  investigationRestrictionReason?: string;
  isOwnedFallbackForViewer: boolean;
  availableBacks: MurderMysteryInvestigationBackCardView[];
}

export interface MurderMysteryInvestigationRoundView {
  round: MurderMysteryInvestigationRound;
  targets: MurderMysteryInvestigationTargetView[];
}

export interface MurderMysteryInvestigationTurnPlayerView {
  playerId: string;
  roleId: string;
  name: string;
  displayName: string;
  order: number;
  isCurrent: boolean;
  isCompleted: boolean;
  completedCount: number;
  requiredCount: number;
}

export interface MurderMysteryInvestigationTurnView {
  enabled: boolean;
  currentPlayerId: string | null;
  currentPlayerIndex: number;
  orderedPlayerIds: string[];
  completedPlayerIds: string[];
  turnStartedAt: number | null;
  nextRoundFirstPlayerId: string | null;
  players: MurderMysteryInvestigationTurnPlayerView[];
  canActNow: boolean;
  extraInvestigationPending: boolean;
  allPlayersDone: boolean;
  myReservation: MurderMysteryInvestigationBackCardView | null;
}

export interface MurderMysteryInvestigationPlayerProgressView {
  playerId: string;
  completedCount: number;
  requiredCount: number;
  remainingCount: number;
  isCurrent: boolean;
}

export interface MurderMysteryInvestigationMapHotspotView
  extends MurderMysteryInvestigationMapHotspotScenario {
  targetLabel: string;
  totalClues: number;
  remainingClues: number;
  isExhausted: boolean;
  isCurrentTurnTarget: boolean;
}

export interface MurderMysteryInvestigationMapView {
  scene: MurderMysteryInvestigationMapSceneScenario;
  hotspots: MurderMysteryInvestigationMapHotspotView[];
}

export interface MurderMysteryInvestigationView {
  round: MurderMysteryInvestigationRound | null;
  revealedCardIds: string[];
  revealedCardIdsByTargetId: Record<string, string[]>;
  layoutSections: MurderMysteryInvestigationLayoutSection[];
  used: boolean;
  usedCount: number;
  limitPerRound: number;
  mode: 'legacy' | 'map';
  rounds: MurderMysteryInvestigationRoundView[];
  turn: MurderMysteryInvestigationTurnView | null;
  playerProgress: MurderMysteryInvestigationPlayerProgressView[];
  map: MurderMysteryInvestigationMapView | null;
}

export interface MurderMysteryClueVaultCardView
  extends MurderMysteryCardScenario {
  sourceTargetIds: string[];
  sourceTargetLabels: string[];
  sourceBackLabels: string[];
  isPublic: boolean;
  canRevealPublicly: boolean;
}

export interface MurderMysteryFinalVoteView {
  question: string;
  options: MurderMysteryFinalVoteOptionScenario[];
  totalVoters: number;
  submittedVoters: number;
  yourVote: string | null;
  votes: Record<string, string>;
  result: MurderMysteryFinalVoteResult | null;
}

export interface MurderMysteryEndbookView {
  id: string;
  title: string;
  body: string;
  evidenceQna?: MurderMysteryEndbookEvidenceQnaView;
  choiceSummaries: MurderMysteryEndbookChoiceSummaryView[];
  alternateOutcomes: MurderMysteryEndbookAlternateOutcomeView[];
}

export interface MurderMysteryEndbookChoiceSummaryView {
  choiceId: string;
  choiceLabel: string;
  roleDisplayName: string;
  selectedOptionId: string;
  selectedOptionLabel: string;
}

export interface MurderMysteryEndbookAlternateOutcomeView {
  choiceId: string;
  choiceLabel: string;
  roleDisplayName: string;
  selectedOptionId: string;
  selectedOptionLabel: string;
  alternateOptionId: string;
  alternateOptionLabel: string;
  title: string;
  body: string;
}

export interface MurderMysteryEndingChoiceProgressView {
  choiceId: string;
  label: string;
  roleId: string;
  roleDisplayName: string;
  submitted: boolean;
  selectedOptionId: string | null;
}

export interface MurderMysteryEndingChoiceView {
  id: string;
  roleId: string;
  label: string;
  description: string;
  options: MurderMysteryEndingChoiceOptionScenario[];
  yourSelection: string | null;
  submitted: boolean;
  canSubmit: boolean;
}

export interface MurderMysteryEndingChoicesView {
  enabled: boolean;
  totalCount: number;
  submittedCount: number;
  allSubmitted: boolean;
  choices: MurderMysteryEndingChoiceView[];
  progress: MurderMysteryEndingChoiceProgressView[];
}

export interface MurderMysteryReportableSpecialEventView {
  id: string;
  label: string;
  description: string;
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
    investigations: MurderMysteryInvestigationsScenario;
    finalVote: MurderMysteryScenario['finalVote'];
    endingChoices: MurderMysteryScenario['endingChoices'];
    endbook: MurderMysteryScenario['endbook'];
  };
  specialEvents: MurderMysteryReportableSpecialEventView[];
  seatLayoutByPlayerId: Record<string, MurderMysterySeatPosition>;
  roleSelection: MurderMysteryRoleSelectionView;
  roleReading: MurderMysteryRoleReadingView;
  publicScripts: MurderMysteryPublicScriptView[];
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
  endingChoices: MurderMysteryEndingChoicesView;
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
  mm_mark_role_sheet_read: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_mark_phase_read: (
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
  mm_host_get_role_share_text: (
    data: { roomId: string; sessionId: string; roleId: string },
    callback: (
      response: CommonResponse & {
        title?: string;
        text?: string;
        linkPath?: string;
      }
    ) => void
  ) => void;
  mm_update_seat_position: (
    data: {
      roomId: string;
      sessionId: string;
      playerId: string;
      position: MurderMysterySeatPosition;
    },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_reset_seat_layout: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_submit_role_preferences: (
    data: { roomId: string; sessionId: string; roleIds: string[] },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_clear_role_preferences: (
    data: { roomId: string; sessionId: string },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_submit_investigation: (
    data: {
      roomId: string;
      sessionId: string;
      targetId?: string;
      backId?: string;
    },
    callback: (
      response: CommonResponse & { extraInvestigation?: boolean }
    ) => void
  ) => void;
  mm_set_investigation_reservation: (
    data: {
      roomId: string;
      sessionId: string;
      backId: string;
    },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_clear_investigation_reservation: (
    data: {
      roomId: string;
      sessionId: string;
    },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_reveal_my_clue: (
    data: {
      roomId: string;
      sessionId: string;
      cardId: string;
    },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_submit_vote: (
    data: {
      roomId: string;
      sessionId: string;
      voteOptionId?: string;
      suspectPlayerId?: string;
    },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_submit_ending_choice: (
    data: {
      roomId: string;
      sessionId: string;
      choiceId: string;
      optionId: string;
    },
    callback: (response: CommonResponse) => void
  ) => void;
  mm_report_special_event: (
    data: {
      roomId: string;
      sessionId: string;
      eventId: string;
      outcome: MurderMysterySpecialEventOutcome;
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
