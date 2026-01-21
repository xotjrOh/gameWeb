import _ from 'lodash';
import { Server } from 'socket.io';
import { AnimalRoom, Player } from '@/types/room';
import {
  AnimalAbilityInfo,
  AnimalEventLogEntry,
  AnimalIntelEntry,
  AnimalPlaceSummary,
  AnimalPlayer,
  AnimalPlayerData,
  AnimalRoundResult,
  AnimalStateSnapshot,
  PlaceRisk,
} from '@/types/animal';
import { PlaceId } from '@/lib/animalPlaces';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket';
import { GAME_STATUS } from '../utils/constants';
import {
  AbilityId,
  RoleId,
  ROLE_LIST,
  ROLE_DEFINITIONS,
  getAbilityDefinition,
  getAbilityInfo,
  getRoleAbilityIds,
  getRoleInfo,
} from './animalAbilityRegistry';

const PLACE_IDS: PlaceId[] = ['A', 'B', 'C', 'D'];

type EatShieldBuff = { charges: number; roundNo?: number };
type PiercingBuff = { active: boolean; roundNo?: number };
type StarvationShieldBuff = { charges: number; roundNo?: number };

type PlayerBuffs = {
  eatShield?: EatShieldBuff;
  pierceEat?: PiercingBuff;
  starvationShield?: StarvationShieldBuff;
  [key: string]: unknown;
};

const zeroByPlace = (): Record<PlaceId, number> => ({
  A: 0,
  B: 0,
  C: 0,
  D: 0,
});

const cloneByPlace = (value: number): Record<PlaceId, number> => ({
  A: value,
  B: value,
  C: value,
  D: value,
});

export const computeRoleCounts = (totalPlayers: number) => {
  if (totalPlayers <= 0) {
    return { carnivore: 0, omnivore: 0, herbivore: 0 };
  }
  const carnivore = Math.max(1, Math.floor(totalPlayers / 4));
  const omnivore = totalPlayers >= 10 ? 2 : totalPlayers >= 6 ? 1 : 0;
  const herbivore = Math.max(0, totalPlayers - carnivore - omnivore);
  return { carnivore, omnivore, herbivore };
};

export const computeBaseCapacities = (
  herbivoreCount: number
): Record<PlaceId, number> => {
  const totalFood = Math.max(4, Math.round(herbivoreCount * 0.85));
  const base = cloneByPlace(1);
  const remaining = Math.max(0, totalFood - 4);

  const weights: Record<PlaceId, number> = { A: 3, B: 2, C: 2, D: 1 };
  const weightTotal = Object.values(weights).reduce(
    (sum, value) => sum + value,
    0
  );
  const extra = zeroByPlace();

  PLACE_IDS.forEach((placeId) => {
    if (remaining <= 0) {
      return;
    }
    const portion = Math.floor((remaining * weights[placeId]) / weightTotal);
    extra[placeId] = portion;
  });

  const allocated = Object.values(extra).reduce((sum, value) => sum + value, 0);
  let leftover = remaining - allocated;
  let index = 0;
  while (leftover > 0) {
    const placeId = PLACE_IDS[index % PLACE_IDS.length];
    extra[placeId] += 1;
    leftover -= 1;
    index += 1;
  }

  return {
    A: base.A + extra.A,
    B: base.B + extra.B,
    C: base.C + extra.C,
    D: base.D + extra.D,
  };
};

const ensureGameDataMaps = (room: AnimalRoom) => {
  room.gameData.processedReqIds ??= {};
  room.gameData.eatIntents ??= {};
  room.gameData.fakePlaceByPlayerId ??= {};
  room.gameData.hiddenRoleByPlayerId ??= {};
  room.gameData.privateIntelByPlayerId ??= {};
  room.gameData.capacityModifiers ??= zeroByPlace();
  room.gameData.baseCapacities ??= cloneByPlace(1);
};

