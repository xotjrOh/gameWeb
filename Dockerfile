# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy necessary files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
COPY . .

# Install dependencies
RUN corepack enable && corepack prepare yarn@4.5.3 --activate
RUN yarn install --immutable

# Build the application
RUN yarn build

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_OPTIONS="--require /app/.pnp.cjs"

# Start the application
CMD ["yarn", "start"]
