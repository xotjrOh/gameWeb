# Murder Mystery Scenario Authoring

## Quick Start

1. 트릭/진상/범행 수단을 먼저 설계한다면 아래 `Fair-Play Trick Gate`를 통과시킨 뒤 YAML을 작성합니다.
2. `data/murder-mystery/scenarios/_template.yaml`을 복사해 새 파일을 만듭니다.
3. `registry.json`에 `{ "id": "...", "file": "...yaml" }` 1줄을 추가합니다.
4. `yarn test:murder`를 실행해 참조/flow 오류를 확인합니다.
5. `yarn exec tsc --noEmit` + `yarn lint`를 통과하면 반영 완료입니다.

## Fair-Play Trick Gate

새 머더미스터리의 트릭, 알리바이, 정체 반전, 범행 수단은 [MURDER_MYSTERY_GENRE_GUIDE.md](../../docs/agent/context/MURDER_MYSTERY_GENRE_GUIDE.md)의 `Knox Fair-Play Gate For Tricks`를 반드시 통과해야 합니다.

작성 시 아래를 먼저 고정합니다.

- `진범/정답 후보`: 초반 공개 지문, 역할 시트, 조사 대상 중 어디에 처음 등장하는가?
- `수단/기회`: 플레이어가 조사 카드나 역할 발화로 어떻게 추론할 수 있는가?
- `미끼`: 어떤 단서가 다른 인물을 합리적으로 의심하게 만드는가?
- `반증`: 그 미끼를 어떤 추가 단서나 대화로 빠져나올 수 있는가?
- `공개 내성`: 핵심 단서가 전체 공개되어도 바로 정답표가 되지 않고, 토론/밀담에서 다툴 여지가 있는가?

금지합니다.

- 후반에 처음 나온 인물/물건/전문지식/초자연 규칙으로 정답을 성립시키기.
- 엔딩북에서 새 증거를 꺼내 정답을 처음 가능하게 만들기.
- 비밀 통로, 대역, 변장, 기억 결손, 특수 약물 같은 트릭을 사전 단서 없이 쓰기.
- 플레이어의 비공개 지문이나 GM 권한으로만 핵심 진실을 봉인하기.
- 원문 녹스 10계의 차별적 표현을 반복하거나, 문화/정체성/직업 편견을 수상함의 근거로 쓰기.

## Flow (단계/시간/전환 지문)

- `flow.steps`가 실제 진행 탭/스텝퍼를 결정합니다.
- 필수 kind: `intro`, `final_vote`, `endbook`.
- 최종 지목 후 역할별 추가 선택이 필요하면 `kind: ending_choice` 단계를 `final_vote`와 `endbook` 사이에 둡니다.
- 조사/토론 단계는 `kind: investigate|discuss` + `round`를 반드시 넣습니다.
- `durationSec`은 타이머 기본값입니다. 0초가 되어도 자동 진행되지 않습니다.
- `enterAnnouncement`를 주면 해당 단계 진입 시 전체 시스템 로그/배너로 표시됩니다.

## Investigations (엔티티/소진 규칙)

- 조사 대상은 `targets[]`로 통일됩니다. 장소/인물/소지품 모두 같은 구조입니다.
- 기본 조사 횟수는 `rules.investigationsPerRound`이며, 특정 라운드만 다르게 하려면 `investigations.rounds[].investigationsPerPlayer`를 둡니다.
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

## Ending Choices / Endbook

- `endingChoices[]`는 최종 지목 뒤 특정 역할에게 열리는 선택지입니다.
- `endingChoices[].opensWhen.finalVoteOptionId`로 특정 최종 지목 결과에서만 선택지를 열 수 있습니다.
- `endbook.variants[]`는 위에서 아래 순서로 조건을 검사해 하나의 완성 엔딩을 고릅니다.
- `endbook.sections[]`는 위에서 아래 순서로 조건에 맞는 섹션을 모두 붙여 하나의 엔딩을 조립합니다. 공통 진상 + 역할별 선택 결과처럼 독립 조각을 합쳐야 할 때 사용합니다.
- `endbook.variants[].when.choices`와 `endbook.sections[].when.choices`에는 `endingChoiceId: optionId` 형태로 엔딩 조건을 적습니다.
- `endbook.sections[].when`이 없으면 항상 포함됩니다. 매칭된 섹션 중 뒤쪽의 `title`이 최종 표시값이 되며, 없으면 `endbook.title`을 사용합니다.
- 엔딩의 마지막 문구까지 `body`에 직접 적습니다. 별도 마무리 줄 필드는 사용하지 않습니다.
- 개인 비밀 제출/채점 단계는 더 이상 사용하지 않습니다.

## Writing References

- 장르 흐름, 조사전 지문, 조사/회의/밀담/투표/엔딩, 흔한 기믹을 판단할 때는 [MURDER_MYSTERY_GENRE_GUIDE.md](../../docs/agent/context/MURDER_MYSTERY_GENRE_GUIDE.md)를 먼저 읽습니다.
- 서사 전개, 반전 배치, 복선 회수, 감정적 진상 공개를 설계할 때는 [STORY_REVEAL_PACING_REFERENCE.md](../../docs/agent/context/STORY_REVEAL_PACING_REFERENCE.md)를 참고합니다.
- `rabbit-turtle-finish-line-night` 엔딩 본문, 단서 모달, 후반 Q&A, 캐릭터별 해설을 쓰거나 고칠 때는 [WRITING_REFERENCE_ENDING_RABBIT_TURTLE.md](./WRITING_REFERENCE_ENDING_RABBIT_TURTLE.md)를 우선 적용합니다.
- 가담항설식 가치관 충돌, 대사 리듬, 구원/복수 분기 설계는 [WRITING_REFERENCE_GADAMHANGSEOL.md](./WRITING_REFERENCE_GADAMHANGSEOL.md)를 참고합니다.
- 시나리오 문장, 선택지, 엔딩 본문을 첨삭할 때는 [WRITING_REFERENCE_REVISION.md](./WRITING_REFERENCE_REVISION.md)를 참고합니다.
