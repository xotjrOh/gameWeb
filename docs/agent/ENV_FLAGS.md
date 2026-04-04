# Env And Debug Flags

이 문서는 "현재 코드에 실제로 쓰이는 플래그"만 빠르게 확인하려는 용도다.

## Sync Rule

- 앱 코드에서 새 환경변수를 추가하면 이 문서와 [src/types/env.d.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/types/env.d.ts)를 같이 갱신한다.
- 문서 설명보다 현재 소스가 우선이지만, Codex가 추측하지 않게 하려면 여기 설명을 가능한 한 최신으로 유지한다.

## Socket / Server Flags

- `SOCKET_DEBUG`
  - 서버측 연결/ACK/버전 로그를 켠다.
  - 사용 파일: [src/pages/api/socket/io.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/io.ts), [src/pages/api/socket/handlers/commonHandler.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/handlers/commonHandler.ts), [src/app/api/version/route.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/app/api/version/route.ts)
- `SOCKET_SINGLETON_FIX`
  - 서버 Socket.IO 인스턴스를 `globalThis`에 보존하는 실험 플래그다.
  - 사용 파일: [src/pages/api/socket/io.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/io.ts)
- `SOCKET_ENFORCE_VERSION`
  - 서버가 구버전 소켓을 강제로 끊고 `server-version` 이벤트를 보낸다.
  - 사용 파일: [src/pages/api/socket/io.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/io.ts)
- `ROOM_STATE_PERSIST`
  - 방/타이머/roomId 카운터를 `globalThis`에 보존한다.
  - 사용 파일: [src/pages/api/socket/state/gameState.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/state/gameState.ts)
- `APP_VERSION`
  - 서버 버전 강제 경로의 진실원이다. 없으면 `/api/version`은 `SERVER_VERSION` 또는 `dev`를 사용한다.
  - 사용 파일: [src/app/api/version/route.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/app/api/version/route.ts), [src/pages/api/socket/io.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/pages/api/socket/io.ts)

## Socket / Client Flags

- `NEXT_PUBLIC_SOCKET_DEBUG`
  - 클라이언트 소켓 생명주기/이벤트 로그를 켠다.
  - 사용 파일: [src/components/provider/SocketProvider.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/provider/SocketProvider.tsx), [src/components/GameRooms.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/GameRooms.tsx)
- `NEXT_PUBLIC_SOCKET_SINGLETON_FIX`
  - 클라이언트 소켓 싱글톤을 켠다.
  - 사용 파일: [src/components/provider/SocketProvider.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/provider/SocketProvider.tsx)
- `NEXT_PUBLIC_SOCKET_VERSION_ENFORCE`
  - 서버 버전에 맞춰 클라이언트 소켓을 다시 만든다.
  - 사용 파일: [src/components/provider/SocketProvider.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/provider/SocketProvider.tsx)
- `NEXT_PUBLIC_SOCKET_ACK_DEBUG`
  - `join-room` ACK 타임아웃 실험 경로를 켠다.
  - 사용 파일: [src/components/GameRooms.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/GameRooms.tsx)
- `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_SITE_VERSION`
  - 클라이언트가 서버 버전과 비교할 로컬 버전 값이다.
  - 사용 파일: [src/components/provider/SocketProvider.tsx](/c:/Users/xotjr/Desktop/react/next-game-web/src/components/provider/SocketProvider.tsx)

## Version Watch Flags

- `NEXT_PUBLIC_VERSION_WATCH_DEBUG`
  - `/api/version` polling 및 visibility 로그를 자세히 남긴다.
- `NEXT_PUBLIC_VERSION_WATCH_NOOP`
  - mismatch가 나도 disconnect/refresh 하지 않는다.
- `NEXT_PUBLIC_VERSION_WATCH_FORCE_REFRESH`
  - mismatch 시 소켓을 끊고 `/`로 이동한다.
- `NEXT_PUBLIC_VERSION_WATCH_INTERVAL_MS`
  - polling 간격을 조절한다.
- 사용 파일
  - [src/hooks/useCheckVersion.ts](/c:/Users/xotjr/Desktop/react/next-game-web/src/hooks/useCheckVersion.ts)

## Smoke Script Flags

- `SOCKET_SMOKE_URL`
  - `yarn smoke:socket`가 붙을 서버 URL. 비우면 `NEXT_PUBLIC_SITE_URL` 또는 `http://127.0.0.1:3000`을 먼저 시도한다.
- `SOCKET_SMOKE_SPAWN`
  - `0`이면 서버가 없을 때 auto-spawn을 하지 않는다. 기본은 auto-spawn 허용이다.
- `SOCKET_SMOKE_HOST`, `SOCKET_SMOKE_PORT`
  - auto-spawn 되는 `yarn dev` 서버 주소를 정한다. 기본은 `127.0.0.1:3100`.
- `SOCKET_SMOKE_VERBOSE`
  - spawned dev server 로그를 같이 출력한다.
- 사용 파일
  - [scripts/socket-room-flow-smoke.cjs](/c:/Users/xotjr/Desktop/react/next-game-web/scripts/socket-room-flow-smoke.cjs)

## Safe Combos

- 소켓 중복/ACK 추적
  - `SOCKET_DEBUG=1`
  - `NEXT_PUBLIC_SOCKET_DEBUG=1`
  - 필요 시 `NEXT_PUBLIC_SOCKET_ACK_DEBUG=1`
- 싱글톤 실험
  - `SOCKET_SINGLETON_FIX=1`
  - `NEXT_PUBLIC_SOCKET_SINGLETON_FIX=1`
- 버전 강제 실험
  - `APP_VERSION=<same-version>`
  - `NEXT_PUBLIC_APP_VERSION=<same-version>`
  - `SOCKET_ENFORCE_VERSION=1`
  - `NEXT_PUBLIC_SOCKET_VERSION_ENFORCE=1`
- 버전 watch 관찰 전용
  - `NEXT_PUBLIC_VERSION_WATCH_DEBUG=1`
  - 필요 시 `NEXT_PUBLIC_VERSION_WATCH_NOOP=1`
