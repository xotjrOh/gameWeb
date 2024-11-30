# 빌드 단계
FROM node:20.14.0-alpine AS builder

# RUN corepack enable
RUN corepack enable && corepack prepare yarn@4.5.3 --activate

WORKDIR /app
ENV HUSKY=0

COPY . ./

RUN yarn install --immutable --inline-builds
RUN yarn build

# 실행 단계
FROM node:20.14.0-alpine

# RUN corepack enable
RUN corepack enable && corepack prepare yarn@4.5.3 --activate

WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--require /app/.pnp.cjs"

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.pnp.cjs ./ 
COPY --from=builder /app/.pnp.loader.mjs ./ 
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/yarn.lock ./yarn.lock

CMD ["yarn", "start"]
