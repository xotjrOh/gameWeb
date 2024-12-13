# Base image
FROM node:20.14.0-alpine AS base
RUN corepack enable && corepack prepare yarn@4.5.3 --activate

# Set working directory
WORKDIR /app
ENV HUSKY=0
ENV YARN_NODE_LINKER=node-modules

# Dependencies stage
FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
RUN --mount=type=cache,id=s/7296a585-55e0-4e97-8e4c-b2810de92ef5,target=/usr/local/share/.cache/yarn \
 yarn install --immutable --inline-builds

# Build stage
FROM base AS builder
COPY --from=deps /app/ /app/
COPY . .
RUN yarn build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
