import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import {
  MurderMysteryInvestigationRound,
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

type RawRecord = Record<string, unknown>;

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

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const asRound = (
  value: unknown
): MurderMysteryInvestigationRound | undefined =>
  value === 1 || value === 2 ? value : undefined;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

const requireRecord = (value: unknown, message: string): RawRecord => {
  assertCondition(isRecord(value), message);
  return value as RawRecord;
};

const requireString = (value: unknown, message: string): string => {
  const resolved = asNonEmptyString(value);
  assertCondition(resolved, message);
  return resolved as string;
};

const requireInteger = (value: unknown, message: string): number => {
  assertCondition(Number.isInteger(value), message);
  return Number(value);
};

const requireRound = (
  value: unknown,
  message: string
): MurderMysteryInvestigationRound => {
  const round = asRound(value);
  assertCondition(round, message);
  return round as MurderMysteryInvestigationRound;
};

const readJsonFile = <T>(filePath: string): T => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
};

const readScenarioFile = (filePath: string): unknown => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.json') {
    return JSON.parse(raw);
  }
  if (extension === '.yaml' || extension === '.yml') {
    return YAML.parse(raw);
  }

  throw new Error(
    `[murder_mystery][scenario] unsupported scenario file extension (${extension})`
  );
};

const normalizePlayers = (
  rawPlayers: unknown,
  fileName: string
): MurderMysteryScenario['players'] => {
  if (Number.isInteger(rawPlayers)) {
    const count = Number(rawPlayers);
    return {
      min: count,
      max: count,
    };
  }

  const playersRecord = requireRecord(
    rawPlayers,
    `${fileName}: players must be integer or object`
  );
  return {
    min: requireInteger(
      playersRecord.min,
      `${fileName}: players.min must be integer`
    ),
    max: requireInteger(
      playersRecord.max,
      `${fileName}: players.max must be integer`
    ),
  };
};

const normalizeInvestigationTargets = ({
  rawTargets,
  round,
  fileName,
  cardRoundById,
}: {
  rawTargets: unknown[];
  round: MurderMysteryInvestigationRound;
  fileName: string;
  cardRoundById: Record<string, MurderMysteryInvestigationRound>;
}): MurderMysteryScenario['investigations']['rounds'][number]['targets'] =>
  rawTargets.map((rawTarget, index) => {
    const targetRecord = requireRecord(
      rawTarget,
      `${fileName}: round ${round} target[${index}] must be object`
    );
    const id = requireString(
      targetRecord.id,
      `${fileName}: round ${round} target.id is required`
    );
    const label =
      asNonEmptyString(targetRecord.label) ??
      asNonEmptyString(targetRecord.name) ??
      id;
    const description = asNonEmptyString(targetRecord.description);
    const cardPool = [
      ...toStringArray(targetRecord.cardPool),
      ...toStringArray(targetRecord.cards),
    ];
    assertCondition(
      cardPool.length > 0,
      `${fileName}: round ${round} target(${id}) cards/cardPool is required`
    );

    cardPool.forEach((cardId) => {
      if (!cardRoundById[cardId]) {
        cardRoundById[cardId] = round;
      }
    });

    return {
      id,
      label,
      description,
      cardPool,
    };
  });

