# Base image - Node.js 20 사용
FROM node:20.14.0-alpine

# Create and set working directory
WORKDIR /app
ENV HUSKY=0

# Copy package.json and install dependencies using npm
COPY package.json package-lock.json ./
RUN npm ci --only=production  # --only=production으로 devDependencies 제외하고 설치

# Copy all project files to the container
COPY . .

# Build Next.js project
RUN npm run build

# Expose the port (Next.js uses 3000 by default)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
