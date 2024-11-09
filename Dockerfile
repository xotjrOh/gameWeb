# Stage 1: Build
FROM node:20.14.0-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the project files
COPY . .

# Build the Next.js app
RUN npm run build

# Stage 2: Production
FROM node:20.14.0-alpine

# Set working directory
WORKDIR /app

# Set environment variable to disable Husky
ENV HUSKY=0

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the build output from the builder stage
COPY --from=builder /app/.next ./.next

# Copy public folder and next.config.js if needed
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
