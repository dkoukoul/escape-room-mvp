# Use the official Bun image
FROM oven/bun:latest AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install

# Copy the rest of the source code
COPY . .

# Generate Prisma client
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN bunx prisma generate

# Production stage
FROM base AS release
# If you need to build your Vite client for production:
# RUN bun run build:client 
CMD ["bun", "run", "start"]