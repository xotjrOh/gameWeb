# Realtime Architecture

이 프로젝트의 실시간 축은 "클라이언트 SocketProvider + 서버 Socket.IO 엔드포인트 + 게임별 handler/service/state" 조합이다.

안정 구조는 아래와 같다.

- 클라이언트 소켓 생성과 연결 관리는 `src/components/provider/SocketProvider.tsx`
- 서버 Socket.IO 진입점은 `src/pages/api/socket/io.ts`
- 공통 방 이벤트는 `src/pages/api/socket/handlers/commonHandler.ts`
- 게임별 로직은 `src/pages/api/socket/handlers/*`, `services/*`, `state/*`

중요한 구조적 사실은 아래다.

- Socket.IO 서버는 App Router route handler가 아니라 `pages/api` 쪽에 있다.
- 공통 이벤트와 게임별 이벤트가 타입으로 합쳐져 있다.
- 이벤트 이름 계약은 `src/types/socket.d.ts`와 각 게임 타입 파일이 중심이다.

공통 이벤트 계약은 대체로 아래를 기준으로 생각하면 된다.

- client to server
  - `get-room-list`
  - `check-room`
  - `check-room-host`
  - `create-room`
  - `check-can-join-room`
  - `join-room`
  - `leave-room`
  - `update-socket-id`
- server to client
  - `room-updated`
  - `room-closed`
  - `server-version`

입장과 재입장 흐름에서 중요한 점은 아래다.

- 바로 `join-room`만 보는 것보다 `check-can-join-room`을 먼저 봐야 한다.
- 재입장 여부는 ACK payload의 `reEnter`, `host` 값이 말해준다.
- 클라이언트는 이 결과에 따라 플레이어 경로 또는 호스트 경로로 라우팅한다.
- 입장 자체는 ACK 기반이므로, 이벤트 fire-and-forget으로 바꾸면 안 된다.

버전 감시와 소켓 교체도 현재 구조의 일부다.

- `/api/version`이 현재 서버 버전을 돌려준다.
- 클라이언트에는 `useCheckVersion`이 있다.
- 강제 새로고침이 아니라 "소켓만 교체"하는 경로도 있다.
- 관련 동작은 환경 플래그로 켜고 끈다.

디버그/실험 플래그가 있더라도, GPT는 아래 원칙으로 Codex 프롬프트를 쓰는 편이 안전하다.

- 기본 동작과 플래그 동작을 구분해서 설명한다.
- 소켓 문제는 항상 `SocketProvider`, `io.ts`, `commonHandler`, 관련 room page/hook을 함께 보라고 한다.
- 이벤트 이름이나 ACK 시그니처를 바꾸는 작업은 타입 파일도 같이 수정하라고 명시한다.

머더미스터리는 다른 게임보다 데이터 주도적이다.

- 시나리오 데이터가 `data/murder-mystery/`에 있다.
- 서비스가 시나리오를 읽어 스냅샷을 만든다.
- 상태 송신은 개별 필드보다 `mm_state_snapshot` 같은 스냅샷 이벤트가 중요하다.

즉, GPT가 Codex에게 `UI만 고쳐줘`라고 말하더라도 대상이 머더미스터리면 데이터/스냅샷 계약 확인을 함께 요구하는 편이 낫다.
