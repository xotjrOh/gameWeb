# Base image
FROM node:20-alpine AS base

# Dependencies stage
FROM base AS deps
RUN corepack enable && corepack prepare yarn@4.5.3
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases/yarn-4.5.3.cjs ./.yarn/releases/yarn-4.5.3.cjs
RUN yarn install --immutable

# Builder stage
FROM base AS builder
RUN corepack enable && corepack prepare yarn@4.5.3
WORKDIR /app
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/.pnp.cjs ./.pnp.cjs
COPY --from=deps /app/.pnp.loader.mjs ./.pnp.loader.mjs
COPY . .
RUN yarn build

# Runner stage
FROM base AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.pnp.cjs ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

COPY --from=builder /app/.yarn/cache ./.yarn/cache
COPY --from=builder /app/.yarn/releases ./.yarn/releases

EXPOSE 3000
CMD ["node", "-r", "/app/.pnp.cjs", "/app/server.js"]
