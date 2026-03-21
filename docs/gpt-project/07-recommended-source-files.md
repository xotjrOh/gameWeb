# Recommended Source Files

`project-files.txt`만으로는 구조는 보여도 계약과 불변 조건이 충분히 전달되지 않는다.

GPT 프로젝트에 "원문 그대로" 추가하면 좋은 파일은 아래 정도로 압축하는 것이 좋다.

우선순위 높음

- `project-files.txt`
  - 전체 파일 구조 파악용
- `package.json`
  - 실행 명령, 도구 체인, 런타임 스택 파악용
- `src/lib/gameCatalog.ts`
  - 게임 ID와 표기 체계의 진실원
- `src/types/room.d.ts`
  - 핵심 도메인 모델 진실원
- `src/types/socket.d.ts`
  - 공통 소켓 이벤트 계약 진실원
- `data/murder-mystery/SCENARIO_AUTHORING.md`
  - 머더미스터리 콘텐츠 작업 규칙 진실원

상황 따라 추가

- `README.md`
  - 프로젝트 소개와 로컬 실행 맥락이 필요할 때
- `src/lib/authOptions.ts`
  - 인증 플로우를 건드릴 때
- `src/middleware.ts`
  - 접근 제어/리다이렉트를 건드릴 때
- `src/pages/api/socket/utils/constants.ts`
  - 공통 메시지, 기본 게임 데이터, 상태 상수가 필요할 때
- `src/pages/api/socket/state/leaderboardState.ts`
  - 랭킹 저장/정렬 규칙이 필요할 때

영구 첨부를 권장하지 않는 파일도 있다.

- 개별 room page 구현 파일
  - 자주 바뀌고 분량이 커서 금방 낡는다.
- `AGENTS.md`
  - 현재 진행 중인 디버그 맥락이 많아 장기 보관용으로는 쉽게 stale 된다.
- `.env.local`, `.env.production`
  - 환경 종속 정보가 많고 공유 위험이 있다.
- 생성물과 캐시
  - `.next`, `node_modules`, tsbuildinfo 등

정리하면, GPT 프로젝트에는 아래 두 층이 가장 효율적이다.

- 이 폴더의 안정 문서들
- 소수의 진실원 원본 파일

즉 "문서로 구조를 이해시키고, 타입/카탈로그/시나리오 가이드는 원문으로 보강"하는 조합이 가장 오래 간다.