const normalizeInvestigations = (
  rawScenario: RawRecord,
  fileName: string
): {
  investigations: MurderMysteryScenario['investigations'];
  cardRoundById: Record<string, MurderMysteryInvestigationRound>;
} => {
  const investigationsRecord = requireRecord(
    rawScenario.investigations,
    `${fileName}: investigations is required`
  );
  const cardRoundById: Record<string, MurderMysteryInvestigationRound> = {};
  const normalizedRounds: MurderMysteryScenario['investigations']['rounds'] =
    [];

  const explicitRounds = Array.isArray(investigationsRecord.rounds)
    ? investigationsRecord.rounds
    : [];

  if (explicitRounds.length > 0) {
    explicitRounds.forEach((rawRound, index) => {
      const roundRecord = requireRecord(
        rawRound,
        `${fileName}: investigations.rounds[${index}] must be object`
      );
      const round = requireRound(
        roundRecord.round,
        `${fileName}: investigations.rounds[${index}].round must be 1 or 2`
      );
      const targets = normalizeInvestigationTargets({
        rawTargets: Array.isArray(roundRecord.targets)
          ? roundRecord.targets
          : [],
        round,
        fileName,
        cardRoundById,
      });
      normalizedRounds.push({ round, targets });
    });
  } else {
    const round1Targets = Array.isArray(investigationsRecord.round1)
      ? investigationsRecord.round1
      : [];
    const round2Targets = Array.isArray(investigationsRecord.round2)
      ? investigationsRecord.round2
      : [];

    normalizedRounds.push({
      round: 1,
      targets: normalizeInvestigationTargets({
        rawTargets: round1Targets,
        round: 1,
        fileName,
        cardRoundById,
      }),
    });
    normalizedRounds.push({
      round: 2,
      targets: normalizeInvestigationTargets({
        rawTargets: round2Targets,
        round: 2,
        fileName,
        cardRoundById,
      }),
    });
  }

  const deliveryMode =
    investigationsRecord.deliveryMode === 'manual' ? 'manual' : 'auto';

  return {
    investigations: {
      deliveryMode,
      rounds: normalizedRounds,
    },
    cardRoundById,
  };
};

const normalizeDynamicDisplayNameRules = ({
  rawRules,
  roleId,
  fileName,
  cardRoundById,
}: {
  rawRules: unknown;
  roleId: string;
  fileName: string;
  cardRoundById: Record<string, MurderMysteryInvestigationRound>;
}): MurderMysteryScenario['roles'][number]['dynamicDisplayNameRules'] => {
  if (!Array.isArray(rawRules) || rawRules.length === 0) {
    return undefined;
  }

  return rawRules.map((rawRule, index) => {
    const ruleRecord = requireRecord(
      rawRule,
      `${fileName}: role(${roleId}) dynamicDisplayNameRules[${index}] must be object`
    );
    const ruleId = asNonEmptyString(ruleRecord.id);

    if (isRecord(ruleRecord.trigger)) {
      const trigger = ruleRecord.trigger;
      assertCondition(
        trigger.type === 'cardRevealed',
        `${fileName}: role(${roleId}) dynamic rule trigger.type must be cardRevealed`
      );
      const cardId = requireString(
        trigger.cardId,
        `${fileName}: role(${roleId}) dynamic rule trigger.cardId is required`
      );
      const newDisplayName = requireString(
        ruleRecord.newDisplayName,
        `${fileName}: role(${roleId}) dynamic rule newDisplayName is required`
      );
      const round = asRound(trigger.round);
      return {
        id: ruleId,
        trigger: {
          type: 'cardRevealed' as const,
          cardId,
          ...(round ? { round } : {}),
        },
        newDisplayName,
      };
    }

    const when = requireRecord(
      ruleRecord.when,
      `${fileName}: role(${roleId}) dynamic rule when is required`
    );
    const cardId = requireString(
      when.onCardRevealed,
      `${fileName}: role(${roleId}) dynamic rule when.onCardRevealed is required`
    );
    const newDisplayName = requireString(
      ruleRecord.setDisplayName,
      `${fileName}: role(${roleId}) dynamic rule setDisplayName is required`
    );
    const round = asRound(when.round) ?? cardRoundById[cardId];
    return {
      id: ruleId ?? `${roleId}:rule:${index}`,
      trigger: {
        type: 'cardRevealed' as const,
        cardId,
        ...(round ? { round } : {}),
      },
      newDisplayName,
    };
  });
};

