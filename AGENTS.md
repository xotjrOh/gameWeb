# Agent Operating Guide

이 파일은 이 저장소에서 Codex가 기본적으로 따라야 할 작업 규칙의 진입점이다.

## Start Here

- 항상 먼저 [docs/agent/INDEX.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/INDEX.md)를 읽고 현재 작업에 필요한 문서를 고른다.
- 구조 파악이 필요하면 [docs/agent/architecture/ARCHITECTURE_MAP.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/architecture/ARCHITECTURE_MAP.md)를 본다.
- 사용자가 무엇을 주면 좋은지 확인하거나 프롬프트 템플릿이 필요하면 [docs/agent/REQUESTED_INPUTS.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/REQUESTED_INPUTS.md)를 본다.
- 작업 절차와 종료 기준은 [docs/agent/WORKFLOW.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/WORKFLOW.md), 검증 명령 선택은 [docs/agent/VALIDATION_MATRIX.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/VALIDATION_MATRIX.md)를 따른다.

## Non-Negotiables

- 수정 전에 반드시 관련 소스와 인접 구현을 읽고 기존 패턴을 맞춘다.
- 새 추상화, 새 폴더 규칙, 새 이벤트 계약은 기존 패턴으로 해결이 안 될 때만 도입한다.
- 라우트, `gameId`, Socket.IO ACK 시그니처, `sessionId` 기반 흐름처럼 이미 문서화된 계약은 함부로 바꾸지 않는다.
- 가능한 한 실제 검증 명령을 실행하고, 실패하면 원인을 수정한 뒤 종료한다.
- 검증을 끝내지 못했거나 기존 실패로 막히면 마지막 답변에 정확한 명령과 막힌 이유를 남긴다.

## Completion Rule

- 최종 답변 전에 이번 변경 범위에 맞는 검증을 직접 실행한다.
- 본인 변경 때문에 생긴 오류는 직접 수정하고 다시 검증한다.
- "아마 될 것 같다"는 상태로 종료하지 않는다.

## Project Context

- 안정적인 프로젝트 구조 문서는 [docs/gpt-project/00-index.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/gpt-project/00-index.md)부터 이어서 참고한다.
- 현재 진행 중인 소켓 디버그 컨텍스트는 [docs/agent/context/SOCKET_DEBUG_STATUS.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/context/SOCKET_DEBUG_STATUS.md)에 보존한다.
