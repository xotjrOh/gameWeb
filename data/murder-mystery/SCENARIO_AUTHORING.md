# Murder Mystery Scenario Authoring

## Quick Start

1. `data/murder-mystery/scenarios/_template.yaml`을 복사해 새 파일을 만듭니다.
2. `registry.json`에 `{ "id": "...", "file": "...yaml" }` 1줄을 추가합니다.
3. `yarn test:murder`를 실행해 참조/flow 오류를 확인합니다.
4. `yarn exec tsc --noEmit` + `yarn lint`를 통과하면 반영 완료입니다.

## Flow (단계/시간/전환 지문)

- `flow.steps`가 실제 진행 탭/스텝퍼를 결정합니다.
- 필수 kind: `intro`, `final_vote`, `endbook`.
- 조사/토론 단계는 `kind: investigate|discuss` + `round`를 반드시 넣습니다.
- `durationSec`은 타이머 기본값입니다. 0초가 되어도 자동 진행되지 않습니다.
- `enterAnnouncement`를 주면 해당 단계 진입 시 전체 시스템 로그/배너로 표시됩니다.

## Investigations (엔티티/소진 규칙)

- 조사 대상은 `targets[]`로 통일됩니다. 장소/인물/소지품 모두 같은 구조입니다.
- `entityKey`는 동일 인물을 여러 라운드에서 일관되게 식별할 때 사용합니다.
- 맵 조사 UX를 쓰려면 `investigations.turnOrder.roleIds`를 역할 ID 전체 순서로 넣어야 합니다.
- `rotateFirstPlayerEachRound: true`면 조사 라운드마다 선플레이어가 한 칸씩 회전합니다.
- `depletionMode`
  - `global`: 공개된 카드는 전역에서 다시 나오지 않음
  - `per_target`: 대상별로만 중복 방지

## Map Layout (조사 화면 배치)

- `investigations.layout.sections`로 섹션 제목/순서/아이콘을 지정할 수 있습니다.
- `targetTypes` 또는 `targetIds`로 섹션 포함 대상을 제어합니다.
- 지정이 없으면 기본 섹션(장소/인물/소지품)이 자동 생성됩니다.
- `investigations.layout.map.scene`에 맵 이미지 경로와 기준 크기(`width`, `height`)를 넣습니다.
- `investigations.layout.map.hotspots`는 `targetId` + 퍼센트 좌표(`xPct`, `yPct`, `widthPct`, `heightPct`)를 사용합니다.
- 맵 조사 모드는 `deliveryMode: auto`에서만 지원합니다.

## Card Backs (뒷면 카드 / 예약)

- 맵 조사 대상은 각 카드에 `backId`가 필요합니다. 같은 시나리오 안에서 중복되면 안 됩니다.
- 대상 단위 기본 뒷면은 `target.cardBack.imageSrc` / `target.cardBack.shortLabel`로 지정할 수 있습니다.
- 카드별 오버라이드는 `card.back.imageSrc` / `card.back.shortLabel`로 지정합니다.
- 플레이어는 `backId`를 기준으로 예약/획득하므로, author는 사람이 읽기 쉬운 짧은 slug를 권장합니다.

## Parts / Spoiler Safety

- 플레이어 화면은 기본적으로 파츠 카운터만 노출합니다.
- `rules.partsPublicDetail: false`를 기본값으로 유지하세요.
- 진행자 상세 확인은 진행자 화면에서만 허용됩니다.
