# Base image - Node.js 20 사용
FROM node:20.14.0-alpine

# Create and set working directory
WORKDIR /app
ENV HUSKY=0

# Copy Yarn Berry configuration files
COPY .yarn .yarn
COPY .yarnrc.yml .yarnrc.yml

# Copy package.json and install dependencies using Yarn
COPY package.json yarn.lock ./
RUN yarn install --immutable --immutable-cache --check-cache

# Copy all project files to the container
COPY . .

# Build Next.js project
RUN yarn build

# Expose the port (Next.js uses 3000 by default)
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
