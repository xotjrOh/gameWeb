# Context
- STEP 1: 소켓 생명주기·라우팅·ACK 흐름 진단 완료, 무한 폴링 원인은 중복 소켓/리스너 가능성으로 좁힘.
- STEP 2a: 디버그 게이트(`NEXT_PUBLIC_SOCKET_DEBUG`, `SOCKET_DEBUG`) 도입해 기본 연결 상태 추적 준비.
- STEP 2b: onAny 이벤트 필터, join-room 전후(클라/서버) 타이밍 로그 추가로 ACK 레이스/중복 리스너를 정밀 진단할 준비 완료.
- STEP 4: 플래그(`SOCKET_SINGLETON_FIX`, `NEXT_PUBLIC_SOCKET_SINGLETON_FIX`, `ROOM_STATE_PERSIST`) 기반으로 서버/클라 싱글톤 및 방 상태 보존 옵션 추가해 HMR/StrictMode 중복 소켓 여부를 실험할 준비 완료.

# Decisions(ADR)
- 디버그 로깅은 환경변수 기반으로 기본 비활성, attach 시 `__dbgAttached` 가드로 중복 설치 방지.
- join-room 트레이싱은 기존 emit/handler 흐름을 보존하고, 로그 전용 setTimeout(대기 경고)만 허용.
- 싱글톤 및 방 상태 보존은 각각 별도 FLAG로 제어, 기본 OFF로 동작 불변 보증.

# Plan
- STEP 2 로그 활성 상태에서 브라우저 간 교차 입장·Fast Refresh·네트워크 차단 시나리오를 재현하고 로그 취합.
- STEP 3: `/socket.io` 경로와 미들웨어 충돌 여부를 플래그 실험으로 검증 예정.
- STEP 4: 싱글톤/방 상태 플래그를 켜고 HMR·다중 탭·포커스 전환 시 소켓 수와 clientsCount 변화를 관찰.
- STEP 5 이후: join ACK 패턴 및 전송 강제 실험은 각 단계 승인 후 순차 진행.

# Diff Summary
- `SocketProvider`: 마운트/언마운트 카운터, onAny 로그, FLAG 기반 싱글톤 소켓 옵션.
- `GameRooms`: join-room emit 전후 및 ACK 시간 로그(이전) 유지.
- `pages/api/socket/io`: 디버그 훅 + FLAG 기반 서버 IO 싱글톤.
- `commonHandler`: join-room 시 서버측 타이밍 로그.
- `gameState`: 선택적 globalThis 보존으로 방/타이머/roomId 유지.

# Todos & Risks
- 디버그/싱글톤 플래그 ON 시 로그 과다 및 상태 공유 부작용 가능 → 필요 시 필터링/샘플링.
- 개인 식별 정보(닉네임/세션ID)가 로그에 포함될 수 있으므로 공유 전 마스킹 필요.
- 글로벌 상태 보존 시 테스트 간 데이터 잔존 가능성에 유의.

# Edge Cases & Tests
- `.env.local`에 `NEXT_PUBLIC_SOCKET_DEBUG=1`, `SOCKET_DEBUG=1` 설정 후 `yarn dev`로 양측 로그 확인.
- 탭 다중 접속, Fast Refresh, 네트워크 차단 시 event/onAny/join-room 로그 패턴 비교.
- 싱글톤 플래그 ON 상태에서 HMR 3회 후에도 socket.id/clientsCount 변화가 없는지 확인.
