# Base image
FROM node:20.14.0-alpine
RUN corepack enable && corepack prepare yarn@4.5.3 --activate

# Set working directory
WORKDIR /app
ENV HUSKY=0

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
