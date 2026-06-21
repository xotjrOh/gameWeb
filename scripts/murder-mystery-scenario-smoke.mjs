import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const root = process.cwd();
const registryPath = path.join(root, 'data', 'murder-mystery', 'registry.json');
const dataDir = path.join(root, 'data', 'murder-mystery');
const scenarioDir = path.join(root, 'data', 'murder-mystery', 'scenarios');

const fail = (message) => {
  console.error(`[murder-mystery-smoke] ${message}`);
  process.exit(1);
};

const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toRound = (value) =>
  Number.isInteger(value) && Number(value) >= 1 ? Number(value) : null;

const toFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value) : null;

const toStepKind = (value) =>
  value === 'intro' ||
  value === 'role_selection' ||
  value === 'role_reading' ||
  value === 'investigate' ||
  value === 'discuss' ||
  value === 'presentation' ||
  value === 'final_vote' ||
  value === 'ending_choice' ||
  value === 'endbook'
    ? value
    : null;

const assertPublicAssetExists = (assetPath, context) => {
  if (typeof assetPath !== 'string' || assetPath.length === 0) {
    return;
  }
  if (!assetPath.startsWith('/')) {
    return;
  }

  const filePath = path.join(root, 'public', assetPath.slice(1));
  if (!fs.existsSync(filePath)) {
    fail(`${context}: missing public asset (${assetPath})`);
  }
};

const readScenarioFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    return JSON.parse(raw);
  }
  if (ext === '.yaml' || ext === '.yml') {
    return YAML.parse(raw);
  }
  fail(`unsupported scenario file extension: ${ext}`);
};

const normalizePlayers = (players) => {
  if (Number.isInteger(players)) {
    return {
      min: players,
      max: players,
    };
  }

  if (
    isRecord(players) &&
    Number.isInteger(players.min) &&
    Number.isInteger(players.max)
  ) {
    return {
      min: players.min,
      max: players.max,
    };
  }

  return null;
};

const normalizeInvestigations = (investigations) => {
  if (!isRecord(investigations)) {
    return {
      rounds: [],
      deliveryMode: 'auto',
      turnOrder: null,
      map: null,
    };
  }

  const rounds =
    Array.isArray(investigations.rounds) && investigations.rounds.length > 0
      ? investigations.rounds
          .map((round) => ({
            round: toRound(round.round),
            targets: Array.isArray(round.targets)
              ? round.targets.map((target) => ({
                  id: target.id,
                  cardBack: target.cardBack,
                  ownerRoleId:
                    typeof target.ownerRoleId === 'string'
                      ? target.ownerRoleId
                      : null,
                  cardPool: Array.isArray(target.cardPool)
                    ? target.cardPool
                    : Array.isArray(target.cards)
                      ? target.cards
                      : [],
                }))
              : [],
          }))
          .filter((round) => round.round !== null)
      : Object.entries(investigations)
          .filter(
            ([key, value]) => /^round\d+$/.test(key) && Array.isArray(value)
          )
          .map(([key, value]) => ({
            round: toRound(Number(key.replace('round', ''))),
            targets: value.map((target) => ({
              id: target.id,
              cardBack: target.cardBack,
              ownerRoleId:
                typeof target.ownerRoleId === 'string'
                  ? target.ownerRoleId
                  : null,
              cardPool: Array.isArray(target.cardPool)
                ? target.cardPool
                : Array.isArray(target.cards)
                  ? target.cards
                  : [],
            })),
          }))
          .filter((round) => round.round !== null)
          .sort((a, b) => a.round - b.round);

  const map =
    isRecord(investigations.layout) && isRecord(investigations.layout.map)
      ? {
          scene: investigations.layout.map.scene,
          hotspots: Array.isArray(investigations.layout.map.hotspots)
            ? investigations.layout.map.hotspots
            : [],
        }
      : null;

  const turnOrder = isRecord(investigations.turnOrder)
    ? {
        roleIds: Array.isArray(investigations.turnOrder.roleIds)
          ? investigations.turnOrder.roleIds.filter(
              (roleId) => typeof roleId === 'string'
            )
          : [],
      }
    : null;

  return {
    rounds,
    deliveryMode: investigations.deliveryMode === 'manual' ? 'manual' : 'auto',
    turnOrder,
    map,
  };
};

