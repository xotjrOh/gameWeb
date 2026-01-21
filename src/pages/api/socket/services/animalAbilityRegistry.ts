import {
  AnimalAbilityInfo,
  AnimalRoleInfo,
  AbilityVisibility,
  SpeciesType,
} from '@/types/animal';

export type AbilityId =
  | 'night-watch'
  | 'meerkat-scout'
  | 'false-trail'
  | 'camouflage'
  | 'shell-guard'
  | 'beaver-dam'
  | 'hyena-spoil'
  | 'last-dash'
  | 'porcupine-spines'
  | 'lion-ambush';

export type RoleId =
  | 'owl'
  | 'meerkat'
  | 'fox'
  | 'chameleon'
  | 'turtle'
  | 'beaver'
  | 'hyena'
  | 'gazelle'
  | 'porcupine'
  | 'lion';

export interface AnimalRoleDefinition {
  id: RoleId;
  name: string;
  speciesType: SpeciesType;
  summary: string;
  abilityIds: AbilityId[];
  winHint?: string;
}

export interface AnimalAbilityDefinition extends AnimalAbilityInfo {
  visibility: AbilityVisibility;
}

export const ABILITY_DEFINITIONS: Record<AbilityId, AnimalAbilityDefinition> = {
  'night-watch': {
    id: 'night-watch',
    name: '야간 정찰',
    description:
      '선택한 장소의 정확한 초식/육식 수와 정원을 비밀리에 확인합니다.',
    allowedPhases: ['ready', 'running'],
    targetType: 'place',
    cooldownRounds: 2,
    visibility: 'private',
  },
  'meerkat-scout': {
    id: 'meerkat-scout',
    name: '감시자의 눈',
    description: '선택한 플레이어의 역할을 확인합니다.',
    allowedPhases: ['ready', 'running'],
    targetType: 'player',
    cooldownRounds: 2,
    visibility: 'private',
  },
  'false-trail': {
    id: 'false-trail',
    name: '가짜 흔적',
    description:
      '이번 라운드 동안 다른 플레이어에게 가짜 위치가 보이도록 합니다.',
    allowedPhases: ['ready'],
    targetType: 'place',
    cooldownRounds: 2,
    visibility: 'host',
  },
  camouflage: {
    id: 'camouflage',
    name: '위장',
    description: '이번 라운드 동안 다른 플레이어에게 역할/종족이 숨겨집니다.',
    allowedPhases: ['ready'],
    targetType: 'self',
    cooldownRounds: 2,
    visibility: 'host',
  },
  'shell-guard': {
    id: 'shell-guard',
    name: '껍질 방패',
    description:
      '이번 라운드 한 번, 섭취 시도를 무효화합니다. 사용 시 다음 라운드 이동이 제한됩니다.',
    allowedPhases: ['running'],
    targetType: 'self',
    cooldownRounds: 2,
    visibility: 'private',
  },
  'beaver-dam': {
    id: 'beaver-dam',
    name: '댐 건설',
    description: '선택한 장소의 정원을 이번 라운드 +1 합니다.',
    allowedPhases: ['ready'],
    targetType: 'place',
    cooldownRounds: 2,
    visibility: 'host',
  },
  'hyena-spoil': {
    id: 'hyena-spoil',
    name: '먹이 훼손',
    description: '선택한 장소의 정원을 이번 라운드 -1 합니다.',
    allowedPhases: ['ready'],
    targetType: 'place',
    cooldownRounds: 2,
    visibility: 'host',
  },
  'last-dash': {
    id: 'last-dash',
    name: '막판 질주',
    description: '라운드 종료 10초 이내에 한 번 장소를 변경합니다.',
    allowedPhases: ['running'],
    targetType: 'place',
    cooldownRounds: 3,
    visibility: 'host',
  },
  'porcupine-spines': {
    id: 'porcupine-spines',
    name: '가시 방어',
    description: '이번 게임에서 1회, 굶주림 판정을 무효화합니다.',
    allowedPhases: ['running'],
    targetType: 'self',
    cooldownRounds: 0,
    usesPerGame: 1,
    visibility: 'private',
  },
  'lion-ambush': {
    id: 'lion-ambush',
    name: '매복',
    description: '이번 라운드의 섭취는 보호 효과를 무시합니다.',
    allowedPhases: ['running'],
    targetType: 'self',
    cooldownRounds: 2,
    visibility: 'private',
  },
};

