# Prompting Codex

이 문서는 GPT가 Codex에게 "이 저장소에서 실제로 바로 쓸 수 있는 프롬프트"를 쓰기 쉽게 만들기 위한 가이드다.

가장 중요한 원칙은 아래 두 가지다.

- 구조 설명은 이 문서로 주고, 정확한 구현은 Codex가 로컬 파일을 다시 읽게 한다.
- 작업 범위를 라우트, 게임, 계층, 이벤트 계약 단위로 잘라서 지시한다.

좋은 프롬프트의 최소 구성은 아래다.

1. 사용자 목표
2. 대상 게임 ID
3. 대상 URL 또는 페이지 종류
4. 수정해야 할 계층
5. 깨지면 안 되는 불변 조건
6. 확인해야 할 파일 힌트
7. 원하는 검증 방법

계층을 지정할 때 쓰는 언어는 아래가 잘 맞는다.

- 화면만
  - `app page`, `component`, `styles`, `rule page`
- 클라이언트 흐름
  - `hook`, `provider`, `redirect`, `loading`
- 실시간 로직
  - `socket handler`, `socket service`, `socket state`, `event types`
- 인증/접근
  - `middleware`, `authOptions`, `auth route`
- 데이터/콘텐츠
  - `data file`, `scenario`, `catalog`, `constants`

Codex에게 자주 같이 전달하면 좋은 불변 조건은 아래다.

- DB를 도입하지 말 것
- `gameCatalog`의 게임 ID 체계를 함부로 바꾸지 말 것
- Socket.IO 엔드포인트가 `pages/api/socket/io.ts`에 있다는 구조를 유지할 것
- 재입장 판정의 중심이 `sessionId`라는 점을 보존할 것
- ACK 기반 이벤트는 ACK 시그니처를 유지할 것
- 플래그가 있는 동작은 기본값을 바꾸지 말고 플래그 뒤에 둘 것

프롬프트 템플릿 1: UI 수정

```md
목표: /games/animal 규칙 페이지의 설명 문구와 배치를 다듬고 싶다.
제약: 실제 게임방 라우트(/animal/[roomId], /animal/[roomId]/host)는 건드리지 말 것.
먼저 확인할 파일: src/app/games/animal/page.tsx, 관련 공용 컴포넌트
요구: 기존 프로젝트 스타일을 유지하면서 수정하고, 변경 후 영향 범위를 짧게 설명해줘.
```

프롬프트 템플릿 2: 소켓 버그

```md
목표: join-room ACK 지연 원인을 추적하거나 수정하고 싶다.
대상: 로비 입장 흐름과 공통 소켓 이벤트
먼저 확인할 파일: src/components/GameRooms.tsx, src/components/provider/SocketProvider.tsx, src/pages/api/socket/io.ts, src/pages/api/socket/handlers/commonHandler.ts, src/types/socket.d.ts
제약: ACK 기반 계약과 sessionId 기반 재입장 로직은 유지할 것.
요구: 원인 분석 후 필요한 코드만 수정하고, 검증 방법까지 제시해줘.
```

프롬프트 템플릿 3: 새 게임/기능 확장

```md
목표: 기존 패턴을 따라 게임 카탈로그/룰 페이지/랭킹 연결부를 확장하고 싶다.
먼저 확인할 파일: src/lib/gameCatalog.ts, src/app/games/*, src/app/page.tsx, src/pages/api/rankings.ts, 관련 타입 파일
제약: 기존 gameId 체계와 라우트 패턴을 유지할 것.
요구: 어떤 파일을 함께 바꿔야 하는지 먼저 확인한 뒤 구현해줘.
```

프롬프트 템플릿 4: 인증/접근 제어

```md
목표: 특정 페이지 접근 정책을 조정하고 싶다.
먼저 확인할 파일: src/middleware.ts, src/lib/authOptions.ts, src/app/api/auth/[...nextauth]/route.ts, 대상 페이지
제약: 로그인 플로우와 callbackUrl 흐름을 깨지 말 것.
요구: 현재 예외 경로를 먼저 확인하고 필요한 최소 수정만 해줘.
```

마지막으로, GPT는 Codex에게 아래 문장을 자주 붙이는 것이 좋다.

`관련 파일을 먼저 읽어 현재 구현과 문서 간 차이를 스스로 보정한 뒤 수정해줘.`
