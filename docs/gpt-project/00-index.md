# GPT Project Packet

이 폴더의 문서는 GPT가 이 저장소를 이해하고, Codex에게 더 정확한 작업 프롬프트를 쓰기 위한 "안정 정보" 묶음이다.

목표는 두 가지다.

- 자주 바뀌는 구현 디테일 대신 오래 유지되는 구조, 용어, 제약을 전달한다.
- 정확한 편집이 필요할 때는 Codex가 로컬 코드를 다시 읽도록 유도한다.

이 문서 묶음은 다음 원칙으로 읽으면 된다.

- 여기 적힌 내용은 프로젝트의 상위 규칙과 구조다.
- 특정 함수 본문, JSX 구조, 최신 디버그 로그 상태는 소스가 진실원이다.
- GPT는 이 문서를 바탕으로 프롬프트를 만들고, Codex에게는 "관련 파일을 먼저 열어 확인한 뒤 수정"하라고 지시하는 것이 안전하다.

권장 첨부 순서는 아래와 같다.

- `project-files.txt`
- `docs/gpt-project/01-project-identity.md`
- `docs/gpt-project/02-routes-and-entrypoints.md`
- `docs/gpt-project/03-domain-and-state.md`
- `docs/gpt-project/04-realtime-architecture.md`
- `docs/gpt-project/05-env-and-ops.md`
- `docs/gpt-project/06-prompting-codex.md`
- `docs/gpt-project/07-recommended-source-files.md`

이 패킷이 일부러 덜 다루는 영역도 있다.

- 개별 화면의 세부 UI 배치
- 현재 진행 중인 버그 조사 상태
- 특정 게임 로직의 최신 세부 수치
- 임시 플래그 조합의 현재 실험 결과

그런 내용이 필요하면 GPT 프롬프트에서 Codex에게 다음 식으로 요구하면 된다.

`관련 파일을 먼저 읽고 현재 구현 기준으로 판단한 뒤 수정해줘. 이 문서는 구조 이해용 참고만 사용해줘.`
