import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const root = process.cwd();
const registryPath = path.join(root, 'data', 'murder-mystery', 'registry.json');
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
  value === 'investigate' ||
  value === 'discuss' ||
  value === 'final_vote' ||
  value === 'endbook'
    ? value
    : null;

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
    }
  }

  for (const card of scenario.cards) {
    if (card.backId) {
      if (backIds.has(card.backId)) {
        fail(`${entry.file}: duplicated card backId (${card.backId})`);
      }
      backIds.add(card.backId);
    }
  }

  const flowSteps = normalizeFlowSteps(scenario, roundValues);
  const flowKinds = new Set();
  const investigateRounds = new Set();

  for (const step of flowSteps) {
    const kind = toStepKind(step.kind);
    if (!step.id || !kind) {
      fail(`${entry.file}: flow.steps id/kind is invalid`);
    }
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
  if (!scenario.endbook?.common || !scenario.endbook?.closingLine) {
    fail(`${entry.file}: endbook.common/closingLine are required`);
  }

  const roleIds = new Set(scenario.roles.map((role) => role.id));
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
