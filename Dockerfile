# Base image - Node.js 20 사용
FROM node:20.14.0-alpine

# Corepack 활성화 (Yarn 사용을 위해)
RUN corepack enable

# 작업 디렉토리 설정
WORKDIR /app
ENV HUSKY=0

# 프로젝트 소스 코드 및 Yarn 설정 파일 복사
COPY . ./

# 의존성 설치
RUN yarn install --immutable --inline-builds

# Next.js 빌드
RUN yarn build

# Node.js에 PnP 로더 설정
ENV NODE_OPTIONS="--require /app/.pnp.cjs"

# 포트 설정
EXPOSE 3000

# 애플리케이션 시작
CMD ["yarn", "start"]
