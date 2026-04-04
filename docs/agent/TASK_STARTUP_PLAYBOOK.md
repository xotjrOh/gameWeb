# Task Startup Playbook

이 문서는 "이 작업이면 어떤 파일부터 읽어야 하나"를 빠르게 고르기 위한 시작 가이드다.

## Ground Rules

- 문서보다 현재 소스가 진실원이다.
- 편집 전에 "직접 수정할 파일"과 "인접 패턴 파일"을 같이 읽는다.
- 실시간 흐름 작업은 타입만 보지 말고 클라이언트 진입점과 서버 핸들러를 같이 본다.

## 1. 로비 / 방 생성 / 입장 / 재입장

- 먼저 읽기
  - [package.json](/c:/Users/xotjr/Desktop/react/next-game-web/package.json)
  - [src/lib/gameCatalog.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/lib/gameCatalog.ts)
  - [src/types/socket.d.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/types/socket.d.ts)
  - [src/types/room.d.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/types/room.d.ts)
  - [src/components/provider/SocketProvider.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/provider/SocketProvider.tsx)
  - [src/components/GameRooms.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/GameRooms.tsx)
  - [src/components/RoomModal.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/RoomModal.tsx)
  - [src/pages/api/socket/handlers/commonHandler.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/handlers/commonHandler.ts)
  - [src/pages/api/socket/services/commonService.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/services/commonService.ts)
  - [src/pages/api/socket/io.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/io.ts)
- 이 작업에서는 [docs/agent/contracts/ROOM_SOCKET_CONTRACT.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/contracts/ROOM_SOCKET_CONTRACT.md)를 같이 본다.
- 권장 검증
  - `yarn check:socket`
  - provider/io/middleware까지 바꾸면 `yarn check:full`

## 2. 방 내부 페이지 진입 / host 가드 / 새로고침 복구

- 먼저 읽기
  - 해당 게임의 `src/app/<game>/[roomId]/page.tsx`
  - 해당 게임의 `src/app/<game>/[roomId]/host/page.tsx`
  - [src/hooks/useRedirectIfInvalidRoom.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useRedirectIfInvalidRoom.ts)
  - [src/hooks/useRedirectIfNotHost.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useRedirectIfNotHost.ts)
  - [src/hooks/useUpdateSocketId.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useUpdateSocketId.ts)
  - [src/hooks/useLeaveRoom.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useLeaveRoom.ts)
  - [src/hooks/useCheckVersion.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useCheckVersion.ts)
- 실시간 작업이 섞이면 위 1번 세트로 확장한다.
- 권장 검증
  - `yarn check:fast`
  - 재입장/가드가 바뀌면 `yarn check:socket`

## 3. 게임별 실시간 로직

- 먼저 읽기
  - 해당 게임의 page/host page
  - 해당 게임용 `use<Game>GameData` 훅
  - 해당 게임 handler
  - 해당 게임 service
  - 해당 게임 타입 선언
- 예시
  - horse: [src/app/horse/[roomId]/page.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/app/horse/[roomId]/page.tsx), [src/hooks/useHorseGameData.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useHorseGameData.ts), [src/pages/api/socket/handlers/horseGameHandler.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/handlers/horseGameHandler.ts), [src/pages/api/socket/services/horseGameService.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/services/horseGameService.ts)
- 권장 검증
  - `yarn check:fast`
  - 공용 room/socket 계약을 건드렸으면 `yarn check:socket`

## 4. 머더미스터리 데이터 / 상태머신 / 화면

- 먼저 읽기
  - [data/murder-mystery/registry.json](/c:/Users/xotjr/Desktop/react/next-game-web/data/murder-mystery/registry.json)
  - [data/murder-mystery/SCENARIO_AUTHORING.md](/c:/Users/xotjr/Desktop/react/next-game-web/data/murder-mystery/SCENARIO_AUTHORING.md)
  - [src/pages/api/socket/services/murderMysteryScenarioService.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/services/murderMysteryScenarioService.ts)
  - [src/pages/api/socket/services/murderMysteryValidation.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/services/murderMysteryValidation.ts)
  - [src/pages/api/socket/services/murderMysteryStateMachine.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/services/murderMysteryStateMachine.ts)
  - [src/components/murderMystery/MurderMysteryGameScreen.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/murderMystery/MurderMysteryGameScreen.tsx)
  - [src/hooks/useMurderMysteryGameData.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useMurderMysteryGameData.ts)
  - [scripts/murder-mystery-scenario-smoke.mjs](/c:/Users/xotjr/Desktop/react/next-game-web/scripts/murder-mystery-scenario-smoke.mjs)
  - [scripts/socket-room-flow-smoke.cjs](/c:/Users/xotjr/Desktop/react/next-game-web/scripts/socket-room-flow-smoke.cjs)
- 권장 검증
  - `yarn check:murder`
  - 공용 provider/socket 변경이 섞이면 `yarn check:full`

## 5. 인증 / 미들웨어 / 공개 경로

- 먼저 읽기
  - [src/middleware.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/middleware.ts)
  - [src/lib/authOptions.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/lib/authOptions.ts)
  - [src/app/api/auth/[...nextauth]/route.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/app/api/auth/[...nextauth]/route.ts)
  - [src/app/layout.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/app/layout.tsx)
  - [src/app/page.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/app/page.tsx)
- 권장 검증
  - `yarn check:fast`
  - 경로/provider/env가 바뀌면 `yarn check:full`

## 6. 게임 카탈로그 / 랭킹 / 공용 레지스트리

- 먼저 읽기
  - [src/lib/gameCatalog.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/lib/gameCatalog.ts)
  - [src/pages/api/rankings.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/rankings.ts)
  - [src/pages/api/socket/state/leaderboardState.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/state/leaderboardState.ts)
  - [src/app/rankings/page.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/app/rankings/page.tsx)
  - 필요 시 [src/types/room.d.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/types/room.d.ts)
- 권장 검증
  - `yarn check:fast`
  - 새 게임 추가나 cross-cutting 변경이면 `yarn check:full`
