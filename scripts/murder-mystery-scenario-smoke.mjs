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

const toRound = (value) => (value === 1 || value === 2 ? value : null);

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

  if (isRecord(players) && Number.isInteger(players.min) && Number.isInteger(players.max)) {
    return {
      min: players.min,
      max: players.max,
    };
  }

  return null;
};

const normalizeInvestigations = (investigations) => {
  if (!isRecord(investigations)) {
    return [];
  }

  if (Array.isArray(investigations.rounds) && investigations.rounds.length > 0) {
    return investigations.rounds.map((round) => ({
      round: round.round,
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
    }));
  }

  const round1Targets = Array.isArray(investigations.round1) ? investigations.round1 : [];
  const round2Targets = Array.isArray(investigations.round2) ? investigations.round2 : [];
  return [
    {
      round: 1,
      targets: round1Targets.map((target) => ({
        id: target.id,
        cardPool: Array.isArray(target.cardPool)
          ? target.cardPool
          : Array.isArray(target.cards)
            ? target.cards
            : [],
      })),
    },
    {
      round: 2,
      targets: round2Targets.map((target) => ({
        id: target.id,
        cardPool: Array.isArray(target.cardPool)
          ? target.cardPool
          : Array.isArray(target.cards)
            ? target.cards
            : [],
      })),
    },
  ];
};

if (!fs.existsSync(registryPath)) {
  fail(`registry not found: ${registryPath}`);
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
if (!Array.isArray(registry.scenarios) || registry.scenarios.length === 0) {
  fail('registry.scenarios must be a non-empty array');
}

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
  if (!Array.isArray(scenario.parts) || scenario.parts.length !== 5) {
    fail(`${entry.file}: parts must contain exactly 5 entries`);
  }
  if (!Array.isArray(scenario.roles) || scenario.roles.length === 0) {
    fail(`${entry.file}: roles must be non-empty`);
  }
  if (!Array.isArray(scenario.cards) || scenario.cards.length === 0) {
    fail(`${entry.file}: cards must be non-empty`);
  }

  const rounds = normalizeInvestigations(scenario.investigations);
  const roundSet = new Set(rounds.map((round) => toRound(round.round)));
  if (!roundSet.has(1) || !roundSet.has(2)) {
    fail(`${entry.file}: investigation rounds must include 1 and 2`);
  }

  const cardIds = new Set(scenario.cards.map((card) => card.id));
  for (const round of rounds) {
    for (const target of round.targets ?? []) {
      for (const cardId of target.cardPool ?? []) {
        if (!cardIds.has(cardId)) {
          fail(`${entry.file}: unknown card in cardPool (${cardId})`);
        }
      }
    }
  }

  const hasGuideRevealRule = scenario.roles.some((role) =>
    (role.dynamicDisplayNameRules ?? []).some((rule) => {
      if (rule.trigger?.type === 'cardRevealed' && rule.trigger?.cardId === 'card_dog_tag') {
        return true;
      }
      return rule.when?.onCardRevealed === 'card_dog_tag';
    })
  );
  if (!hasGuideRevealRule) {
    fail(`${entry.file}: missing reusable guide reveal trigger(card_dog_tag)`);
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
}

if (!registry.defaultScenarioId) {
  fail('defaultScenarioId is required');
}

console.log('[murder-mystery-smoke] all checks passed');