const recalcCapacities = (room: AnimalRoom) => {
  ensureGameDataMaps(room);
  const base = room.gameData.baseCapacities ?? cloneByPlace(1);
  const modifiers = room.gameData.capacityModifiers ?? zeroByPlace();
  const next = zeroByPlace();
  PLACE_IDS.forEach((placeId) => {
    next[placeId] = Math.max(0, base[placeId] + (modifiers[placeId] ?? 0));
  });
  room.gameData.placeCapacities = next;
};

const makeEventId = () =>
  `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const pickRoles = (roles: typeof ROLE_LIST, count: number) => {
  const picks: typeof ROLE_LIST = [];
  const shuffled = _.shuffle(roles);
  if (shuffled.length === 0) {
    return picks;
  }
  for (let index = 0; index < count; index += 1) {
    picks.push(shuffled[index % shuffled.length]);
  }
  return picks;
};

const initAbilityState = (roleId: RoleId) => {
  const abilityIds = getRoleAbilityIds(roleId);
  const remainingUses: Record<string, number> = {};
  abilityIds.forEach((abilityId) => {
    const info = getAbilityDefinition(abilityId);
    if (info?.usesPerGame) {
      remainingUses[abilityId] = info.usesPerGame;
    }
  });
  return {
    usedThisRound: false,
    cooldowns: {},
    remainingUses,
  };
};

const assignRoleToPlayer = (
  player: Player & AnimalPlayerData,
  roleId: RoleId
) => {
  const role = ROLE_DEFINITIONS[roleId];
  player.roleId = role.id;
  player.speciesType = role.speciesType;
  player.placeId = null;
  player.locked = false;
  player.isAlive = true;
  player.score = 0;
  player.eatenCountTotal = 0;
  player.eatenCountThisRound = 0;
  player.abilityState = initAbilityState(roleId);
  player.pendingEatTargetId = null;
  player.buffs = {};
  player.debuffs = {};
};

export const assignRolesAndSetup = (room: AnimalRoom) => {
  const players = room.players as (Player & AnimalPlayerData)[];
  const totalPlayers = players.length;
  const counts = computeRoleCounts(totalPlayers);

  const carnivoreRoles = ROLE_LIST.filter(
    (role) => role.speciesType === 'carnivore'
  );
  const omnivoreRoles = ROLE_LIST.filter(
    (role) => role.speciesType === 'omnivore'
  );
  const herbivoreRoles = ROLE_LIST.filter(
    (role) => role.speciesType === 'herbivore'
  );

  const assignments = _.shuffle([
    ...pickRoles(carnivoreRoles, counts.carnivore),
    ...pickRoles(omnivoreRoles, counts.omnivore),
    ...pickRoles(herbivoreRoles, counts.herbivore),
  ]);

  if (assignments.length > 0) {
    players.forEach((player, index) => {
      const role = assignments[index % assignments.length];
      assignRoleToPlayer(player, role.id);
    });
  }

  const aliveHerbivoreCount = players.filter(
    (player) => player.speciesType !== 'carnivore'
  ).length;

  room.gameData.roundNo = 0;
  room.gameData.phase = 'ready';
  room.gameData.timeLeft = 0;
  room.gameData.endsAt = null;
  room.gameData.eventLog = [];

  ensureGameDataMaps(room);
  room.gameData.capacityModifiers = zeroByPlace();
  room.gameData.baseCapacities = computeBaseCapacities(aliveHerbivoreCount);
  recalcCapacities(room);
  room.gameData.fakePlaceByPlayerId = {};
  room.gameData.hiddenRoleByPlayerId = {};
  room.gameData.privateIntelByPlayerId = {};
  room.gameData.eatIntents = {};

  room.status = GAME_STATUS.PENDING;
};

export const resetAnimalGame = (room: AnimalRoom) => {
  room.status = GAME_STATUS.PENDING;
  room.gameData.phase = 'ready';
  room.gameData.roundNo = 0;
  room.gameData.timeLeft = 0;
  room.gameData.endsAt = null;
  room.gameData.eventLog = [];
  room.gameData.processedReqIds = {};
  room.gameData.eatIntents = {};
  room.gameData.fakePlaceByPlayerId = {};
  room.gameData.hiddenRoleByPlayerId = {};
  room.gameData.privateIntelByPlayerId = {};
  room.gameData.capacityModifiers = zeroByPlace();
  room.gameData.baseCapacities = cloneByPlace(1);
  room.gameData.placeCapacities = cloneByPlace(1);

  room.players.forEach((player) => {
    const animalPlayer = player as Player & AnimalPlayerData;
    animalPlayer.roleId = null;
    animalPlayer.speciesType = 'unknown';
    animalPlayer.placeId = null;
    animalPlayer.locked = false;
    animalPlayer.isAlive = true;
    animalPlayer.score = 0;
    animalPlayer.eatenCountTotal = 0;
    animalPlayer.eatenCountThisRound = 0;
    animalPlayer.abilityState = {
      usedThisRound: false,
      cooldowns: {},
      remainingUses: {},
    };
    animalPlayer.pendingEatTargetId = null;
    animalPlayer.buffs = {};
    animalPlayer.debuffs = {};
  });
};

export const prepareNextRound = (room: AnimalRoom) => {
  const players = room.players as (Player & AnimalPlayerData)[];

  room.gameData.phase = 'ready';
  room.gameData.timeLeft = 0;
  room.gameData.endsAt = null;
  room.gameData.eatIntents = {};
  room.gameData.fakePlaceByPlayerId = {};
  room.gameData.hiddenRoleByPlayerId = {};
  room.gameData.privateIntelByPlayerId = {};

  const aliveHerbivoreCount = players.filter(
    (player) => player.isAlive && player.speciesType !== 'carnivore'
  ).length;
  room.gameData.baseCapacities = computeBaseCapacities(aliveHerbivoreCount);
  room.gameData.capacityModifiers = zeroByPlace();
  recalcCapacities(room);

  players.forEach((player) => {
    if (!player.isAlive) {
      player.locked = true;
      return;
    }
    player.eatenCountThisRound = 0;
    player.pendingEatTargetId = null;
    player.abilityState.usedThisRound = false;

    Object.keys(player.abilityState.cooldowns).forEach((abilityId) => {
      const current = player.abilityState.cooldowns[abilityId] ?? 0;
      if (current <= 1) {
        delete player.abilityState.cooldowns[abilityId];
      } else {
        player.abilityState.cooldowns[abilityId] = current - 1;
      }
    });

    const debuffs = (player.debuffs ?? {}) as Record<string, unknown>;
    if (debuffs.lockedNextRound) {
      player.locked = true;
      delete debuffs.lockedNextRound;
    } else {
      player.locked = false;
    }
    player.debuffs = debuffs;

    const buffs = (player.buffs ?? {}) as Record<string, unknown>;
    delete buffs.eatShield;
    delete buffs.pierceEat;
    delete buffs.starvationShield;
    player.buffs = buffs;
  });
};

export const startRound = (room: AnimalRoom, duration: number) => {
  const players = room.players as (Player & AnimalPlayerData)[];
  const nextDuration = duration > 0 ? duration : room.gameData.roundDuration;
  room.status = GAME_STATUS.IN_PROGRESS;
  room.gameData.phase = 'start';
  room.gameData.roundNo += 1;
  room.gameData.roundDuration = nextDuration;
  room.gameData.timeLeft = nextDuration;
  room.gameData.endsAt = Date.now() + nextDuration * 1000;
  room.gameData.eatIntents = {};

  players.forEach((player) => {
    if (!player.isAlive) {
      return;
    }
    if (!player.placeId) {
      const randomPlace =
        PLACE_IDS[Math.floor(Math.random() * PLACE_IDS.length)];
      player.placeId = randomPlace;
    }
    player.locked = true;
  });

  room.gameData.phase = 'running';
};

const isReqProcessed = (room: AnimalRoom, reqId: string) => {
  ensureGameDataMaps(room);
  if (!reqId) {
    return false;
  }
  return Boolean(room.gameData.processedReqIds?.[reqId]);
};

const markReqProcessed = (room: AnimalRoom, reqId: string) => {
  ensureGameDataMaps(room);
  if (!reqId) {
    return;
  }
  room.gameData.processedReqIds ??= {};
  room.gameData.processedReqIds[reqId] = true;
};

const addIntelEntry = (
  room: AnimalRoom,
  playerId: string,
  entry: AnimalIntelEntry
) => {
  ensureGameDataMaps(room);
  room.gameData.privateIntelByPlayerId ??= {};
  const list = room.gameData.privateIntelByPlayerId[playerId] ?? [];
  list.push(entry);
  room.gameData.privateIntelByPlayerId[playerId] = list;
};

export const appendEventLog = (
  room: AnimalRoom,
  entry: Omit<AnimalEventLogEntry, 'id' | 'at' | 'roundNo'>
): AnimalEventLogEntry => {
  room.gameData.eventLog ??= [];
  const logEntry: AnimalEventLogEntry = {
    id: makeEventId(),
    roundNo: room.gameData.roundNo,
    at: Date.now(),
    ...entry,
  };
  room.gameData.eventLog.push(logEntry);
  return logEntry;
};

export const emitEventLog = (
  room: AnimalRoom,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  entry: AnimalEventLogEntry
) => {
  const canView = (viewerId: string, isHost: boolean) => {
    if (isHost) {
      return true;
    }
    if (entry.visibility === 'public') {
      return true;
    }
    if (entry.visibility === 'private') {
      return entry.targetId === viewerId;
    }
    return false;
  };

  room.players.forEach((player) => {
    if (canView(player.id, false)) {
      io.to(player.socketId).emit('server_event_log_append', entry);
    }
  });

  if (room.host.socketId) {
    if (canView(room.host.id, true)) {
      io.to(room.host.socketId).emit('server_event_log_append', entry);
    }
  }
};

const getPlaceCounts = (room: AnimalRoom) => {
  const counts = PLACE_IDS.reduce(
    (acc, placeId) => {
      acc[placeId] = { herbivores: 0, carnivores: 0 };
      return acc;
    },
    {} as Record<PlaceId, { herbivores: number; carnivores: number }>
  );

  room.players.forEach((player) => {
    const animalPlayer = player as Player & AnimalPlayerData;
    if (!animalPlayer.isAlive || !animalPlayer.placeId) {
      return;
    }
    if (animalPlayer.speciesType === 'carnivore') {
      counts[animalPlayer.placeId].carnivores += 1;
    } else {
      counts[animalPlayer.placeId].herbivores += 1;
    }
  });

  return counts;
};

const computeRisk = (herbivores: number, capacity: number): PlaceRisk => {
  if (capacity <= 0) {
    return herbivores > 0 ? 'over' : 'unknown';
  }
  if (herbivores > capacity) {
    return 'over';
  }
  if (herbivores === capacity) {
    return 'risky';
  }
  return 'safe';
};

export const buildAnimalSnapshot = (
  room: AnimalRoom,
  viewerId: string,
  isHostView: boolean
): AnimalStateSnapshot => {
  room.gameData.eventLog ??= [];
  room.gameData.placeCapacities ??= cloneByPlace(1);
  const placeCounts = getPlaceCounts(room);
  const viewer = room.players.find((player) => player.id === viewerId);
  const viewerPlaceId =
    (viewer as AnimalPlayerData | undefined)?.placeId ?? null;
  const intelEntries = !isHostView
    ? (room.gameData.privateIntelByPlayerId?.[viewerId] ?? [])
    : [];
  const intelPlaceIds = new Set(
    intelEntries
      .filter((entry) => entry.type === 'place')
      .map((entry) => entry.placeId)
  );

  const placeSummary: AnimalPlaceSummary[] = PLACE_IDS.map((placeId) => {
    const counts = placeCounts[placeId];
    const capacity = room.gameData.placeCapacities[placeId] ?? 0;

    if (isHostView) {
      return {
        placeId,
        herbivores: counts.herbivores,
        carnivores: counts.carnivores,
        capacity,
        risk: computeRisk(counts.herbivores, capacity),
      };
    }

    const hasIntel = intelPlaceIds.has(placeId);
    const showRisk = viewerPlaceId === placeId || hasIntel;
    return {
      placeId,
      herbivores: hasIntel ? counts.herbivores : null,
      carnivores: hasIntel ? counts.carnivores : null,
      capacity: hasIntel ? capacity : null,
      risk: showRisk ? computeRisk(counts.herbivores, capacity) : 'unknown',
    };
  });

  const mapPlayerView = (player: Player & AnimalPlayerData): AnimalPlayer => {
    const fakePlaceId = room.gameData.fakePlaceByPlayerId?.[player.id];
    const hiddenRole = room.gameData.hiddenRoleByPlayerId?.[player.id];
    const isSelf = player.id === viewerId;
    const revealFull = isHostView || isSelf;
    const revealSpecies = revealFull || !hiddenRole;

    return {
      ...player,
      placeId: revealFull ? player.placeId : (fakePlaceId ?? player.placeId),
      roleId: revealFull ? player.roleId : null,
      speciesType: revealSpecies ? player.speciesType : 'unknown',
      abilityState: revealFull
        ? player.abilityState
        : { usedThisRound: false, cooldowns: {}, remainingUses: {} },
      pendingEatTargetId: revealFull
        ? (player.pendingEatTargetId ?? null)
        : null,
    };
  };

  const playersView = room.players.map((player) =>
    mapPlayerView(player as Player & AnimalPlayerData)
  );

  const observerPlayer: AnimalPlayer = {
    id: room.host.id,
    name: room.host.name,
    socketId: room.host.socketId,
    roleId: null,
    speciesType: 'observer',
    placeId: null,
    locked: true,
    isAlive: false,
    score: 0,
    eatenCountTotal: 0,
    eatenCountThisRound: 0,
    abilityState: { usedThisRound: false, cooldowns: {}, remainingUses: {} },
    pendingEatTargetId: null,
    buffs: {},
    debuffs: {},
  };

  const you = viewer
    ? mapPlayerView(viewer as Player & AnimalPlayerData)
    : observerPlayer;

  const eventLog = room.gameData.eventLog.filter((entry) => {
    if (isHostView) {
      return true;
    }
    if (entry.visibility === 'public') {
      return true;
    }
    if (entry.visibility === 'private') {
      return entry.targetId === viewerId;
    }
    return false;
  });

  const roleCard =
    you.roleId && ROLE_DEFINITIONS[you.roleId as RoleId]
      ? getRoleInfo(you.roleId as RoleId)
      : undefined;

  const gameDataView = {
    phase: room.gameData.phase,
    roundNo: room.gameData.roundNo,
    totalRounds: room.gameData.totalRounds,
    timeLeft: room.gameData.timeLeft,
    roundDuration: room.gameData.roundDuration,
    endsAt: room.gameData.endsAt ?? null,
    placeCapacities: isHostView
      ? room.gameData.placeCapacities
      : cloneByPlace(0),
    eventLog,
  };

  return {
    you,
    players: playersView,
    gameData: gameDataView,
    roleCard,
    placeSummary,
    intel: intelEntries,
    isHostView,
  };
};

export const emitAnimalSnapshots = (
  room: AnimalRoom,
  io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
  const hostSocketId = room.host.socketId;

  room.players.forEach((player) => {
    const snapshot = buildAnimalSnapshot(room, player.id, false);
    io.to(player.socketId).emit('server_state_snapshot', snapshot);
  });

  if (hostSocketId) {
    const hostSnapshot = buildAnimalSnapshot(room, room.host.id, true);
    io.to(hostSocketId).emit('server_state_snapshot', hostSnapshot);
  }
};

export const getAbilityInfoByRole = (roleId: RoleId): AnimalAbilityInfo[] =>
  getRoleAbilityIds(roleId).map(getAbilityInfo);

export const applyAbility = (
  room: AnimalRoom,
  actor: Player & AnimalPlayerData,
  abilityIdRaw: string,
  target: { playerId?: string; placeId?: PlaceId } | undefined,
  reqId: string
): { logEntry?: AnimalEventLogEntry; duplicate?: boolean } => {
  const abilityId = abilityIdRaw as AbilityId;
  const ability = getAbilityDefinition(abilityId);
  if (!ability) {
    throw new Error('알 수 없는 능력입니다.');
  }
  if (
    !actor.roleId ||
    !getRoleAbilityIds(actor.roleId as RoleId).includes(abilityId)
  ) {
    throw new Error('현재 역할로는 사용할 수 없는 능력입니다.');
  }
  actor.abilityState ??= {
    usedThisRound: false,
    cooldowns: {},
    remainingUses: {},
  };
  if (!actor.isAlive) {
    throw new Error('사망한 플레이어는 능력을 사용할 수 없습니다.');
  }
  if (!ability.allowedPhases.includes(room.gameData.phase)) {
    throw new Error('현재 페이즈에서는 능력을 사용할 수 없습니다.');
  }
  if (actor.abilityState.usedThisRound) {
    throw new Error('이번 라운드에는 이미 능력을 사용했습니다.');
  }
  const cooldown = actor.abilityState.cooldowns[abilityId] ?? 0;
  if (cooldown > 0) {
    throw new Error(`능력 쿨다운 중입니다. (${cooldown}R)`);
  }
  if (ability.usesPerGame) {
    const remaining = actor.abilityState.remainingUses[abilityId] ?? 0;
    if (remaining <= 0) {
      throw new Error('이 능력은 더 이상 사용할 수 없습니다.');
    }
  }
  if (isReqProcessed(room, reqId)) {
    return { duplicate: true };
  }

  const targetPlaceId = target?.placeId;
  const targetPlayerId = target?.playerId;
  if (ability.targetType === 'place' && !targetPlaceId) {
    throw new Error('대상 장소를 선택하세요.');
  }
  if (ability.targetType === 'player' && !targetPlayerId) {
    throw new Error('대상 플레이어를 선택하세요.');
  }
  if (targetPlaceId && !PLACE_IDS.includes(targetPlaceId)) {
    throw new Error('대상 장소가 유효하지 않습니다.');
  }

  const buffs = (actor.buffs ?? {}) as Record<string, unknown>;
  const debuffs = (actor.debuffs ?? {}) as Record<string, unknown>;
  let logMessage = '';

  switch (abilityId) {
    case 'night-watch': {
      const placeId = targetPlaceId as PlaceId;
      const counts = getPlaceCounts(room)[placeId];
      const capacity = room.gameData.placeCapacities[placeId] ?? 0;
      const intelEntry: AnimalIntelEntry = {
        id: makeEventId(),
        roundNo: room.gameData.roundNo,
        type: 'place',
        placeId,
        message: `${placeId} 장소 정보를 확인했습니다.`,
        counts: {
          herbivores: counts.herbivores,
          carnivores: counts.carnivores,
          capacity,
        },
      };
      addIntelEntry(room, actor.id, intelEntry);
      logMessage = `${actor.name}님이 장소 정보를 확인했습니다.`;
      break;
    }
    case 'meerkat-scout': {
      const targetPlayer = room.players.find(
        (player) => player.id === targetPlayerId
      );
      if (!targetPlayer) {
        throw new Error('대상 플레이어를 찾을 수 없습니다.');
      }
      const targetData = targetPlayer as Player & AnimalPlayerData;
      const targetRoleId = targetData.roleId ?? 'unknown';
      const targetRoleName =
        ROLE_DEFINITIONS[targetRoleId as RoleId]?.name ?? targetRoleId;
      const intelEntry: AnimalIntelEntry = {
        id: makeEventId(),
        roundNo: room.gameData.roundNo,
        type: 'player',
        targetPlayerId: targetPlayer.id,
        message: `${targetPlayer.name}의 역할(${targetRoleName})을 확인했습니다.`,
        roleId: targetRoleId,
        speciesType: targetData.speciesType,
      };
      addIntelEntry(room, actor.id, intelEntry);
      logMessage = `${actor.name}님이 플레이어 정보를 확인했습니다.`;
      break;
    }
    case 'false-trail': {
      room.gameData.fakePlaceByPlayerId ??= {};
      room.gameData.fakePlaceByPlayerId[actor.id] = targetPlaceId as PlaceId;
      logMessage = `${actor.name}님이 가짜 위치를 설정했습니다.`;
      break;
    }
    case 'camouflage': {
      room.gameData.hiddenRoleByPlayerId ??= {};
      room.gameData.hiddenRoleByPlayerId[actor.id] = true;
      logMessage = `${actor.name}님이 위장 상태가 되었습니다.`;
      break;
    }
    case 'shell-guard': {
      buffs.eatShield = { charges: 1, roundNo: room.gameData.roundNo };
      debuffs.lockedNextRound = true;
      logMessage = `${actor.name}님이 방어 태세를 취했습니다.`;
      break;
    }
    case 'beaver-dam': {
      room.gameData.capacityModifiers ??= zeroByPlace();
      room.gameData.capacityModifiers[targetPlaceId as PlaceId] += 1;
      recalcCapacities(room);
      logMessage = `${actor.name}님이 정원을 늘렸습니다.`;
      break;
    }
    case 'hyena-spoil': {
      room.gameData.capacityModifiers ??= zeroByPlace();
      room.gameData.capacityModifiers[targetPlaceId as PlaceId] -= 1;
      recalcCapacities(room);
      logMessage = `${actor.name}님이 정원을 훼손했습니다.`;
      break;
    }
    case 'last-dash': {
      if (room.gameData.timeLeft > 10) {
        throw new Error('남은 시간이 10초 이내일 때만 사용할 수 있습니다.');
      }
      actor.placeId = targetPlaceId as PlaceId;
      actor.locked = true;
      logMessage = `${actor.name}님이 막판 이동을 했습니다.`;
      break;
    }
    case 'porcupine-spines': {
      buffs.starvationShield = { charges: 1, roundNo: room.gameData.roundNo };
      logMessage = `${actor.name}님이 굶주림 방어를 준비했습니다.`;
      break;
    }
    case 'lion-ambush': {
      buffs.pierceEat = { active: true, roundNo: room.gameData.roundNo };
      logMessage = `${actor.name}님이 매복을 준비했습니다.`;
      break;
    }
    default:
      throw new Error('능력을 처리할 수 없습니다.');
  }

  markReqProcessed(room, reqId);

  actor.buffs = buffs;
  actor.debuffs = debuffs;
  actor.abilityState.usedThisRound = true;
  actor.abilityState.cooldowns[abilityId] = ability.cooldownRounds;
  if (ability.usesPerGame) {
    const remaining =
      actor.abilityState.remainingUses[abilityId] ?? ability.usesPerGame;
    actor.abilityState.remainingUses[abilityId] = Math.max(0, remaining - 1);
  }

  const logEntry = appendEventLog(room, {
    type: 'ability',
    message: logMessage,
    visibility: ability.visibility,
    targetId: ability.visibility === 'private' ? actor.id : undefined,
  });

  return { logEntry };
};

export const recordEatIntent = (
  room: AnimalRoom,
  predator: Player & AnimalPlayerData,
  targetId: string,
  reqId: string
) => {
  if (!predator.isAlive || predator.speciesType !== 'carnivore') {
    throw new Error('섭취 권한이 없습니다.');
  }
  if (room.gameData.phase !== 'running') {
    throw new Error('라운드 진행 중에만 사냥할 수 있습니다.');
  }
  if (isReqProcessed(room, reqId)) {
    return { duplicate: true };
  }

  const target = room.players.find((player) => player.id === targetId) as
    | (Player & AnimalPlayerData)
    | undefined;
  if (!target || !target.isAlive) {
    throw new Error('대상이 유효하지 않습니다.');
  }
  if (target.speciesType === 'carnivore') {
    throw new Error('육식은 섭취 대상이 아닙니다.');
  }
  if (!predator.placeId || predator.placeId !== target.placeId) {
    throw new Error('같은 장소의 대상만 사냥할 수 있습니다.');
  }

  markReqProcessed(room, reqId);

  predator.pendingEatTargetId = targetId;
  room.gameData.eatIntents ??= {};
  room.gameData.eatIntents[predator.id] = targetId;
};

export const resolveRound = (room: AnimalRoom): AnimalRoundResult => {
  const players = room.players as (Player & AnimalPlayerData)[];
  const eatenIds: string[] = [];
  const starvedIds: string[] = [];
  const sparedIds: string[] = [];

  const predators = _.shuffle(
    players.filter(
      (player) => player.isAlive && player.speciesType === 'carnivore'
    )
  );

  predators.forEach((predator) => {
    const targetId = room.gameData.eatIntents?.[predator.id];
    if (!targetId) {
      return;
    }
    const target = players.find((player) => player.id === targetId);
    if (!target || !target.isAlive) {
      return;
    }
    if (!predator.placeId || predator.placeId !== target.placeId) {
      return;
    }

    const targetBuffs = (target.buffs ?? {}) as PlayerBuffs;
    const predatorBuffs = (predator.buffs ?? {}) as PlayerBuffs;
    const hasShield = targetBuffs.eatShield?.charges > 0;
    const canPierce = Boolean(predatorBuffs.pierceEat?.active);

    if (hasShield && !canPierce) {
      targetBuffs.eatShield.charges -= 1;
      target.buffs = targetBuffs;
      sparedIds.push(target.id);
      return;
    }

    target.isAlive = false;
    eatenIds.push(target.id);
    predator.score += 1;
    predator.eatenCountThisRound += 1;
    predator.eatenCountTotal += 1;
  });

  PLACE_IDS.forEach((placeId) => {
    const capacity = room.gameData.placeCapacities[placeId] ?? 0;
    const candidates = players.filter(
      (player) =>
        player.isAlive &&
        player.speciesType !== 'carnivore' &&
        player.placeId === placeId
    );
    if (candidates.length > capacity) {
      candidates.forEach((player) => {
        const buffs = (player.buffs ?? {}) as PlayerBuffs;
        if (buffs.starvationShield?.charges > 0) {
          buffs.starvationShield.charges -= 1;
          player.buffs = buffs;
          sparedIds.push(player.id);
          return;
        }
        player.isAlive = false;
        starvedIds.push(player.id);
      });
    }
  });

  players.forEach((player) => {
    const buffs = (player.buffs ?? {}) as PlayerBuffs;
    delete buffs.eatShield;
    delete buffs.pierceEat;
    delete buffs.starvationShield;
    player.buffs = buffs;
  });

  const survivors = players
    .filter((player) => player.isAlive)
    .map((player) => player.id);

  return {
    roundNo: room.gameData.roundNo,
    eatenIds,
    starvedIds,
    sparedIds: _.uniq(sparedIds),
    survivors,
  };
};

export const buildWinnerLists = (room: AnimalRoom) => {
  const players = room.players as (Player & AnimalPlayerData)[];
  const survivors = players.filter((player) => player.isAlive);
  const carnivores = players.filter(
    (player) => player.speciesType === 'carnivore'
  );
  const maxCarnivoreScore = Math.max(
    0,
    ...carnivores.map((player) => player.score)
  );
  const topCarnivores = carnivores.filter(
    (player) => player.score === maxCarnivoreScore
  );

  const winners = _.uniq([
    ...survivors.map((player) => player.id),
    ...topCarnivores.map((player) => player.id),
  ]);
  const losers = players
    .filter((player) => !winners.includes(player.id))
    .map((player) => player.id);

  return { winners, losers };
};

export const emitPhaseUpdate = (
  room: AnimalRoom,
  io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
  io.to(room.roomId).emit('server_round_phase_changed', {
    phase: room.gameData.phase,
    timeLeft: room.gameData.timeLeft,
    endsAt: room.gameData.endsAt ?? null,
  });
};
