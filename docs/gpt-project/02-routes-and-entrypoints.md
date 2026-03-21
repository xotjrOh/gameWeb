# Routes And Entrypoints

이 프로젝트의 URL 구조는 비교적 규칙적이다. GPT가 Codex 프롬프트를 쓸 때 가장 먼저 지정하면 좋은 정보도 이 라우트 패턴이다.

핵심 화면 라우트는 아래와 같다.

- `/`
  - 메인 로비
  - 방 목록 조회, 방 생성, 방 입장 시작점
- `/games/<gameId>`
  - 각 게임의 규칙/소개 페이지
- `/<gameId>/<roomId>`
  - 플레이어용 실제 게임 방 화면
- `/<gameId>/<roomId>/host`
  - 호스트용 실제 게임 방 화면
- `/rankings`
  - 게임별 랭킹 화면
- `/auth/signin`
- `/auth/error`
- `/auth/popup`
- `/auth/popup/callback`

핵심 API 엔드포인트는 아래와 같다.

- `/api/socket/io`
  - Socket.IO 서버 엔드포인트
- `/api/version`
  - 현재 서버 버전 반환
- `/api/rankings`
  - 게임별 랭킹 조회
- `/api/murder-mystery/scenarios`
  - 머더미스터리 시나리오 카탈로그 조회
- `/api/auth/[...nextauth]`
  - NextAuth 엔드포인트

주요 진입 컴포넌트/파일은 아래와 같다.

- `src/app/layout.tsx`
  - 전체 provider 체인 진입점
- `src/app/page.tsx`
  - 로비 페이지
- `src/components/header/Header.tsx`
  - 공통 헤더
- `src/components/GameRooms.tsx`
  - 로비 방 목록, 입장, 방 생성 시작점
- `src/components/provider/SocketProvider.tsx`
  - 클라이언트 소켓 생명주기 관리

게임 ID와 라우트는 `src/lib/gameCatalog.ts`의 값과 맞물린다.

- 새 게임을 추가하거나 제거하는 작업은 보통 `gameCatalog`, 규칙 페이지, 플레이어/호스트 room page, 서버 handler/service/state, 필요시 랭킹까지 같이 본다.
- 단순 UI 변경이라도 대상이 `rule page`인지 `room page`인지 먼저 구분해야 한다.

Codex 프롬프트에 넣기 좋은 표현 예시는 아래와 같다.

- `대상 라우트는 /animal/[roomId] 와 /animal/[roomId]/host 이다.`
- `룰 페이지(/games/jamo)가 아니라 실제 게임방 페이지를 수정해야 한다.`
- `로비(/)의 방 목록과 방 입장 흐름만 수정하고, 실제 방 화면은 건드리지 않는다.`
