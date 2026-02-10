import fs from 'fs';
import path from 'path';
import {
  MurderMysteryScenario,
  MurderMysteryScenarioCatalogItem,
} from '@/types/murderMystery';

interface ScenarioRegistryEntry {
  id: string;
  file: string;
}

interface ScenarioRegistry {
  defaultScenarioId?: string;
  scenarios: ScenarioRegistryEntry[];
}

interface ScenarioStore {
  defaultScenarioId: string;
  scenarioById: Record<string, MurderMysteryScenario>;
  catalog: MurderMysteryScenarioCatalogItem[];
  loadedAt: number;
}

const CACHE_TTL_MS = process.env.NODE_ENV === 'development' ? 1000 : 30000;
const BASE_DIR = path.join(process.cwd(), 'data', 'murder-mystery');
const SCENARIO_DIR = path.join(BASE_DIR, 'scenarios');
const REGISTRY_FILE = path.join(BASE_DIR, 'registry.json');

let cache: ScenarioStore | null = null;

const cloneScenario = (
  scenario: MurderMysteryScenario
): MurderMysteryScenario =>
  typeof structuredClone === 'function'
    ? structuredClone(scenario)
    : JSON.parse(JSON.stringify(scenario));

const assertCondition = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(`[murder_mystery][scenario] ${message}`);
  }
};

const readJsonFile = <T>(filePath: string): T => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
};

const validateScenarioSchema = (
  scenario: MurderMysteryScenario,
  fileName: string
) => {
  assertCondition(scenario.id, `${fileName}: id is required`);
  assertCondition(scenario.title, `${fileName}: title is required`);
  assertCondition(
    scenario.roomDisplayName,
    `${fileName}: roomDisplayName is required`
  );
  assertCondition(
    Number.isInteger(scenario.players?.min),
    `${fileName}: players.min must be integer`
  );
  assertCondition(
    Number.isInteger(scenario.players?.max),
    `${fileName}: players.max must be integer`
  );
  assertCondition(
    scenario.players.min <= scenario.players.max,
    `${fileName}: players.min must be <= players.max`
  );
  assertCondition(
    scenario.intro?.readAloud,
    `${fileName}: intro.readAloud is required`
  );
  assertCondition(
    Array.isArray(scenario.roles) && scenario.roles.length > 0,
    `${fileName}: roles must be non-empty`
  );
  assertCondition(
    Array.isArray(scenario.parts) && scenario.parts.length > 0,
    `${fileName}: parts must be non-empty`
  );
  assertCondition(
    Array.isArray(scenario.cards) && scenario.cards.length > 0,
    `${fileName}: cards must be non-empty`
  );
  assertCondition(
    Array.isArray(scenario.investigations?.rounds),
    `${fileName}: investigations.rounds is required`
  );
  assertCondition(
    scenario.finalVote?.question,
    `${fileName}: finalVote.question is required`
  );
  assertCondition(
    scenario.finalVote?.correctRoleId,
    `${fileName}: finalVote.correctRoleId is required`
  );
  assertCondition(
    scenario.endbook?.common &&
      scenario.endbook?.variantMatched &&
      scenario.endbook?.variantNotMatched &&
      scenario.endbook?.closingLine,
    `${fileName}: endbook fields are required`
  );

  const roleIds = new Set<string>();
  scenario.roles.forEach((role) => {
    assertCondition(role.id, `${fileName}: role.id is required`);
    assertCondition(
      !roleIds.has(role.id),
      `${fileName}: duplicated role id (${role.id})`
    );
    roleIds.add(role.id);
    assertCondition(
      role.displayName && role.publicText && role.secretText,
      `${fileName}: role fields must be complete (${role.id})`
    );
  });

  const partIds = new Set<string>();
  scenario.parts.forEach((part) => {
    assertCondition(part.id, `${fileName}: part.id is required`);
    assertCondition(
      !partIds.has(part.id),
      `${fileName}: duplicated part id (${part.id})`
    );
    partIds.add(part.id);
  });

  const cardIds = new Set<string>();
  scenario.cards.forEach((card) => {
    assertCondition(card.id, `${fileName}: card.id is required`);
    assertCondition(
      !cardIds.has(card.id),
      `${fileName}: duplicated card id (${card.id})`
    );
    cardIds.add(card.id);

    card.effects?.forEach((effect) => {
      if (effect.type === 'addPart') {
        assertCondition(
          partIds.has(effect.partId),
          `${fileName}: addPart references unknown part (${effect.partId})`
        );
      }
      if (effect.type === 'revealRoleName') {
        assertCondition(
          roleIds.has(effect.roleId),
          `${fileName}: revealRoleName references unknown role (${effect.roleId})`
        );
        assertCondition(
          effect.newDisplayName,
          `${fileName}: revealRoleName.newDisplayName is required`
        );
      }
    });
  });

  const rounds = scenario.investigations.rounds;
  const roundSet = new Set(rounds.map((round) => round.round));
  assertCondition(
    roundSet.has(1),
    `${fileName}: investigation round 1 required`
  );
  assertCondition(
    roundSet.has(2),
    `${fileName}: investigation round 2 required`
  );

  rounds.forEach((roundConfig) => {
    assertCondition(
      Array.isArray(roundConfig.targets) && roundConfig.targets.length > 0,
      `${fileName}: round ${roundConfig.round} must have targets`
    );
    roundConfig.targets.forEach((target) => {
      assertCondition(target.id, `${fileName}: target.id is required`);
      assertCondition(
        Array.isArray(target.cardPool) && target.cardPool.length > 0,
        `${fileName}: target (${target.id}) cardPool is required`
      );
      target.cardPool.forEach((cardId) => {
        assertCondition(
          cardIds.has(cardId),
          `${fileName}: target (${target.id}) references unknown card (${cardId})`
        );
      });
    });
  });

  assertCondition(
    roleIds.has(scenario.finalVote.correctRoleId),
    `${fileName}: finalVote.correctRoleId is unknown (${scenario.finalVote.correctRoleId})`
  );

  scenario.roles.forEach((role) => {
    role.dynamicDisplayNameRules?.forEach((rule) => {
      assertCondition(
        rule.trigger.type === 'cardRevealed',
        `${fileName}: only cardRevealed trigger is supported`
      );
      assertCondition(
        cardIds.has(rule.trigger.cardId),
        `${fileName}: dynamic rule references unknown card (${rule.trigger.cardId})`
      );
      if (rule.trigger.round) {
        assertCondition(
          rule.trigger.round === 1 || rule.trigger.round === 2,
          `${fileName}: dynamic rule round must be 1 or 2`
        );
      }
      assertCondition(
        rule.newDisplayName,
        `${fileName}: dynamic rule newDisplayName is required`
      );
    });
  });
};

