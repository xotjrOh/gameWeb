# Architecture Map

이 문서는 이 저장소에서 "어디를 읽어야 기존 패턴을 맞출 수 있는지" 빠르게 찾기 위한 지도다.

## Top-Level Layout

- `src/app`
  - App Router 페이지와 API route가 있다.
  - 게임 소개 페이지, 게임방 페이지, 인증 페이지, `/api/version`, 머더미스터리 시나리오 API가 여기에 있다.
- `src/pages/api`
  - Socket.IO 서버 엔드포인트와 랭킹 API가 있다.
  - 실시간 서버는 [src/pages/api/socket/io.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/io.ts)에 붙는다.
  - 현재 구조상 `src/pages/api/socket/handlers|services|state|utils` 아래 파일도 build route tree에 잡히므로 "사설 모듈"이라고 단정하지 않는다.
- `src/components`
  - 공용 UI와 게임별 컴포넌트가 있다.
  - 전역 provider는 `src/components/provider`에 모여 있다.
- `src/hooks`
  - 리디렉션, 게임 데이터, 버전 체크, leave-room 같은 클라이언트 흐름이 있다.
- `src/lib`
  - 게임 카탈로그, 인증 설정, 정적 유틸이 있다.
- `src/types`
  - 게임별 타입과 소켓 이벤트 계약이 있다.
- `data/murder-mystery`
  - 시나리오 레지스트리와 콘텐츠 원본이 있다.

## Stable Cross-Cutting Rules

- 메인 UI는 App Router를 쓰지만 Socket.IO 서버는 Pages API에 남아 있다.
- 전역 provider 체인은 [src/app/layout.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/app/layout.tsx) 기준으로 유지한다.
- 게임 ID의 진실원은 [src/lib/gameCatalog.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/lib/gameCatalog.ts)다.
- Socket 이벤트 타입과 ACK 계약은 [src/types/socket.d.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/types/socket.d.ts)를 먼저 본다.
- 실시간 입장/재입장 작업은 [docs/agent/contracts/ROOM_SOCKET_CONTRACT.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/contracts/ROOM_SOCKET_CONTRACT.md)까지 같이 봐야 흐름이 닫힌다.

## Where To Copy Patterns From

- 새 게임 소개/룰 페이지
  - `src/app/games/*/page.tsx`
- 실제 게임방 페이지
  - `src/app/<game>/[roomId]/page.tsx`
  - `src/app/<game>/[roomId]/host/page.tsx`
- 로비 및 방 입장 흐름
  - [src/components/GameRooms.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/GameRooms.tsx)
  - [src/components/RoomModal.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/RoomModal.tsx)
  - [src/components/provider/SocketProvider.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/provider/SocketProvider.tsx)
- 실시간 서버 처리
  - [src/pages/api/socket/io.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/io.ts)
  - `src/pages/api/socket/handlers/*`
  - `src/pages/api/socket/services/*`
  - `src/pages/api/socket/state/*`
- 머더미스터리 데이터/엔진
  - [data/murder-mystery/registry.json](/c:/Users/xotjr/Desktop/react/next-game-web/data/murder-mystery/registry.json)
  - [data/murder-mystery/SCENARIO_AUTHORING.md](/c:/Users/xotjr/Desktop/react/next-game-web/data/murder-mystery/SCENARIO_AUTHORING.md)
  - `src/pages/api/socket/services/murderMystery*`
  - `src/hooks/useMurderMysteryGameData.ts`
  - `src/components/murderMystery/*`

## Pattern Checks By Area

- 화면 수정
  - 같은 게임의 `page.tsx`, 공용 컴포넌트, `globals.css` 사용 방식을 먼저 본다.
- provider/hook 수정
  - 기존 effect 의존성, `useAppDispatch`, alias import, 상태 업데이트 패턴을 먼저 맞춘다.
- socket 수정
  - `io.ts` -> `types/socket.d.ts` -> 해당 handler/service/state 순서로 읽는다.
- 시나리오 데이터 수정
  - `registry.json`과 `_template.yaml`, `SCENARIO_AUTHORING.md`를 함께 본다.

## Validation Entry Points

- 타입/린트 검증은 루트 `package.json` 스크립트를 따른다.
- 머더미스터리 데이터는 `yarn test:murder`가 가장 먼저 깨지는 안전장치다.