export const ROLE_DEFINITIONS: Record<RoleId, AnimalRoleDefinition> = {
  owl: {
    id: 'owl',
    name: '부엉이',
    speciesType: 'omnivore',
    summary: '정보를 통해 협상과 심리전을 주도합니다.',
    abilityIds: ['night-watch'],
    winHint: '정확한 정보로 안전한 이동을 설계하세요.',
  },
  meerkat: {
    id: 'meerkat',
    name: '미어캣',
    speciesType: 'herbivore',
    summary: '위험한 상대의 정체를 파악합니다.',
    abilityIds: ['meerkat-scout'],
    winHint: '역할 정보를 바탕으로 동맹을 구축하세요.',
  },
  fox: {
    id: 'fox',
    name: '여우',
    speciesType: 'carnivore',
    summary: '거짓 정보로 다른 플레이어를 혼란시킵니다.',
    abilityIds: ['false-trail'],
    winHint: '혼선을 만들어 안전한 사냥을 준비하세요.',
  },
  chameleon: {
    id: 'chameleon',
    name: '카멜레온',
    speciesType: 'omnivore',
    summary: '정체를 숨기고 협상 포지션을 바꿉니다.',
    abilityIds: ['camouflage'],
    winHint: '정체를 숨긴 채 유리한 거래를 만드세요.',
  },
  turtle: {
    id: 'turtle',
    name: '거북이',
    speciesType: 'herbivore',
    summary: '한 번의 공격을 막고 생존 확률을 높입니다.',
    abilityIds: ['shell-guard'],
    winHint: '위험한 라운드에 방패를 아껴 쓰세요.',
  },
  beaver: {
    id: 'beaver',
    name: '비버',
    speciesType: 'herbivore',
    summary: '정원을 늘려 생존 공간을 확장합니다.',
    abilityIds: ['beaver-dam'],
    winHint: '인원 몰림을 예측해 정원을 조정하세요.',
  },
  hyena: {
    id: 'hyena',
    name: '하이에나',
    speciesType: 'carnivore',
    summary: '정원을 줄여 혼란을 유발합니다.',
    abilityIds: ['hyena-spoil'],
    winHint: '다수 몰린 장소를 압박하세요.',
  },
  gazelle: {
    id: 'gazelle',
    name: '가젤',
    speciesType: 'herbivore',
    summary: '막판 이동으로 위험을 회피합니다.',
    abilityIds: ['last-dash'],
    winHint: '마지막 10초를 버틸 수 있는 판단력이 중요합니다.',
  },
  porcupine: {
    id: 'porcupine',
    name: '호저',
    speciesType: 'herbivore',
    summary: '굶주림 한 번을 무시할 수 있습니다.',
    abilityIds: ['porcupine-spines'],
    winHint: '정산 직전에 방어를 준비하세요.',
  },
  lion: {
    id: 'lion',
    name: '사자',
    speciesType: 'carnivore',
    summary: '방어를 무시하는 결정적 사냥을 준비합니다.',
    abilityIds: ['lion-ambush'],
    winHint: '결정적 한 번에 사냥을 끝내세요.',
  },
};

export const ROLE_LIST = Object.values(ROLE_DEFINITIONS);

export const getAbilityInfo = (abilityId: AbilityId): AnimalAbilityInfo => {
  const { visibility, ...info } = ABILITY_DEFINITIONS[abilityId];
  return info;
};

export const getRoleInfo = (roleId: RoleId): AnimalRoleInfo => {
  const role = ROLE_DEFINITIONS[roleId];
  return {
    id: role.id,
    name: role.name,
    speciesType: role.speciesType,
    summary: role.summary,
    abilities: role.abilityIds.map(getAbilityInfo),
    winHint: role.winHint,
  };
};

export const getRoleAbilityIds = (roleId: RoleId): AbilityId[] =>
  ROLE_DEFINITIONS[roleId]?.abilityIds ?? [];

export const getAbilityDefinition = (abilityId: AbilityId) =>
  ABILITY_DEFINITIONS[abilityId];
