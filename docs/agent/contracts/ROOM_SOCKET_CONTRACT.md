# Room And Socket Contract

이 문서는 로비, 방 입장, 재입장, 방 종료 흐름에서 유지해야 할 계약을 짧게 고정한다.

## Source Of Truth

- 게임 ID
  - [src/lib/gameCatalog.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/lib/gameCatalog.ts)
- 공용 room 타입
  - [src/types/room.d.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/types/room.d.ts)
- 공용 socket 이벤트/ACK 타입
  - [src/types/socket.d.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/types/socket.d.ts)
- 서버 room 상태 저장소
  - [src/pages/api/socket/state/gameState.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/state/gameState.ts)
- 서버 공용 흐름
  - [src/pages/api/socket/handlers/commonHandler.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/handlers/commonHandler.ts)
  - [src/pages/api/socket/services/commonService.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/services/commonService.ts)
- 클라이언트 로비/provider 흐름
  - [src/components/provider/SocketProvider.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/provider/SocketProvider.tsx)
  - [src/components/GameRooms.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/GameRooms.tsx)
  - [src/components/RoomModal.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/RoomModal.tsx)

## Stable Meanings

- `sessionId`
  - 재연결 전후에도 유지되는 사용자 식별자다.
  - 재입장 판단, host 판정, room membership 검증 기준이다.
- `socketId`
  - 연결마다 바뀌는 transport 식별자다.
  - `update-socket-id` 또는 재입장 처리에서 갱신된다.
- `room.players`
  - 일반 게임에서는 host를 포함하지 않는다.
  - `murder_mystery`만 `hostParticipatesAsPlayer`일 때 host가 player 배열에도 들어갈 수 있다.
- `room-updated`
  - 로비 상태 동기화의 표준 이벤트다.

## End-To-End Flow

### 1. 기본 연결

- 클라이언트는 [SocketProvider.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/provider/SocketProvider.tsx)에서 소켓을 만들고 connect 시 `get-room-list`를 보낸다.
- 서버는 [io.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/io.ts)에서 공용/game별 handler를 붙인다.

### 2. 방 생성

- [RoomModal.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/RoomModal.tsx)에서 `create-room` ACK를 기다린다.
- 서버는 [commonHandler.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/handlers/commonHandler.ts) 안 `buildRoom`과 validation을 거쳐 room을 만든다.
- 성공 시 host는 `/<gameType>/<roomId>/host`로 이동한다.

### 3. 일반 입장

- 로비 클릭 시 [GameRooms.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/GameRooms.tsx)에서 먼저 `check-can-join-room`을 보낸다.
- 서버는 아래 순서를 유지한다.
  - `validateRoom`
  - `validateAlreadyJoinOtherRoom`
  - `handlePlayerReconnect`
  - `validateRoomFull`
  - `validateGameAlreadyStarted`
- 여기서 `reEnter`가 아니면 그 다음에만 `join-room` ACK를 보낸다.

### 4. 재입장

- 재입장 판단은 `join-room`이 아니라 `check-can-join-room`에서 한다.
- [commonService.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/services/commonService.ts)의 `handlePlayerReconnect`가 `socketId`를 바꾸고 socket을 room에 다시 join시킨다.
- 이 순서를 바꾸면 로비 재입장, host direct route, 새로고침 복구가 어긋난다.

### 5. 방 페이지 진입

- 일반 player page는 `useRedirectIfInvalidRoom`, host page는 `useRedirectIfNotHost`를 사용한다.
- 두 경로 모두 `useUpdateSocketId`, `useLeaveRoom`, `useCheckVersion` 흐름을 같이 본다.
- 사용 파일
  - [src/hooks/useRedirectIfInvalidRoom.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useRedirectIfInvalidRoom.ts)
  - [src/hooks/useRedirectIfNotHost.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useRedirectIfNotHost.ts)
  - [src/hooks/useUpdateSocketId.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useUpdateSocketId.ts)
  - [src/hooks/useLeaveRoom.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useLeaveRoom.ts)
  - [src/hooks/useCheckVersion.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useCheckVersion.ts)

### 6. 방 종료

- `leave-room`은 host만 호출할 수 있고, 게임 중(`IN_PROGRESS`)에는 닫지 못한다.
- 서버는 `room-closed`를 room 전체에 보내고, 그 뒤 `room-updated`로 로비를 갱신한다.

## Do Not Break

- ACK 시그니처를 바꾸면 [src/types/socket.d.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/types/socket.d.ts)와 handler를 같이 갱신한다.
- `sessionId`를 `socketId`처럼 취급하지 않는다.
- `check-can-join-room -> handlePlayerReconnect -> join-room` 순서를 뒤집지 않는다.
- provider, socket server, middleware, version flow를 바꿨으면 `yarn build`까지 확인한다.
- 소켓 흐름을 바꿨으면 `yarn check:socket`으로 실제 create/join/re-enter/leave smoke를 돌린다.
