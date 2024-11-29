# Base image - Node.js 20 사용
FROM node:20.14.0-alpine

# Corepack 활성화 (Yarn 사용을 위해)
RUN corepack enable

# 작업 디렉토리 설정
WORKDIR /app
ENV HUSKY=0

# Yarn 노드 링크 방식 설정
ENV YARN_NODE_LINKER=node-modules

# 의존성 파일 복사
COPY package.json yarn.lock ./

# 의존성 설치
RUN yarn install --immutable --inline-builds

# 프로젝트 소스 복사
COPY . .

# Next.js 빌드
RUN yarn build

# 포트 설정
EXPOSE 3000

# 애플리케이션 시작
CMD ["yarn", "start"]
