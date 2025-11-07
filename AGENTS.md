# Context
- STEP 1: 소켓 생명주기·라우팅·ACK 흐름 진단 완료, 무한 폴링 원인은 중복 소켓/리스너 가능성으로 좁힘.
- STEP 2a: 디버그 게이트(`NEXT_PUBLIC_SOCKET_DEBUG`, `SOCKET_DEBUG`) 도입해 기본 연결 상태 추적 준비.
- STEP 2b: onAny 이벤트 필터, join-room 전후(클라/서버) 타이밍 로그 추가로 ACK 레이스/중복 리스너를 정밀 진단할 준비 완료.

# Decisions(ADR)
- 디버그 로깅은 환경변수 기반으로 기본 비활성, attach 시 `__dbgAttached` 가드로 중복 설치 방지.
- join-room 트레이싱은 기존 emit/handler 흐름을 보존하고, 로그 전용 setTimeout(대기 경고)만 허용.

# Plan
- STEP 2 로그 활성 상태에서 브라우저 간 교차 입장·Fast Refresh·네트워크 차단 시나리오를 재현하고 로그 취합.
- STEP 3: `/socket.io` 경로와 미들웨어 충돌 여부를 플래그 실험으로 검증 예정.
- STEP 4 이후: 싱글톤 가드·join ACK·전송 강제 실험은 각 단계 승인 후 순차 진행.

# Diff Summary
- `SocketProvider`: 마운트/언마운트 카운터 + connect/disconnect/reconnect + onAny 필터(room-updated/error) 로그.
- `GameRooms`: join-room emit 전후 및 ACK 시간, pending 경고 로그 추가.
- `pages/api/socket/io` & handlers: 서버 측 connection/engine/join-room attempt/result/ack 로그.

# Todos & Risks
- 디버그 플래그 ON 상태에서 로그 과다로 성능 저하 가능성 → 필요 시 필터링/샘플링 추가.
- 개인 식별 정보(닉네임/세션ID)가 로그에 포함될 수 있으므로 공유 전 마스킹 필요.

# Edge Cases & Tests
- `.env.local`에 `NEXT_PUBLIC_SOCKET_DEBUG=1`, `SOCKET_DEBUG=1` 설정 후 `yarn dev`로 양측 로그 확인.
- 탭 다중 접속, Fast Refresh, 네트워크 차단 시 event/onAny/join-room 로그 패턴 비교로 원인 분기.