const loadScenarioStore = (): ScenarioStore => {
  const registry = readJsonFile<ScenarioRegistry>(REGISTRY_FILE);
  assertCondition(
    Array.isArray(registry.scenarios) && registry.scenarios.length > 0,
    'registry must include scenarios'
  );

  const scenarioById: Record<string, MurderMysteryScenario> = {};

  registry.scenarios.forEach((entry) => {
    const filePath = path.join(SCENARIO_DIR, entry.file);
    assertCondition(
      fs.existsSync(filePath),
      `scenario file not found (${entry.file})`
    );

    const scenario = readJsonFile<MurderMysteryScenario>(filePath);
    validateScenarioSchema(scenario, entry.file);
    assertCondition(
      scenario.id === entry.id,
      `${entry.file}: id mismatch (registry=${entry.id}, scenario=${scenario.id})`
    );

    scenarioById[scenario.id] = scenario;
  });

  const defaultScenarioId =
    registry.defaultScenarioId && scenarioById[registry.defaultScenarioId]
      ? registry.defaultScenarioId
      : registry.scenarios[0].id;

  assertCondition(
    Boolean(defaultScenarioId && scenarioById[defaultScenarioId]),
    'default scenario is invalid'
  );

  const catalog: MurderMysteryScenarioCatalogItem[] = Object.values(
    scenarioById
  ).map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    roomDisplayName: scenario.roomDisplayName,
    players: scenario.players,
  }));

  return {
    defaultScenarioId,
    scenarioById,
    catalog,
    loadedAt: Date.now(),
  };
};

const getStore = (): ScenarioStore => {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache;
  }

  cache = loadScenarioStore();
  return cache;
};

export const getMurderMysteryScenarioCatalog =
  (): MurderMysteryScenarioCatalogItem[] => {
    const store = getStore();
    return store.catalog.map((entry) => ({ ...entry }));
  };

export const getMurderMysteryDefaultScenarioId = (): string => {
  const store = getStore();
  return store.defaultScenarioId;
};

export const getMurderMysteryScenario = (
  scenarioId?: string
): MurderMysteryScenario => {
  const store = getStore();
  const resolvedId =
    scenarioId && store.scenarioById[scenarioId]
      ? scenarioId
      : store.defaultScenarioId;
  return cloneScenario(store.scenarioById[resolvedId]);
};
