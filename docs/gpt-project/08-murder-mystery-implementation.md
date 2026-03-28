# Murder Mystery Implementation

이 프로젝트의 머더미스터리는 "시나리오 데이터 주도형 실시간 추리 게임 엔진"에 가깝다.

중요한 점은 이것이 단순히 화면 몇 개를 만든 것이 아니라, 아래 4층 구조로 구현되어 있다는 점이다.

- 시나리오 데이터
- 서버 상태머신
- 소켓 이벤트 계약
- 개인화 스냅샷을 소비하는 단일 화면 UI

## 1. 현재 구현의 큰 방향

현재 머더미스터리는 기존 room 시스템 위에 올라간 하나의 `gameType`이다.

- 방 생성 시 `gameType: murder_mystery`를 선택한다.
- 생성 모달에서 `/api/murder-mystery/scenarios`로 시나리오 목록을 받아온다.
- 선택한 시나리오의 인원 규칙에 맞춰 `maxPlayers`를 잡는다.
- 옵션으로 `hostParticipatesAsPlayer`를 켤 수 있다.

즉 "머더미스터리 자체가 완전히 별도 앱"이 아니라, 공통 방/소켓 인프라 위에 시나리오 엔진이 붙은 구조다.

## 2. 시나리오 데이터 중심 구조

시나리오의 진실원은 `data/murder-mystery/` 아래 데이터 파일이다.

- `registry.json`이 노출 가능한 시나리오 목록과 기본 시나리오를 정한다.
- 실제 시나리오는 `.yaml`, `.yml`, `.json`을 지원한다.
- 현재 등록된 시나리오는 `banjang-killer.yaml` 1개다.

시나리오 파일은 대략 아래 블록으로 구성된다.

- `players`
- `rules`
- `intro`
- `flow.steps`
- `roles`
- `parts`
- `investigations`
- `cards`
- `finalVote`
- `endbook`

즉 새 머더미스터리를 만들 때도 기본 단위는 "컴포넌트 추가"보다 "시나리오 스키마에 맞는 데이터 작성"이다.

## 3. 서버는 시나리오를 정규화하고 검증한다

시나리오 로더는 단순 파일 읽기가 아니다.

- registry를 읽는다.
- 시나리오 파일을 파싱한다.
- 스키마를 정규화한다.
- 참조 무결성을 검증한다.
- 유효한 시나리오만 catalog에 노출한다.
- dev에서는 짧은 TTL, prod에서는 더 긴 TTL로 캐시한다.

중요한 구현 포인트는 아래다.

- registry id와 scenario file 내부 id가 달라도 둘 다 lookup 가능하게 저장한다.
- legacy 조사 포맷(`round1`, `round2`)과 신형 `investigations.rounds` 둘 다 받아준다.
- `flow.steps`가 없으면 조사 라운드 기준으로 기본 flow를 생성할 수 있다.
- `finalVote.correctRoleId`가 없으면 `isKiller: true` 역할로 보정할 수 있다.

즉 이 엔진은 "머더미스터리 하나 하드코딩"이 아니라, 어느 정도 일반화된 시나리오 로더를 이미 갖고 있다.

## 4. 런타임 상태는 서버 state machine이 가진다

머더미스터리의 실제 진행 상태는 room의 `gameData` 안에 들어간다.

핵심 필드는 아래다.

- 현재 시나리오 정보
  - `scenarioId`
  - `scenarioTitle`
  - `scenarioRoomDisplayName`
- 진행 상태
  - `phase`
  - `phaseStartedAt`
  - `phaseDurationSec`
- 플레이어별 비공개 상태
  - `roleByPlayerId`
  - `roleDisplayNameByPlayerId`
  - `revealedCardsByPlayerId`
  - `investigationUsedByPlayerId`
- 공개 상태
  - `revealedCardIds`
  - `revealedCardIdsByTargetId`
  - `revealedPartIds`
  - `announcements`
- 조사/투표 큐
  - `pendingInvestigations`
  - `voteByPlayerId`
  - `finalVoteResult`
  - `endbookVariant`

즉 클라이언트가 로직을 계산하는 구조가 아니라, 서버가 상태를 확정하고 클라이언트는 결과를 소비하는 구조다.

