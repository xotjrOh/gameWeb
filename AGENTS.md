# Context
- STEP 1: 소켓 생명주기·라우팅·ACK 흐름 진단 완료, 무한 폴링 원인은 중복 소켓/리스너 가능성으로 좁힘.
- STEP 2a: 디버그 게이트(`NEXT_PUBLIC_SOCKET_DEBUG`, `SOCKET_DEBUG`) 도입해 기본 연결 상태 추적 준비.
- STEP 2b: onAny 이벤트 필터, join-room 전후(클라/서버) 타이밍 로그 추가로 ACK 레이스/중복 리스너를 정밀 진단할 준비 완료.
- STEP 4: 플래그(`SOCKET_SINGLETON_FIX`, `NEXT_PUBLIC_SOCKET_SINGLETON_FIX`, `ROOM_STATE_PERSIST`) 기반으로 서버/클라 싱글톤 및 방 상태 보존 옵션 추가해 HMR/StrictMode 중복 소켓 여부를 실험할 준비 완료.
- STEP 2c/5a: 버전 워처 디버그/NOOP 플래그, 페이지 가시성 로그, `/api/version` 헤더 추적, 서버 connection 핸들러 가드, join ACK 타임아웃 계측(플래그)으로 원인 분기를 위한 계측 확장.
- STEP 2d: 버전 워처 기본 동작을 “수동(passive)” 모드로 조정해 버전 불일치 시에도 기본적으로 disconnect 하지 않도록 변경, 필요 시 `NEXT_PUBLIC_VERSION_WATCH_FORCE_REFRESH`로 구동.
- STEP 5: FLAG(`SOCKET_ENFORCE_VERSION`, `NEXT_PUBLIC_SOCKET_VERSION_ENFORCE`) 기반으로 재배포 시 페이지 리로드 없이 소켓만 교체하는 경로 추가, `/api/version`은 `APP_VERSION` 단일 진실원 제공.

# Decisions(ADR)
- 디버그 로깅은 환경변수 기반으로 기본 비활성, attach 시 `__dbgAttached` 가드로 중복 설치 방지.
- join-room 트레이싱은 기존 emit/handler 흐름을 보존하고, 로그 전용 setTimeout(대기 경고)만 허용.
- 싱글톤 및 방 상태 보존은 각각 별도 FLAG로 제어, 기본 OFF로 동작 불변 보증.
- 버전 워처 영향 분석을 위해 `NEXT_PUBLIC_VERSION_WATCH_DEBUG`/`NOOP` 플래그로 주기·disconnect 여부를 분리하고, `/api/version` 호출마다 목적 헤더/ID를 기록.
- 서버/클라이언트 버전 강제 플로우는 기본 OFF, `SOCKET_ENFORCE_VERSION`+`NEXT_PUBLIC_SOCKET_VERSION_ENFORCE`를 동시에 켜야만 구버전 소켓을 차단하고 `server-version` 이벤트로 재연결 유도.
- 버전 워처는 기본적으로 passive 모드이며, 강제 리프레시가 필요할 때만 `NEXT_PUBLIC_VERSION_WATCH_FORCE_REFRESH=1`로 이전 동작을 복원.
- ACK 계측은 `NEXT_PUBLIC_SOCKET_ACK_DEBUG`가 켜졌을 때만 `socket.timeout`으로 타임아웃을 강제해 본 동작에 영향 주지 않음.

- STEP 2 로그 활성 상태에서 브라우저 간 교차 입장·Fast Refresh·네트워크 차단 시나리오를 재현하고 로그 취합.
- STEP 3: `/socket.io` 경로와 미들웨어 충돌 여부를 플래그 실험으로 검증 예정.
- STEP 4: 싱글톤/방 상태 플래그를 켜고 HMR·다중 탭·포커스 전환 시 소켓 수와 clientsCount 변화를 관찰.
- STEP 2c: 버전 워처 디버그/NOOP 조합으로 disconnect 루프 관찰, `/api/version` RPS 로그와 포커스/가시성 이벤트 타임라인을 매칭.
- STEP 2d: passive 모드·visibility 이벤트 적용 이후에도 재연결이 발생하면 다른 요인과 로그 상관관계 분석.
- STEP 5: ACK 타임아웃 플래그를 켜고 join 응답 누락 시점을 계측, 이후 전송 강제 실험으로 이어감.
- STEP 5a: 버전 enforce 플래그를 켠 상태에서 재배포(버전 변경) 시 기존 소켓이 `server-version` 이벤트를 받고 페이지 리로드 없이 재연결되는지 검증.

# Diff Summary
- `SocketProvider`: 마운트/언마운트 카운터, onAny 로그, FLAG 기반 싱글톤 소켓 옵션, 페이지/포커스 이벤트 로그, server-version handling 추가.
- `GameRooms`: join-room 전후 로깅 + ACK 타임아웃 플래그(`NEXT_PUBLIC_SOCKET_ACK_DEBUG`) 실험 경로.
- `pages/api/socket/io`: 디버그 훅 + FLAG 기반 서버 IO 싱글톤 + connection 핸들러 1회 가드.
- `commonHandler`: join-room 시 서버측 타이밍 로그.
- `gameState`: 선택적 globalThis 보존으로 방/타이머/roomId 유지.
- `useCheckVersion`: 버전 워처 디버그/NOOP 플래그, 헤더 식별자, 주기적 체크.
- `/api/version`: 디버그 시 목적/ID/User-Agent 로깅 + `APP_VERSION` 단일 진실원.
- `socket.io` 서버/클라: 버전 enforce FLAG 경로 추가(서버 handshake 검사, 클라 server-version 수신 시 소켓만 재연결).

# Todos & Risks
- 디버그/싱글톤/버전 워처 플래그 ON 시 로그 과다 및 상태 공유 부작용 가능 → 필요 시 필터링/샘플링.
- 개인 식별 정보(닉네임/세션ID/UA)가 로그에 포함될 수 있으므로 공유 전 마스킹 필요.
- 글로벌 상태 보존 시 테스트 간 데이터 잔존 가능성에 유의.
- ACK 타임아웃 플래그 ON 시 실제 사용자 경험이 바뀔 수 있으므로 실험 환경에 한정.

# Edge Cases & Tests
- `.env.local`에 `NEXT_PUBLIC_SOCKET_DEBUG=1`, `SOCKET_DEBUG=1` 설정 후 `yarn dev`로 양측 로그 확인.
- 탭 다중 접속, Fast Refresh, 네트워크 차단 시 event/onAny/join-room 로그 패턴 비교.
- 싱글톤 플래그 ON 상태에서 HMR 3회 후에도 socket.id/clientsCount 변화가 없는지 확인.
- 버전 워처 디버그/NOOP 케이스를 나눠 `/api/version` RPS, page visibility 이벤트, join ACK 로그 상관관계를 수집.
