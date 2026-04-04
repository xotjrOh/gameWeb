# Validation Matrix

변경 후에는 아래 표에서 가장 가까운 검증 집합을 고른다. 여러 계층을 건드렸다면 더 강한 쪽을 따른다.

## Baseline Rules

- 타입에 영향이 있을 수 있으면 `yarn typecheck`
- TS/TSX 코드를 바꿨으면 기본적으로 `yarn lint`
- 빠른 기본 세트는 `yarn check:fast`
- 라우팅, 빌드 시점 코드, 환경변수 분기, 전역 provider를 바꿨으면 `yarn build`까지 고려
- 소켓 create/join/re-enter/leave 흐름을 바꿨으면 `yarn smoke:socket`
- 머더미스터리 데이터나 레지스트리를 바꿨으면 `yarn test:murder`

## By Change Type

- 문서만 수정
  - `yarn check:docs`
- 컴포넌트, 훅, 타입, 일반 App Router 페이지 수정
  - `yarn check:fast`
- Socket.IO 클라이언트/서버, provider, 공용 타입 수정
  - `yarn check:socket`
  - provider, `io.ts`, middleware, env 분기까지 바뀌면 `yarn check:full`
- 머더미스터리 시나리오/레지스트리 수정
  - `yarn check:murder`
- 환경변수, 인증, 미들웨어, 라우트 엔트리포인트 수정
  - `yarn check:fast`
  - `yarn build`
  - 필요 시 `yarn check:full`

## Preferred Script Aliases

- `yarn typecheck`
  - `tsc --noEmit` 단독 검증
- `yarn check:fast`
  - 타입 + lint
- `yarn check:murder`
  - 시나리오 smoke + 타입 + lint
- `yarn smoke:socket`
  - room create/join/re-enter/leave 실시간 smoke
- `yarn check:socket`
  - 타입 + lint + 실시간 smoke
- `yarn check:full`
  - 시나리오 smoke + 타입 + lint + build

## Socket Smoke Notes

- `yarn smoke:socket`는 먼저 실행 중인 서버(`SOCKET_SMOKE_URL` 또는 `NEXT_PUBLIC_SITE_URL`)를 찾고, 없으면 기본적으로 `127.0.0.1:3100`에 `yarn dev`를 auto-spawn한다.
- 소켓 계약 변경 시 이 smoke를 통과해야 "로비에서 덜 추측하고 스스로 확인하기 쉬운 상태"라고 본다.

## Completion Standard

- 실행한 명령은 마지막 답변에 적는다.
- 본인 변경으로 인한 실패는 해결 후 종료한다.
- 기존부터 있던 실패라면 "어느 명령에서, 어떤 종류의 실패인지"를 남긴다.