## 5. 진행은 phase 기반 상태머신이다

phase는 `LOBBY + scenario.flow.steps[].id` 조합으로 움직인다.

현재 엔진이 생각하는 기본 진행 방식은 아래와 같다.

- `LOBBY`
- `intro`
- `investigate`
- `discuss`
- `final_vote`
- `endbook`

현재 기본 시나리오는 아래 순서를 사용한다.

- `INTRO`
- `ROUND1_INVESTIGATE`
- `ROUND1_DISCUSS`
- `ROUND2_INVESTIGATE`
- `ROUND2_DISCUSS`
- `FINAL_VOTE`
- `ENDBOOK`

중요한 제약도 있다.

- 타이머는 표시와 만료 여부 계산용이지, 0초가 되어도 자동 진행되지는 않는다.
- phase 전환은 기본적으로 host action으로 이뤄진다.
- `final_vote`는 집계 후 바로 `endbook` 단계로 넘어간다.

## 6. 조사 시스템은 이미 어느 정도 일반화되어 있다

조사 시스템은 단순 버튼 클릭보다 더 일반화되어 있다.

- 조사 대상은 `target` 단위다.
- 대상은 `location`, `character`, `item` 타입을 가질 수 있다.
- 각 target은 `cardPool`을 가진다.
- 단서 중복 방지는 `depletionMode`로 제어한다.
  - `global`
  - `per_target`
- 단서 지급 방식은 `deliveryMode`로 제어한다.
  - `auto`
  - `manual`

현재 등록된 시나리오는 아래 설정을 사용한다.

- `deliveryMode: auto`
- `depletionMode: global`

즉 "조사하면 즉시 랜덤 카드 공개"가 현재 시나리오의 동작이고, 엔진 자체는 "GM 수동 배포"도 이미 지원한다.

## 7. 카드 효과가 게임 상태를 바꾼다

단서는 텍스트만 있는 것이 아니라 효과를 가질 수 있다.

현재 지원되는 카드 효과는 아래 두 가지다.

- `addPart`
  - 뗏목 파츠 공개/누적
- `revealRoleName`
  - 특정 role의 표시 이름 변경

추가로 역할에는 `dynamicDisplayNameRules`가 있어, 특정 카드가 공개됐을 때 이름이 바뀌는 규칙도 있다.

현재 기본 시나리오에서 가이드의 본명이 특정 카드 공개 후 드러나는 방식이 이 규칙을 사용한다.

즉 지금 엔진은 "텍스트 단서 뽑기"를 넘어서 "카드 효과로 상태를 바꾸는" 구조다.

## 8. 소켓 이벤트도 머더미스터리 전용 계약을 가진다

머더미스터리는 공통 room 이벤트 위에 별도 이벤트 세트를 추가했다.

핵심 요청 이벤트는 아래다.

- `mm_get_state`
- `mm_host_start_game`
- `mm_host_next_phase`
- `mm_submit_investigation`
- `mm_host_resolve_investigation`
- `mm_submit_vote`
- `mm_host_finalize_vote`
- `mm_host_broadcast_intro`
- `mm_host_broadcast_endbook`
- `mm_host_reset_game`

핵심 서버 송신 이벤트는 아래다.

- `mm_state_snapshot`
- `mm_part_revealed`
- `mm_announcement`

즉 화면이 여러 이벤트를 조합해 상태를 재구성하는 구조가 아니라, 핵심 상태는 `mm_state_snapshot` 하나가 책임진다.

## 9. UI는 "개인화 스냅샷"을 받는 단일 화면 구조다

플레이어 페이지와 호스트 페이지는 서로 다른 거대한 화면을 따로 두지 않는다.

- 둘 다 `MurderMysteryGameScreen`을 사용한다.
- 차이는 `isHostView` prop이다.
- 서버가 viewer 기준으로 snapshot을 다르게 만들어준다.

스냅샷에는 아래가 이미 포함된다.

- 현재 phase / phaseOrder / 타이머
- 공개 플레이어 목록
- 내 역할 시트
- 내 단서 카드
- 전체 공개 단서 vault
- 파츠 보드
- 조사 가능한 대상과 남은 단서 수
- 최종 투표 상태
- 엔딩북 텍스트
- host panel용 데이터

