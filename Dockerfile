# Base image
FROM node:20.14.0-alpine
RUN corepack enable && corepack prepare yarn@4.5.3 --activate

# Set working directory
WORKDIR /app
ENV HUSKY=0
ENV YARN_NODE_LINKER=node-modules

# 빌드 시 VERSION 아규먼트를 받아 ENV로 설정
ARG VERSION
ENV SERVER_VERSION=$VERSION

# Copy necessary files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/

# Install dependencies
RUN yarn install --immutable --inline-builds

# Build the application
COPY . .
RUN yarn build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