const normalizeFlowSteps = (scenario, rounds) => {
  if (
    isRecord(scenario.flow) &&
    Array.isArray(scenario.flow.steps) &&
    scenario.flow.steps.length > 0
  ) {
    return scenario.flow.steps;
  }

  return [
    { id: 'INTRO', kind: 'intro' },
    ...rounds.flatMap((round) => [
      { id: `ROUND${round}_INVESTIGATE`, kind: 'investigate', round },
      { id: `ROUND${round}_DISCUSS`, kind: 'discuss', round },
    ]),
    { id: 'FINAL_VOTE', kind: 'final_vote' },
    { id: 'ENDBOOK', kind: 'endbook' },
  ];
};

if (!fs.existsSync(registryPath)) {
  fail(`registry not found: ${registryPath}`);
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
if (!Array.isArray(registry.scenarios) || registry.scenarios.length === 0) {
  fail('registry.scenarios must be a non-empty array');
}

let validCount = 0;

for (const entry of registry.scenarios) {
  const filePath = path.join(scenarioDir, entry.file);
  if (!fs.existsSync(filePath)) {
    fail(`scenario file missing: ${entry.file}`);
  }

  const scenario = readScenarioFile(filePath);
  const players = normalizePlayers(scenario.players);
  if (!scenario.id || !scenario.roomDisplayName) {
    fail(`${entry.file}: id/roomDisplayName are required`);
  }
  if (!players) {
    fail(`${entry.file}: players must be integer or {min,max}`);
  }
  if (!scenario.intro?.readAloud) {
    fail(`${entry.file}: intro.readAloud is required`);
  }
  if (!Array.isArray(scenario.parts) || scenario.parts.length === 0) {
    fail(`${entry.file}: parts must be non-empty`);
  }
  if (!Array.isArray(scenario.roles) || scenario.roles.length === 0) {
    fail(`${entry.file}: roles must be non-empty`);
  }
  for (const role of scenario.roles) {
    if (!role.id || !role.displayName || !role.publicText) {
      fail(`${entry.file}: role fields are required (${role.id ?? 'unknown'})`);
    }
    assertPublicAssetExists(
      role.portraitSrc,
      `${entry.file}: role(${role.id}).portraitSrc`
    );
    let secretText = '';
    if (role.secretTextPath) {
      if (path.isAbsolute(role.secretTextPath)) {
        fail(`${entry.file}: role(${role.id}) secretTextPath must be relative`);
      }
      const secretTextPath = path.resolve(dataDir, role.secretTextPath);
      if (!secretTextPath.startsWith(`${dataDir}${path.sep}`)) {
        fail(`${entry.file}: role(${role.id}) secretTextPath escapes data dir`);
      }
      if (!fs.existsSync(secretTextPath)) {
        fail(`${entry.file}: role(${role.id}) secretTextPath is missing`);
      }
      secretText = fs.readFileSync(secretTextPath, 'utf8');
      if (!secretText.trim()) {
        fail(`${entry.file}: role(${role.id}) secretTextPath is empty`);
      }
    } else if (!role.secretText) {
      fail(`${entry.file}: role(${role.id}) secretText is required`);
    } else {
      secretText = role.secretText;
    }
    if (secretText.includes('**')) {
      fail(
        `${entry.file}: role(${role.id}) secretText must not contain markdown bold markers`
      );
    }
    if (role.secretTextHighlights !== undefined) {
      if (!Array.isArray(role.secretTextHighlights)) {
        fail(
          `${entry.file}: role(${role.id}) secretTextHighlights must be an array`
        );
      }
      for (const [
        highlightIndex,
        highlight,
      ] of role.secretTextHighlights.entries()) {
        if (typeof highlight !== 'string' || !highlight.trim()) {
          fail(
            `${entry.file}: role(${role.id}) secretTextHighlights[${highlightIndex}] must be a non-empty string`
          );
        }
        if (!secretText.includes(highlight)) {
          fail(
            `${entry.file}: role(${role.id}) secretTextHighlights[${highlightIndex}] is not found in secretText`
          );
        }
      }
    }
  }
  if (!Array.isArray(scenario.cards) || scenario.cards.length === 0) {
    fail(`${entry.file}: cards must be non-empty`);
  }

  const investigations = normalizeInvestigations(scenario.investigations);
  const rounds = investigations.rounds;
  if (rounds.length === 0) {
    fail(`${entry.file}: investigations must include at least one round`);
  }
  const roundValues = rounds.map((round) => round.round);

  const cardIds = new Set(scenario.cards.map((card) => card.id));
  const backIds = new Set();
  for (const round of rounds) {
    if (!Array.isArray(round.targets) || round.targets.length === 0) {
      fail(`${entry.file}: round ${round.round} must include targets`);
    }

    for (const target of round.targets) {
      if (!target.id) {
        fail(`${entry.file}: target.id is required`);
      }
      if (!Array.isArray(target.cardPool) || target.cardPool.length === 0) {
        fail(`${entry.file}: target(${target.id}) cardPool/cards is required`);
      }
      for (const cardId of target.cardPool) {
        if (!cardIds.has(cardId)) {
          fail(`${entry.file}: unknown card in cardPool (${cardId})`);
        }
      }
      assertPublicAssetExists(
        target.cardBack?.imageSrc,
        `${entry.file}: target(${target.id}).cardBack.imageSrc`
      );
    }
  }

  for (const card of scenario.cards) {
    if (card.backId) {
      if (backIds.has(card.backId)) {
        fail(`${entry.file}: duplicated card backId (${card.backId})`);
      }
      backIds.add(card.backId);
    }
    if (
      card.extraInvestigationOnReveal !== undefined &&
      typeof card.extraInvestigationOnReveal !== 'boolean'
    ) {
      fail(
        `${entry.file}: card(${card.id}) extraInvestigationOnReveal must be boolean`
      );
    }
    assertPublicAssetExists(
      card.imageSrc,
      `${entry.file}: card(${card.id}).imageSrc`
    );
    assertPublicAssetExists(
      card.back?.imageSrc,
      `${entry.file}: card(${card.id}).back.imageSrc`
    );
  }

  const flowSteps = normalizeFlowSteps(scenario, roundValues);
  const flowKinds = new Set();
  const stepIds = new Set();
  const investigateRounds = new Set();

  for (const step of flowSteps) {
    const kind = toStepKind(step.kind);
    if (!step.id || !kind) {
      fail(`${entry.file}: flow.steps id/kind is invalid`);
    }
    if (stepIds.has(step.id)) {
      fail(`${entry.file}: duplicated flow step id (${step.id})`);
    }
    stepIds.add(step.id);
    flowKinds.add(kind);

    if (kind === 'investigate' || kind === 'discuss') {
      const round = toRound(step.round);
      if (!round) {
        fail(`${entry.file}: flow step(${step.id}) round is invalid`);
      }
      if (!roundValues.includes(round)) {
        fail(
          `${entry.file}: flow step(${step.id}) references missing round ${round}`
        );
      }
      if (kind === 'investigate') {
        investigateRounds.add(round);
      }
    }

    if (step.durationSec !== undefined) {
      if (!Number.isInteger(step.durationSec) || step.durationSec <= 0) {
        fail(
          `${entry.file}: flow step(${step.id}) durationSec must be positive integer`
        );
      }
    }
  }

  if (
    !flowKinds.has('intro') ||
    !flowKinds.has('final_vote') ||
    !flowKinds.has('endbook')
  ) {
    fail(`${entry.file}: flow must include intro/final_vote/endbook`);
  }

  for (const round of roundValues) {
    if (!investigateRounds.has(round)) {
      fail(
        `${entry.file}: round ${round} is unreachable from flow(investigate)`
      );
    }
  }

  const correctRoleId =
    scenario.finalVote?.correctRoleId ??
    scenario.roles.find((role) => role.isKiller === true)?.id;
  if (!scenario.finalVote?.question || !correctRoleId) {
    fail(`${entry.file}: finalVote.question/correctRoleId are required`);
  }
  const endbookVariants = Array.isArray(scenario.endbook?.variants)
    ? scenario.endbook.variants
    : [];
  const endbookSections = Array.isArray(scenario.endbook?.sections)
    ? scenario.endbook.sections
    : [];
  if (endbookVariants.length === 0 && endbookSections.length === 0) {
    fail(
      `${entry.file}: endbook.variants or endbook.sections must be non-empty`
    );
  }

  const roleIds = new Set(scenario.roles.map((role) => role.id));
  for (const round of rounds) {
    for (const target of round.targets) {
      if (target.ownerRoleId && !roleIds.has(target.ownerRoleId)) {
        fail(
          `${entry.file}: target(${target.id}) ownerRoleId references unknown role (${target.ownerRoleId})`
        );
      }
    }
  }
  const publicCoverIds = new Set();
  if (Array.isArray(scenario.publicCovers)) {
    for (const [index, cover] of scenario.publicCovers.entries()) {
      if (!cover.id || !cover.displayName || !cover.publicText) {
        fail(
          `${entry.file}: publicCovers[${index}] id/displayName/publicText are required`
        );
      }
      if (roleIds.has(cover.id)) {
        fail(`${entry.file}: publicCover(${cover.id}) duplicates a role id`);
      }
      if (publicCoverIds.has(cover.id)) {
        fail(`${entry.file}: duplicated publicCover id (${cover.id})`);
      }
      assertPublicAssetExists(
        cover.portraitSrc,
        `${entry.file}: publicCover(${cover.id}).portraitSrc`
      );
      publicCoverIds.add(cover.id);
    }
  }
  if (!roleIds.has(correctRoleId)) {
    fail(
      `${entry.file}: finalVote.correctRoleId is unknown (${correctRoleId})`
    );
  }
  const finalVoteOptionIds = new Set();
  if (Array.isArray(scenario.finalVote.options)) {
    for (const [index, option] of scenario.finalVote.options.entries()) {
      if (!option.id || !option.label || !option.optionType) {
        fail(`${entry.file}: finalVote.options[${index}] fields are required`);
      }
      if (finalVoteOptionIds.has(option.id)) {
        fail(`${entry.file}: duplicated finalVote option id (${option.id})`);
      }
      finalVoteOptionIds.add(option.id);
      if (!['role', 'npc', 'none'].includes(option.optionType)) {
        fail(`${entry.file}: finalVote option(${option.id}) type is invalid`);
      }
      if (option.optionType === 'role' && !roleIds.has(option.roleId)) {
        fail(
          `${entry.file}: finalVote option(${option.id}) references unknown role (${option.roleId})`
        );
      }
    }
    const correctOptionId =
      scenario.finalVote.correctOptionId ??
      scenario.finalVote.options.find(
        (option) =>
          option.optionType === 'role' && option.roleId === correctRoleId
      )?.id;
    if (!correctOptionId || !finalVoteOptionIds.has(correctOptionId)) {
      fail(
        `${entry.file}: finalVote.correctOptionId is unknown (${correctOptionId})`
      );
    }
  }

  const endingChoiceOptionIds = new Map();
  if (Array.isArray(scenario.endingChoices)) {
    if (scenario.endingChoices.length > 0 && !flowKinds.has('ending_choice')) {
      fail(
        `${entry.file}: flow requires ending_choice when endingChoices exist`
      );
    }
    const endingChoiceIds = new Set();
    for (const choice of scenario.endingChoices) {
      if (
        !choice.id ||
        !choice.roleId ||
        !choice.label ||
        !choice.description
      ) {
        fail(`${entry.file}: endingChoice fields are required`);
      }
      if (endingChoiceIds.has(choice.id)) {
        fail(`${entry.file}: duplicated endingChoice id (${choice.id})`);
      }
      endingChoiceIds.add(choice.id);
      if (!roleIds.has(choice.roleId)) {
        fail(
          `${entry.file}: endingChoice(${choice.id}) references unknown role (${choice.roleId})`
        );
      }
      const opensWhenVoteOptionId = choice.opensWhen?.finalVoteOptionId;
      if (
        typeof opensWhenVoteOptionId === 'string' &&
        !finalVoteOptionIds.has(opensWhenVoteOptionId)
      ) {
        fail(
          `${entry.file}: endingChoice(${choice.id}) opensWhen references unknown finalVoteOptionId (${opensWhenVoteOptionId})`
        );
      }
      if (!Array.isArray(choice.options) || choice.options.length === 0) {
        fail(`${entry.file}: endingChoice(${choice.id}) options are required`);
      }
      const optionIds = new Set();
      for (const option of choice.options) {
        if (!option.id || !option.label) {
          fail(
            `${entry.file}: endingChoice(${choice.id}) option fields are required`
          );
        }
        if (optionIds.has(option.id)) {
          fail(
            `${entry.file}: duplicated endingChoice option id (${choice.id}.${option.id})`
          );
        }
        optionIds.add(option.id);
      }
      endingChoiceOptionIds.set(choice.id, optionIds);
    }
  }

  const validateEndbookCondition = (context, condition) => {
    const finalVoteOptionId = condition?.finalVoteOptionId;
    if (
      typeof finalVoteOptionId === 'string' &&
      !finalVoteOptionIds.has(finalVoteOptionId)
    ) {
      fail(
        `${entry.file}: ${context} references unknown finalVoteOptionId (${finalVoteOptionId})`
      );
    }
    if (condition?.choices) {
      for (const [choiceId, optionId] of Object.entries(condition.choices)) {
        const optionIds = endingChoiceOptionIds.get(choiceId);
        if (!optionIds) {
          fail(
            `${entry.file}: ${context} references unknown endingChoice (${choiceId})`
          );
        }
        if (!optionIds.has(optionId)) {
          fail(
            `${entry.file}: ${context} references unknown endingChoice option (${choiceId}.${optionId})`
          );
        }
      }
    }
  };

  const endbookVariantIds = new Set();
  for (const variant of endbookVariants) {
    if (!variant.id || !variant.title || !variant.body) {
      fail(`${entry.file}: endbook variant fields are required`);
    }
    if (endbookVariantIds.has(variant.id)) {
      fail(`${entry.file}: duplicated endbook variant id (${variant.id})`);
    }
    endbookVariantIds.add(variant.id);
    validateEndbookCondition(`endbook variant(${variant.id})`, variant.when);
  }

  const endbookSectionIds = new Set();
  for (const section of endbookSections) {
    if (!section.id || !section.body) {
      fail(`${entry.file}: endbook section fields are required`);
    }
    if (endbookSectionIds.has(section.id)) {
      fail(`${entry.file}: duplicated endbook section id (${section.id})`);
    }
    endbookSectionIds.add(section.id);
    validateEndbookCondition(`endbook section(${section.id})`, section.when);
  }

  const evidenceQnaItems = Array.isArray(scenario.endbook?.evidenceQna?.items)
    ? scenario.endbook.evidenceQna.items
    : [];
  const evidenceQnaIds = new Set();
  for (const item of evidenceQnaItems) {
    if (!item.id || !item.question || !item.answer) {
      fail(`${entry.file}: endbook evidenceQna item fields are required`);
    }
    if (evidenceQnaIds.has(item.id)) {
      fail(
        `${entry.file}: duplicated endbook evidenceQna item id (${item.id})`
      );
    }
    evidenceQnaIds.add(item.id);
    if (!Array.isArray(item.evidenceRefs) || item.evidenceRefs.length === 0) {
      fail(
        `${entry.file}: endbook evidenceQna item(${item.id}) evidenceRefs are required`
      );
    }

    const evidenceRefIds = new Set();
    for (const ref of item.evidenceRefs) {
      if (
        !ref.id ||
        !ref.sourceType ||
        !ref.label ||
        !ref.sourceName ||
        !ref.excerpt ||
        !ref.inference
      ) {
        fail(
          `${entry.file}: endbook evidenceQna ref(${item.id}) fields are required`
        );
      }
      if (evidenceRefIds.has(ref.id)) {
        fail(
          `${entry.file}: duplicated endbook evidenceQna ref id (${item.id}.${ref.id})`
        );
      }
      evidenceRefIds.add(ref.id);

      if (ref.sourceType === 'investigation_card') {
        if (!ref.cardId || !cardIds.has(ref.cardId)) {
          fail(
            `${entry.file}: endbook evidenceQna ref(${item.id}.${ref.id}) references unknown card (${ref.cardId})`
          );
        }
      } else if (ref.sourceType === 'role_sheet') {
        if (
          !ref.roleId ||
          (!roleIds.has(ref.roleId) && !publicCoverIds.has(ref.roleId))
        ) {
          fail(
            `${entry.file}: endbook evidenceQna ref(${item.id}.${ref.id}) references unknown role/publicCover (${ref.roleId})`
          );
        }
      } else if (ref.sourceType === 'public_script') {
        if (!ref.stepId || !stepIds.has(ref.stepId)) {
          fail(
            `${entry.file}: endbook evidenceQna ref(${item.id}.${ref.id}) references unknown flow step (${ref.stepId})`
          );
        }
      } else {
        fail(
          `${entry.file}: endbook evidenceQna ref(${item.id}.${ref.id}) sourceType is invalid`
        );
      }
    }
  }

  if (Array.isArray(scenario.initialRoleCards)) {
    for (const [index, initialCard] of scenario.initialRoleCards.entries()) {
      if (!roleIds.has(initialCard.roleId)) {
        fail(
          `${entry.file}: initialRoleCards[${index}] references unknown role (${initialCard.roleId})`
        );
      }
      if (!cardIds.has(initialCard.cardId)) {
        fail(
          `${entry.file}: initialRoleCards[${index}] references unknown card (${initialCard.cardId})`
        );
      }
    }
  }

  if (Array.isArray(scenario.specialEvents)) {
    const specialEventIds = new Set();
    for (const event of scenario.specialEvents) {
      if (!event.id) {
        fail(`${entry.file}: specialEvent.id is required`);
      }
      if (specialEventIds.has(event.id)) {
        fail(`${entry.file}: duplicated specialEvent id (${event.id})`);
      }
      specialEventIds.add(event.id);
      if (!cardIds.has(event.revealCardId)) {
        fail(
          `${entry.file}: specialEvent(${event.id}) references unknown reveal card (${event.revealCardId})`
        );
      }
      if (
        !Array.isArray(event.reporterRoleIds) ||
        event.reporterRoleIds.length === 0
      ) {
        fail(
          `${entry.file}: specialEvent(${event.id}) reporterRoleIds is required`
        );
      }
      for (const roleId of event.reporterRoleIds) {
        if (!roleIds.has(roleId)) {
          fail(
            `${entry.file}: specialEvent(${event.id}) references unknown reporter role (${roleId})`
          );
        }
      }
    }
  }

  if (investigations.turnOrder) {
    const orderedRoleIds = new Set();
    for (const roleId of investigations.turnOrder.roleIds) {
      if (!roleIds.has(roleId)) {
        fail(`${entry.file}: turnOrder references unknown roleId (${roleId})`);
      }
      if (orderedRoleIds.has(roleId)) {
        fail(`${entry.file}: duplicated turnOrder roleId (${roleId})`);
      }
      orderedRoleIds.add(roleId);
    }
    if (orderedRoleIds.size !== scenario.roles.length) {
      fail(
        `${entry.file}: turnOrder.roleIds must include every scenario role exactly once`
      );
    }
  }

  if (investigations.map) {
    if (investigations.deliveryMode !== 'auto') {
      fail(`${entry.file}: map investigations require deliveryMode:auto`);
    }
    if (!investigations.turnOrder?.roleIds?.length) {
      fail(`${entry.file}: map investigations require turnOrder.roleIds`);
    }
    const scene = investigations.map.scene;
    if (
      !Number.isInteger(scene?.width) ||
      scene.width <= 0 ||
      !Number.isInteger(scene?.height) ||
      scene.height <= 0
    ) {
      fail(`${entry.file}: map scene width/height must be positive integers`);
    }
    assertPublicAssetExists(
      scene?.imageSrc,
      `${entry.file}: investigations.layout.map.scene.imageSrc`
    );
    if (
      !Array.isArray(investigations.map.hotspots) ||
      investigations.map.hotspots.length === 0
    ) {
      fail(`${entry.file}: map hotspots must be non-empty`);
    }
    const hotspotIds = new Set();
    for (const hotspot of investigations.map.hotspots) {
      if (hotspotIds.has(hotspot.id)) {
        fail(`${entry.file}: duplicated map hotspot id (${hotspot.id})`);
      }
      hotspotIds.add(hotspot.id);
      const targetExists = rounds.some((round) =>
        round.targets.some((target) => target.id === hotspot.targetId)
      );
      if (!targetExists) {
        fail(
          `${entry.file}: map hotspot(${hotspot.id}) references unknown targetId (${hotspot.targetId})`
        );
      }
      const xPct = toFiniteNumber(hotspot.xPct);
      const yPct = toFiniteNumber(hotspot.yPct);
      const widthPct = toFiniteNumber(hotspot.widthPct);
      const heightPct = toFiniteNumber(hotspot.heightPct);
      if (
        xPct === null ||
        yPct === null ||
        widthPct === null ||
        heightPct === null
      ) {
        fail(
          `${entry.file}: map hotspot(${hotspot.id}) percent fields must be numbers`
        );
      }
      if (
        xPct < 0 ||
        xPct > 100 ||
        yPct < 0 ||
        yPct > 100 ||
        widthPct <= 0 ||
        widthPct > 100 ||
        heightPct <= 0 ||
        heightPct > 100 ||
        xPct + widthPct > 100 ||
        yPct + heightPct > 100
      ) {
        fail(
          `${entry.file}: map hotspot(${hotspot.id}) percent fields are out of range`
        );
      }
    }

    for (const round of rounds) {
      for (const target of round.targets) {
        for (const cardId of target.cardPool) {
          const card = scenario.cards.find((entry) => entry.id === cardId);
          if (!card?.backId) {
            fail(
              `${entry.file}: map target(${target.id}) card(${cardId}) requires backId`
            );
          }
        }
      }
    }
  }

  validCount += 1;
}

if (!registry.defaultScenarioId) {
  fail('defaultScenarioId is required');
}

console.log(
  `[murder-mystery-smoke] all checks passed (${validCount} scenario(s))`
);
