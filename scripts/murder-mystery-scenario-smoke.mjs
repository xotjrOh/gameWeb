import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = path.join(root, 'data', 'murder-mystery', 'registry.json');
const scenarioDir = path.join(root, 'data', 'murder-mystery', 'scenarios');

const fail = (message) => {
  console.error(`[murder-mystery-smoke] ${message}`);
  process.exit(1);
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

  const scenario = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (scenario.id !== entry.id) {
    fail(`${entry.file}: id mismatch (${scenario.id} !== ${entry.id})`);
  }
  if (!scenario.roomDisplayName) {
    fail(`${entry.file}: roomDisplayName is required`);
  }
  if (!scenario.players || !Number.isInteger(scenario.players.min)) {
    fail(`${entry.file}: players.min must be integer`);
  }
  if (!scenario.players || !Number.isInteger(scenario.players.max)) {
    fail(`${entry.file}: players.max must be integer`);
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

  const rounds = new Set(
    (scenario.investigations?.rounds ?? []).map((round) => round.round)
  );
  if (!rounds.has(1) || !rounds.has(2)) {
    fail(`${entry.file}: investigation rounds must include 1 and 2`);
  }

  const cardIds = new Set(scenario.cards.map((card) => card.id));
  for (const round of scenario.investigations?.rounds ?? []) {
    for (const target of round.targets ?? []) {
      for (const cardId of target.cardPool ?? []) {
        if (!cardIds.has(cardId)) {
          fail(`${entry.file}: unknown card in cardPool (${cardId})`);
        }
      }
    }
  }

  const hasGuideRevealRule = scenario.roles.some((role) =>
    (role.dynamicDisplayNameRules ?? []).some(
      (rule) =>
        rule.trigger?.type === 'cardRevealed' &&
        rule.trigger?.cardId === 'card_dog_tag'
    )
  );
  if (!hasGuideRevealRule) {
    fail(`${entry.file}: missing reusable guide reveal trigger(card_dog_tag)`);
  }

  if (!scenario.finalVote?.question || !scenario.finalVote?.correctRoleId) {
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
