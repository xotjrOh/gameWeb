# Validation Matrix

변경 후에는 아래 표에서 가장 가까운 검증 집합을 고른다. 여러 계층을 건드렸다면 더 강한 쪽을 따른다.

## Baseline Rules

- 타입에 영향이 있을 수 있으면 `yarn exec tsc --noEmit`
- TS/TSX 코드를 바꿨으면 기본적으로 `yarn lint`
- 라우팅, 빌드 시점 코드, 환경변수 분기, 전역 provider를 바꿨으면 `yarn build`까지 고려
- 머더미스터리 데이터나 레지스트리를 바꿨으면 `yarn test:murder`

## By Change Type

- 문서만 수정
  - `yarn exec prettier --check AGENTS.md "docs/agent/**/*.md"`
- 컴포넌트, 훅, 타입, 일반 App Router 페이지 수정
  - `yarn exec tsc --noEmit`
  - `yarn lint`
- Socket.IO 클라이언트/서버, provider, 공용 타입 수정
  - `yarn exec tsc --noEmit`
  - `yarn lint`
  - 필요 시 `yarn build`
- 머더미스터리 시나리오/레지스트리 수정
  - `yarn test:murder`
  - `yarn exec tsc --noEmit`
  - `yarn lint`
- 환경변수, 인증, 미들웨어, 라우트 엔트리포인트 수정
  - `yarn exec tsc --noEmit`
  - `yarn lint`
  - `yarn build`

## Completion Standard

- 실행한 명령은 마지막 답변에 적는다.
- 본인 변경으로 인한 실패는 해결 후 종료한다.
- 기존부터 있던 실패라면 "어느 명령에서, 어떤 종류의 실패인지"를 남긴다.
