# 🕹️ 온오프라인 통합 게임 플랫폼

[![Railway Deployment](https://img.shields.io/badge/Railway-Deployed-brightgreen)](https://your-railway-url.com) ![Next.js](https://img.shields.io/badge/Next.js-%5E14.2-blue) ![Socket.IO](https://img.shields.io/badge/Socket.IO-%5E4.7-purple)

> 오프라인 대면 플레이와 온라인 실시간 지원의 결합으로 한 차원 높은 게임 경험을 제공합니다.  
> 플레이어들은 실제로 모여 대화하며 게임을 진행하고, 웹 애플리케이션은 실시간 로직 처리와 정보동기화를 통해 게임 흐름을 매끄럽게 지원합니다.

## 🌟 프로젝트 소개

이 프로젝트는 Next.js 기반의 서버-클라이언트 통합 환경과 Socket.IO를 활용한 실시간 통신을 통해, 온오프라인 게임 플레이를 지원하는 웹 플랫폼입니다.  
플레이어는 실제로 얼굴을 맞대고 토론·협력하며, 웹은 게임 상태 관리, 점수 집계, 라운드 진행을 자동화하여 게임 흐름을 보조합니다.

### 주요 특징

- **실시간 상호작용**: Socket.IO로 구현한 빠르고 안정적인 실시간 이벤트 처리.
- **유연한 게임 상태 관리**: 서버 메모리 기반의 사용자별 상태 추적, 빠른 라운드 전환.
- **게임 안내 페이지 제공**: 플레이어가 규칙과 진행방식을 웹으로 확인 가능.
- **반응형 UI & 브라우저 호환성**: 다양한 기기, 다양한 브라우저 환경에서 일관된 사용 경험 제공.
- **보안 및 품질 관리**: 린팅·포매팅 자동화, 보안 코딩 규칙 준수로 안정성과 유지보수성 강화.

[🌐 게임 소개 페이지 미리보기](https://gameweb-production.up.railway.app/games/horse)

## 🎮 게임 진행 방식

1. **Host가 게임방 생성**: 게임 설정 및 라운드 타이머 등을 웹에서 지정.
2. **플레이어 접속**: 각 플레이어는 오프라인으로 모여 대화하면서, 동시에 웹 접속으로 역할 확인, 베팅, 투표 등을 처리.
3. **라운드 진행**: 오프라인 상호작용 결과를 웹에서 실시간 반영. 라운드 시작/종료는 호스트 제어.
4. **자동 집계 & 결과 안내**: 웹 애플리케이션이 점수 및 결과를 자동 계산하고 승자를 발표.

| 방만들기                                                                     | 호스트 설정                                                          | 플레이 영상                                                                      | 승리                                                                 |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| <img src="./public/images/readme/방만들기.gif" alt="방만들기" width="100" /> | <img src="./public/images/readme/설정.gif" alt="설정" width="100" /> | <img src="./public/images/readme/플레이영상.gif" alt="플레이영상" width="100" /> | <img src="./public/images/readme/승리.gif" alt="승리" width="100" /> |

## ⚙️ 기술 스택

- **프론트엔드 & 백엔드**: Next.js (14.2+)
- **실시간 통신**: Socket.IO
- **패키지 매니저**: Yarn Berry (PnP)
- **CI/CD & 배포**: Railway
- **DB**: 없음(서버 메모리에 상태 저장)

## 📦 설치 및 실행 방법

Yarn Berry(PnP) 기반으로 의존성을 관리하므로, npm이 아닌 yarn 명령을 사용합니다.

1. **레포지토리 클론**:

   ```bash
   git clone https://github.com/xotjrOh/gameWeb.git
   cd gameWeb
   ```

2. **의존성 설치 (Yarn Berry)**:

   ```bash
   yarn install --immutable
   ```

   > Yarn Berry는 `.yarnrc.yml`와 `.yarn/` 디렉토리에 의존성 및 설정이 포함되어 있습니다.
   > `nodeLinker: pnp` 설정으로 node_modules 없이 동작합니다.

3. **환경변수 설정**:

   `.env.local` 파일을 프로젝트 루트에 생성하고 다음 정보 입력:

   ```bash
   # '카카오 개발자도구'에 접속하여 oauth를 위한 id와 secret값 등록
   KAKAO_CLIENT_ID=your-kakao-client-id
   KAKAO_CLIENT_SECRET=your-kakao-client-secret
   # '구글 개발자도구'에 접속하여 oauth를 위한 id와 secret값 등록
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   NEXTAUTH_SECRET=your-generated-random-string
   NEXTAUTH_URL=http://localhost:3000

   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **개발 서버 실행**:

   ```bash
   yarn dev
   ```

   브라우저에서 http://localhost:3000 접속.

5. **프로덕션 빌드 & 실행**:

   ```bash
   yarn build
   yarn start
   ```

   Railway 등 클라우드 환경에서 Docker를 통해 배포 시에도 마찬가지로 `yarn build` 후 `yarn start`로 서비스 동작.

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)를 따릅니다.
