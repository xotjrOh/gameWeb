# Domain And State

이 프로젝트의 핵심 도메인은 "방(room)"이다.

모든 실시간 게임은 방을 중심으로 움직인다.

- 방에는 `roomId`, `roomName`, `host`, `players`, `status`, `maxPlayers`가 있다.
- `host`는 별도 필드로 존재한다.
- `players`는 배열이다.
- 방마다 `gameType`과 그에 대응하는 `gameData`가 있다.

중요한 안정 규칙은 아래와 같다.

- `gameType`은 `horse | shuffle | animal | jamo | murder_mystery` 중 하나다.
- 서버의 권위 상태는 메모리의 `rooms` 객체에 있다.
- 방 ID는 숫자 문자열처럼 증가한다.
- 재입장 판정은 소켓 ID보다 세션 ID에 더 의존한다.
- 새로고침/재연결 시 `update-socket-id`로 소켓 ID를 갱신한다.

방 생명주기의 공통 흐름은 대략 아래와 같다.

1. 로비에서 `create-room` 또는 `check-can-join-room`을 보낸다.
2. 서버는 유효성 검사를 한다.
3. 재입장 가능하면 `reEnter` 정보를 돌려준다.
4. 새 입장이면 `join-room` ACK로 성공/실패를 반환한다.
5. 방 목록 변경은 `room-updated` 이벤트로 전파된다.
6. 호스트가 방을 닫으면 `room-closed`가 전파된다.

호스트와 플레이어를 다룰 때 기억할 규칙도 있다.

- 호스트 화면과 플레이어 화면은 URL이 다르다.
- "호스트인지" 여부는 서버 확인이 필요하다.
- 머더미스터리는 옵션에 따라 호스트가 플레이어로도 참여할 수 있다.
- 다른 게임들은 기본적으로 호스트와 플레이어 역할이 더 분리되어 있다.

클라이언트 상태 관리 원칙은 아래가 중요하다.

- Redux는 UI 소비용 상태를 담는다.
- 서버가 진짜 상태를 가진다.
- `room` slice는 로비의 방 목록을 담는다.
- `loading` slice는 공통 로딩 상태를 담는다.
- `horse`, `shuffle`, `animal`, `jamo` slice가 있다.
- 모든 게임 상태가 Redux에 다 들어있는 구조는 아니다.
- 머더미스터리는 데이터/스냅샷 기반 흐름이 강하다.

랭킹은 방 상태와 별도다.

- 승자 기록은 `data/leaderboard.json`에 누적된다.
- 조회는 `/api/rankings`에서 한다.
- 게임 선택 값도 `gameCatalog`와 맞춘다.

GPT가 Codex에게 자주 넘기면 좋은 표현은 아래와 같다.

- `서버 권위 상태는 rooms 메모리 객체라는 가정을 유지해줘.`
- `재입장 로직은 sessionId 기반이라는 점을 깨지 말아줘.`
- `로컬 UI 상태와 서버 권위 상태를 혼동하지 말고 수정 범위를 나눠줘.`
