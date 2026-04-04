# Requested Inputs

이 문서는 사용자가 Codex에게 일을 맡길 때 어떤 정보를 주면 정확도와 속도가 올라가는지 정리한다.

## Minimal Request Shape

- 목표
  - 무엇을 바꾸고 싶은지 한 문장으로 쓴다.
- 대상
  - 게임 ID, 페이지 경로, API, 컴포넌트, 데이터 파일 중 해당하는 것을 적는다.
- 제약
  - 건드리면 안 되는 라우트, 이벤트 계약, UX, 플래그 기본값 등을 적는다.
- 검증 기대
  - `check:fast`, `check:socket`, `check:murder`, `check:full`, 특정 시나리오 재현 중 원하는 검증을 적는다.

## Good Extra Inputs

- 먼저 봐야 할 파일 2~6개
- 재현 절차
- 현재 관찰한 오류 메시지
- 원하는 검증 강도
  - `check:fast`, `check:socket`, `check:murder`, `check:full` 중 무엇을 기대하는지
- 허용 가능한 범위
  - "문서만", "UI만", "서버 소켓도 포함", "리팩터링 허용" 같은 범위

## When Inputs Are Missing

- Codex는 먼저 관련 파일을 읽고 합리적으로 보정한다.
- 같은 기능의 기존 구현이 있으면 그 패턴을 우선 복제한다.
- 위험한 가정이 필요한 경우에만 질문한다.

## Prompt Templates

### 1. 특정 화면 수정

```md
목표: /games/murder_mystery 소개 페이지 문구와 구성을 다듬고 싶다.
제약: 실제 게임방 라우트와 소켓 이벤트는 건드리지 말 것.
먼저 확인할 파일: src/app/games/murder_mystery/page.tsx, 관련 공용 컴포넌트
검증: yarn check:fast
```

### 2. 실시간 버그 수정

```md
목표: join-room ACK 누락 또는 재연결 루프 원인을 수정하고 싶다.
대상: 로비 입장 흐름, SocketProvider, socket.io 서버
제약: ACK 시그니처와 sessionId 기반 재입장 로직 유지
먼저 확인할 파일: src/components/GameRooms.tsx, src/components/provider/SocketProvider.tsx, src/pages/api/socket/io.ts, src/pages/api/socket/handlers/commonHandler.ts
검증: yarn check:socket
```

### 3. 머더미스터리 데이터 작업

```md
목표: 새 시나리오를 추가하거나 registry를 정리하고 싶다.
대상: data/murder-mystery/registry.json, scenarios/\*.yaml
제약: 기존 scenario id와 참조 관계를 깨지 말 것
검증: yarn check:murder
```

## Default Closing Expectation

- 가능한 한 코드 패턴을 맞춘다.
- 끝나기 전 실제 검증을 돌린다.
- 본인 변경으로 생긴 오류는 제거한 뒤 답변한다.