즉 현재 구조에서 새 UI를 만들 때 핵심 질문은 "새 필드를 클라이언트 state에 둘까?"가 아니라 "snapshot에 무엇을 더 실어야 하나?"가 된다.

## 10. GM 패널과 host/player 모드는 다르다

이 프로젝트는 host와 GM을 완전히 같은 개념으로 두지 않는다.

- host는 항상 방장이다.
- 하지만 `hostParticipatesAsPlayer=false`일 때만 GM 전용 기능을 쓸 수 있다.

정확히는 아래처럼 나뉜다.

- host만 가능
  - 시작
  - 다음 단계 이동
  - 리셋
- host이면서 플레이어 참가 중이 아닐 때만 가능
  - 수동 조사 카드 배포
  - 오프닝 전체 표시
  - 최종 투표 수동 집계
  - 엔딩북 전체 표시

즉 "방장이 플레이어로도 참가하는 머더미스터리"는 지원하지만, 그 경우 일부 GM 기능은 잠긴다.

## 11. 현재 기본 시나리오의 구현 성격

현재 기본 시나리오는 아래 성격을 가진다.

- 플레이 인원 5명 고정
- 2회 조사 + 2회 토론 + 최종 투표
- 파츠 5개를 단서 카드 효과로 공개
- 한 역할은 `isKiller: true`
- 최종 투표는 단일 정답 role을 맞히는 구조
- 엔딩은 `matched / notMatched` 2갈래
- 가이드 역할은 카드 공개 시 표시 이름이 바뀌는 연출 포함

즉 "서사형 머더미스터리 + 제한된 수의 조사 라운드 + 단일 범인 지목 + 분기 엔딩"에 최적화된 현재형이다.

## 12. 프롬프트를 만들 때 꼭 알아야 할 한계

머더미스터리 엔진이 일반화되어 있긴 하지만, 완전히 무한 확장형은 아니다.

현재 코드 기준으로 특히 주의할 점은 아래다.

- `investigationsPerRound` 필드는 스키마에 있지만 런타임은 사실상 플레이어당 라운드별 1회 조사에 맞춰져 있다.
- `partsAutoReveal`, `noEliminationDuringGame`도 스키마에는 있지만 현재 엔진 전반이 그 분기를 깊게 활용하는 구조는 아니다.
- 최종 투표는 "정답 role 하나"를 맞히는 모델이다.
- 엔딩도 기본적으로 `matched / notMatched` 2분기다.

즉 아래 같은 요구는 "시나리오 데이터 추가"가 아니라 "엔진 확장"으로 프롬프트를 써야 한다.

- 한 라운드에 2회 이상 조사
- 플레이어 탈락/격리의 실제 진행 로직
- 여러 정답 role 또는 복수 범인
- 엔딩 3개 이상 분기
- 투표 후 추가 phase 재진입

## 13. GPT가 Codex에게 머더미스터리 작업을 시킬 때 좋은 표현

새 시나리오 추가라면 이렇게 지시하는 편이 맞다.

- `기존 murder mystery 엔진을 유지하고, 새 시나리오 데이터와 registry 연결만 추가해줘.`
- `scenario schema와 smoke test를 통과하는 형태로 작성해줘.`

엔진 확장이라면 이렇게 지시하는 편이 맞다.

- `현재 머더미스터리는 1라운드 1조사 가정이 강하니, 이것을 N회 조사로 일반화하는 엔진 변경으로 접근해줘.`
- `scenario file만으로 해결하려 하지 말고 state machine, snapshot, host panel 영향까지 같이 검토해줘.`

UI 변경이라면 이렇게 지시하는 편이 맞다.

- `MurderMysteryGameScreen은 snapshot 소비형 단일 화면이므로, 로컬 state 추가보다 snapshot 기반 표시를 우선 검토해줘.`

정리하면, 현재 머더미스터리는 "새 이야기 데이터를 꽂아 넣을 수 있는 시나리오 엔진"이지만, 동시에 "몇 가지 룰은 아직 특정 게임 흐름에 맞춰 반일반화된 상태"다.
