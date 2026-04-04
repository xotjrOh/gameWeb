# Agent Docs Index

이 폴더는 이 저장소에서 Codex가 작업을 시작하고 끝낼 때 따라야 할 운영 문서 모음이다.

## Read Order

1. [AGENTS.md](/c:/Users/xotjr/Desktop/react/next-game-web/AGENTS.md)
2. [architecture/ARCHITECTURE_MAP.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/architecture/ARCHITECTURE_MAP.md)
3. [TASK_STARTUP_PLAYBOOK.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/TASK_STARTUP_PLAYBOOK.md)
4. 작업이 실시간 흐름이면 [contracts/ROOM_SOCKET_CONTRACT.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/contracts/ROOM_SOCKET_CONTRACT.md)
5. 작업이 플래그/버전/watcher라면 [ENV_FLAGS.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/ENV_FLAGS.md)
6. [WORKFLOW.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/WORKFLOW.md)
7. [VALIDATION_MATRIX.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/VALIDATION_MATRIX.md)
8. [REQUESTED_INPUTS.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/REQUESTED_INPUTS.md)
9. 필요 시 `docs/gpt-project/*`와 현재 작업 소스

## What Each Doc Does

- `architecture/ARCHITECTURE_MAP.md`
  - 어떤 기능이 어느 계층에 있는지, 패턴을 어디서 베껴야 하는지 정리한다.
- `TASK_STARTUP_PLAYBOOK.md`
  - 작업 유형별로 먼저 읽어야 할 파일 묶음과 기본 검증을 고정한다.
- `contracts/ROOM_SOCKET_CONTRACT.md`
  - 방 생성/입장/재입장/종료의 안정 계약을 정리한다.
- `ENV_FLAGS.md`
  - 현재 코드에 실제로 쓰이는 소켓/버전/디버그 플래그를 빠르게 찾게 한다.
- `WORKFLOW.md`
  - 작업 시작부터 종료까지의 필수 절차를 고정한다.
- `VALIDATION_MATRIX.md`
  - 변경 유형별로 어떤 검증 명령을 돌릴지 결정한다.
- `REQUESTED_INPUTS.md`
  - 사용자가 요청할 때 주면 좋은 정보와, 정보가 부족할 때 Codex가 어떻게 보정할지 정리한다.
- `context/SOCKET_DEBUG_STATUS.md`
  - 현재 소켓 이슈 조사 상태 같은 일시적 컨텍스트를 보관한다.

## Operating Policy

- 이 문서들은 소스를 대체하지 않는다. 정확한 구현은 항상 현재 파일을 다시 읽고 판단한다.
- 문서에 없는 세부 스타일은 "같은 폴더의 기존 파일"을 우선 기준으로 삼는다.
- 작업이 끝나기 전에는 반드시 검증을 실행하고, 실패를 수정하거나 정확히 보고한다.

## Recommended Task Startup

1. 사용자 목표와 제약을 짧게 정리한다.
2. `TASK_STARTUP_PLAYBOOK.md`에서 현재 작업과 가장 가까운 읽기 세트를 고른다.
3. 바뀔 가능성이 높은 구현 세부는 소스에서 직접 재확인한다.
4. 관련 패턴 파일 2~4개를 먼저 읽고 나서 편집한다.
5. 변경 후 `VALIDATION_MATRIX.md`에 맞는 명령을 실행한다.
