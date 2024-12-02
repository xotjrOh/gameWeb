# Base image
FROM node:20.14.0-alpine
RUN corepack enable && corepack prepare yarn@4.5.3 --activate

# Set working directory
WORKDIR /app
ENV HUSKY=0
ENV YARN_NODE_LINKER=node-modules

# Copy necessary files
COPY package.json yarn.lock .yarnrc.yml ./
# COPY .yarn/ ./.yarn/

# Install dependencies
RUN yarn install --immutable
COPY . .

# Build the application
RUN yarn build

# Expose the port
EXPOSE 3000

# Set environment variables
# ENV NODE_ENV=production
# ENV HOSTNAME=0.0.0.0

# Start the application
CMD ["yarn", "start"]