const normalizeRoles = ({
  rawRoles,
  cardRoundById,
  fileName,
}: {
  rawRoles: unknown;
  cardRoundById: Record<string, MurderMysteryInvestigationRound>;
  fileName: string;
}): {
  roles: MurderMysteryScenario['roles'];
  killerRoleId: string | null;
} => {
  const roleList = Array.isArray(rawRoles) ? rawRoles : [];
  assertCondition(roleList.length > 0, `${fileName}: roles must be non-empty`);

  let killerRoleId: string | null = null;

  const roles: MurderMysteryScenario['roles'] = roleList.map(
    (rawRole, index) => {
      const roleRecord = requireRecord(
        rawRole,
        `${fileName}: roles[${index}] must be object`
      );
      const id = requireString(
        roleRecord.id,
        `${fileName}: roles[${index}].id is required`
      );
      const displayName = requireString(
        roleRecord.displayName,
        `${fileName}: role(${id}) displayName is required`
      );
      const publicText = requireString(
        roleRecord.publicText,
        `${fileName}: role(${id}) publicText is required`
      );
      const secretText = requireString(
        roleRecord.secretText,
        `${fileName}: role(${id}) secretText is required`
      );

      if (roleRecord.isKiller === true) {
        killerRoleId = id;
      }

      return {
        id,
        displayName,
        publicText,
        secretText,
        dynamicDisplayNameRules: normalizeDynamicDisplayNameRules({
          rawRules: roleRecord.dynamicDisplayNameRules,
          roleId: id,
          fileName,
          cardRoundById,
        }),
      };
    }
  );

  return {
    roles,
    killerRoleId,
  };
};

const normalizeParts = ({
  rawParts,
  fileName,
}: {
  rawParts: unknown;
  fileName: string;
}): MurderMysteryScenario['parts'] => {
  const partList = Array.isArray(rawParts) ? rawParts : [];
  assertCondition(partList.length > 0, `${fileName}: parts must be non-empty`);

  return partList.map((rawPart, index) => {
    const partRecord = requireRecord(
      rawPart,
      `${fileName}: parts[${index}] must be object`
    );
    const id = requireString(
      partRecord.id,
      `${fileName}: parts[${index}].id is required`
    );
    return {
      id,
      name: requireString(
        partRecord.name,
        `${fileName}: part(${id}) name is required`
      ),
      source: requireString(
        partRecord.source,
        `${fileName}: part(${id}) source is required`
      ),
      note: requireString(
        partRecord.note,
        `${fileName}: part(${id}) note is required`
      ),
    };
  });
};

const normalizeCards = ({
  rawCards,
  fileName,
}: {
  rawCards: unknown;
  fileName: string;
}): MurderMysteryScenario['cards'] => {
  const cardList = Array.isArray(rawCards) ? rawCards : [];
  assertCondition(cardList.length > 0, `${fileName}: cards must be non-empty`);

  return cardList.map((rawCard, index) => {
    const cardRecord = requireRecord(
      rawCard,
      `${fileName}: cards[${index}] must be object`
    );
    const id = requireString(
      cardRecord.id,
      `${fileName}: cards[${index}].id is required`
    );
    const rawEffects = Array.isArray(cardRecord.effects)
      ? cardRecord.effects
      : [];
    const effects =
      rawEffects.length > 0
        ? rawEffects.map((rawEffect, effectIndex) => {
            const effectRecord = requireRecord(
              rawEffect,
              `${fileName}: card(${id}) effects[${effectIndex}] must be object`
            );
            const effectType = requireString(
              effectRecord.type,
              `${fileName}: card(${id}) effects[${effectIndex}].type is required`
            );

            if (effectType === 'addPart') {
              return {
                type: 'addPart' as const,
                partId: requireString(
                  effectRecord.partId,
                  `${fileName}: card(${id}) addPart.partId is required`
                ),
              };
            }

            if (effectType === 'revealRoleName') {
              return {
                type: 'revealRoleName' as const,
                roleId: requireString(
                  effectRecord.roleId,
                  `${fileName}: card(${id}) revealRoleName.roleId is required`
                ),
                newDisplayName: requireString(
                  effectRecord.newDisplayName,
                  `${fileName}: card(${id}) revealRoleName.newDisplayName is required`
                ),
              };
            }

            throw new Error(
              `[murder_mystery][scenario] ${fileName}: card(${id}) unsupported effect type (${effectType})`
            );
          })
        : undefined;

    return {
      id,
      title: requireString(
        cardRecord.title,
        `${fileName}: card(${id}) title is required`
      ),
      text: requireString(
        cardRecord.text,
        `${fileName}: card(${id}) text is required`
      ),
      effects,
    };
  });
};

