# Codex Workflow

이 저장소에서 Codex는 아래 순서로 움직인다.

## 1. Understand

- 사용자 목표, 수정 범위, 제약을 2~3문장으로 정리한다.
- 어떤 계층이 바뀌는지 먼저 결정한다.
  - `src/app`: 화면, 라우팅, App Router
  - `src/components`: 재사용 UI와 화면 조각
  - `src/hooks`: 클라이언트 흐름
  - `src/pages/api/socket`: Socket.IO 서버
  - `data/murder-mystery`: 시나리오 데이터

## 2. Pattern Match Before Edit

- 편집 전 아래 둘 다 반드시 읽는다.
  - 직접 수정할 파일
  - 같은 폴더 또는 같은 기능의 인접 파일 1개 이상
- 확인할 항목
  - import 정렬과 alias 사용 방식
  - 타입 선언 위치
  - 상태 관리 방식
  - 이벤트 이름과 ACK 시그니처
  - 파일/컴포넌트 네이밍 패턴

## 3. Change Minimally

- 기존 패턴으로 해결 가능한 범위 안에서 최소 수정으로 끝낸다.
- 동일한 역할의 파일이 이미 있으면 새로운 계층을 만들기보다 그 구조에 맞춘다.
- 플래그 기반 동작은 기본값을 바꾸지 않고 플래그 뒤에 둔다.

## 4. Verify Before Final

- 변경 범위에 맞는 명령을 [VALIDATION_MATRIX.md](/c:/Users/xotjr/Desktop/react/next-game-web/docs/agent/VALIDATION_MATRIX.md)에서 고른다.
- 실행 결과 오류가 나오면 먼저 수정하고 다시 실행한다.
- 검증이 길더라도 가능한 한 실제 명령을 우선한다.

## 5. Finish With Evidence

- 마지막 답변에는 아래만 간결히 남긴다.
  - 무엇을 바꿨는지
  - 어떤 검증을 실행했고 통과했는지
  - 남은 리스크가 있으면 무엇인지

## Do Not Stop Early

- 분석만 하고 끝내지 않는다.
- "검증은 안 했지만" 상태를 기본값으로 두지 않는다.
- 기존 실패 때문에 막혔다면 어떤 명령이 어디서 실패했는지 정확히 적는다.
