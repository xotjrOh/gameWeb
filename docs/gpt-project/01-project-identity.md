# Project Identity

이 프로젝트는 "오프라인으로 함께 모여 진행하는 게임"을 웹이 보조하는 실시간 게임 플랫폼이다.

핵심 정체성은 아래와 같다.

- Next.js 기반의 단일 저장소다.
- 프론트엔드와 서버 로직이 같은 프로젝트 안에 있다.
- 실시간 동기화는 Socket.IO가 맡는다.
- 인증은 NextAuth가 맡는다.
- 영속 DB는 사용하지 않는다.
- 방 상태는 서버 메모리에 존재한다.
- 랭킹은 파일(`data/leaderboard.json`)에 저장된다.
- 머더미스터리 시나리오는 `data/murder-mystery/` 아래의 데이터 파일로 관리된다.

기술/운영 축은 아래가 중요하다.

- React 18
- TypeScript
- MUI
- Redux Toolkit
- Socket.IO
- NextAuth
- Yarn Berry PnP
- Node 20 계열

이 저장소의 중요한 구조적 특징은 "App Router와 legacy pages API가 함께 존재한다"는 점이다.

- 화면 라우팅과 일부 route handler는 `src/app/` 아래에 있다.
- Socket.IO 서버 엔드포인트는 `src/pages/api/socket/io.ts`에 있다.

즉, GPT가 이 프로젝트를 설명할 때는 "완전한 App Router-only 구조"라고 가정하면 안 된다.

게임 ID는 아래 5개가 기준이다.

- `horse`
- `shuffle`
- `animal`
- `jamo`
- `murder_mystery`

이 값들은 화면 라우트, 방 생성 타입, 랭킹 선택, 서버 상태 타입에서 공통 언어처럼 쓰인다.

인증/접근 제어에 대한 안정 사실도 있다.

- 로그인은 Kakao, Google OAuth를 사용한다.
- 세션 기반으로 유저 식별을 한다.
- 실시간 재입장 판정도 기본적으로 `sessionId` 기준이다.
- 접근 제어는 `src/middleware.ts`가 중앙에서 처리한다.

프롬프트 작성 시 유효한 기본 가정은 아래와 같다.

- 새 기능을 추가해도 "DB가 없는 메모리 기반 방 상태"는 유지된다.
- 실시간 방/게임 흐름을 바꾸는 작업은 대개 `SocketProvider`, `pages/api/socket`, 게임별 handler/service/state를 함께 봐야 한다.
- 인증 변경은 `authOptions`, `/api/auth/[...nextauth]`, `middleware.ts`, 화면 리다이렉트 훅까지 같이 확인해야 한다.