const normalizeScenarioSchema = (
  rawScenario: unknown,
  fileName: string
): MurderMysteryScenario => {
  const scenarioRecord = requireRecord(
    rawScenario,
    `${fileName}: scenario root must be object`
  );

  const id = requireString(scenarioRecord.id, `${fileName}: id is required`);
  const title = requireString(
    scenarioRecord.title,
    `${fileName}: title is required`
  );
  const roomDisplayName = requireString(
    scenarioRecord.roomDisplayName,
    `${fileName}: roomDisplayName is required`
  );
  const players = normalizePlayers(scenarioRecord.players, fileName);
  const introRecord = requireRecord(
    scenarioRecord.intro,
    `${fileName}: intro is required`
  );
  const introReadAloud = requireString(
    introRecord.readAloud,
    `${fileName}: intro.readAloud is required`
  );

  const { investigations, cardRoundById } = normalizeInvestigations(
    scenarioRecord,
    fileName
  );
  const { roles, killerRoleId } = normalizeRoles({
    rawRoles: scenarioRecord.roles,
    cardRoundById,
    fileName,
  });
  const parts = normalizeParts({
    rawParts: scenarioRecord.parts,
    fileName,
  });
  const cards = normalizeCards({
    rawCards: scenarioRecord.cards,
    fileName,
  });

  const finalVoteRecord = requireRecord(
    scenarioRecord.finalVote,
    `${fileName}: finalVote is required`
  );
  const finalVoteQuestion = requireString(
    finalVoteRecord.question,
    `${fileName}: finalVote.question is required`
  );
  const finalVoteCorrectRoleId =
    asNonEmptyString(finalVoteRecord.correctRoleId) ?? killerRoleId;
  assertCondition(
    finalVoteCorrectRoleId,
    `${fileName}: finalVote.correctRoleId is required`
  );
  const resolvedFinalVoteCorrectRoleId = finalVoteCorrectRoleId as string;

  const endbookRecord = requireRecord(
    scenarioRecord.endbook,
    `${fileName}: endbook is required`
  );

  return {
    id,
    title,
    roomDisplayName,
    players,
    intro: {
      readAloud: introReadAloud,
    },
    roles,
    parts,
    investigations,
    cards,
    finalVote: {
      question: finalVoteQuestion,
      correctRoleId: resolvedFinalVoteCorrectRoleId,
    },
    endbook: {
      common: requireString(
        endbookRecord.common,
        `${fileName}: endbook.common is required`
      ),
      variantMatched: requireString(
        endbookRecord.variantMatched,
        `${fileName}: endbook.variantMatched is required`
      ),
      variantNotMatched: requireString(
        endbookRecord.variantNotMatched,
        `${fileName}: endbook.variantNotMatched is required`
      ),
      closingLine: requireString(
        endbookRecord.closingLine,
        `${fileName}: endbook.closingLine is required`
      ),
    },
  };
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
  const scenarioByRegistryId: Record<string, MurderMysteryScenario> = {};

  registry.scenarios.forEach((entry) => {
    const filePath = path.join(SCENARIO_DIR, entry.file);
    assertCondition(
      fs.existsSync(filePath),
      `scenario file not found (${entry.file})`
    );

    const scenario = normalizeScenarioSchema(
      readScenarioFile(filePath),
      entry.file
    );
    validateScenarioSchema(scenario, entry.file);

    assertCondition(
      !scenarioByRegistryId[entry.id],
      `duplicated registry scenario id (${entry.id})`
    );
    scenarioByRegistryId[entry.id] = scenario;

    assertCondition(
      !scenarioById[entry.id],
      `duplicated scenario lookup id (${entry.id})`
    );
    scenarioById[entry.id] = scenario;

    if (scenario.id !== entry.id) {
      assertCondition(
        !scenarioById[scenario.id],
        `duplicated scenario id (${scenario.id})`
      );
      scenarioById[scenario.id] = scenario;
    }
  });

  const defaultScenarioId =
    registry.defaultScenarioId &&
    scenarioByRegistryId[registry.defaultScenarioId]
      ? registry.defaultScenarioId
      : registry.scenarios[0].id;

  assertCondition(
    Boolean(defaultScenarioId && scenarioById[defaultScenarioId]),
    'default scenario is invalid'
  );

  const catalog: MurderMysteryScenarioCatalogItem[] = registry.scenarios.map(
    (entry) => {
      const scenario = scenarioByRegistryId[entry.id];
      return {
        id: entry.id,
        title: scenario.title,
        roomDisplayName: scenario.roomDisplayName,
        players: scenario.players,
      };
    }
  );

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
