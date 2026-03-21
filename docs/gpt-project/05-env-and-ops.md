# Env And Ops

이 프로젝트는 환경변수와 플래그 의존성이 적지 않다. GPT가 Codex 프롬프트를 쓸 때 "어떤 플래그가 관련 있는 작업인지"를 함께 적어주면 품질이 올라간다.

핵심 운영 환경은 아래와 같다.

- 패키지 매니저는 Yarn Berry PnP다.
- 기본 명령은 `yarn dev`, `yarn build`, `yarn start`
- 머더미스터리 데이터 검증용 스모크 테스트는 `yarn test:murder`

기본 환경변수 축은 아래다.

- 인증
  - `KAKAO_CLIENT_ID`
  - `KAKAO_CLIENT_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
- 클라이언트 URL
  - `NEXT_PUBLIC_SITE_URL`
- 사전 API
  - `OPENDICT_API_KEY`
  - `DICT_API_KEY`
- 버전
  - `APP_VERSION`
  - `NEXT_PUBLIC_APP_VERSION`
  - `NEXT_PUBLIC_SITE_VERSION`

실시간/디버그 관련 플래그는 아래를 기억하면 된다.

- 서버 측
  - `SOCKET_DEBUG`
  - `SOCKET_SINGLETON_FIX`
  - `SOCKET_ENFORCE_VERSION`
  - `ROOM_STATE_PERSIST`
- 클라이언트 측
  - `NEXT_PUBLIC_SOCKET_DEBUG`
  - `NEXT_PUBLIC_SOCKET_SINGLETON_FIX`
  - `NEXT_PUBLIC_SOCKET_VERSION_ENFORCE`
  - `NEXT_PUBLIC_SOCKET_ACK_DEBUG`
  - `NEXT_PUBLIC_VERSION_WATCH_DEBUG`
  - `NEXT_PUBLIC_VERSION_WATCH_NOOP`
  - `NEXT_PUBLIC_VERSION_WATCH_FORCE_REFRESH`
  - `NEXT_PUBLIC_VERSION_WATCH_INTERVAL_MS`

운영 사실 중 오래 유지될 만한 것은 아래다.

- 버전 확인 API는 `/api/version` 하나로 모인다.
- 실시간 방 상태는 메모리 기반이다.
- 랭킹은 파일 기반이다.
- 머더미스터리 콘텐츠는 데이터 파일 기반이다.

Codex 프롬프트에 넣기 좋은 표현 예시는 아래와 같다.

- `이번 작업은 환경변수 추가가 필요한지 같이 판단해줘.`
- `기본 동작은 유지하고, 새 동작은 플래그 뒤로 숨겨줘.`
- `버전 관련 작업이면 /api/version 과 client watcher 둘 다 확인해줘.`
- `socket 디버그 플래그를 깨지 않도록 기존 분기 구조를 유지해줘.`
