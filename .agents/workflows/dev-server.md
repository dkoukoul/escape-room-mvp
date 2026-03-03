---
description: How to start, stop, and test the dev environment
---

# Dev Server Workflow

## Prerequisites

- [Bun](https://bun.sh/) installed
- Docker installed and running (for Redis + Postgres)

## Start Everything

// turbo

1. Start infrastructure:

```bash
docker compose up -d
```

// turbo 2. Generate Prisma client (if schema changed or first run):

```bash
bunx prisma generate
```

// turbo 3. Start both server and client:

```bash
bun run dev
```

This runs `bun run dev:server` (Bun, port 3000) and `bun run dev:client` (Vite, port 5173) concurrently.

## Start Server or Client Individually

// turbo

```bash
bun run dev:server    # Server only (port 3000)
```

// turbo

```bash
bun run dev:client    # Client only (port 5173)
```

## Run Tests

// turbo

```bash
bun test
```

Test files are colocated with source files using the `.test.ts` extension.

## Type Check

// turbo

```bash
bun run typecheck     # Runs: bunx tsc --noEmit
```

## Database Migrations

// turbo

```bash
bunx prisma migrate dev    # Create and apply a migration
```

## Stop Infrastructure

```bash
docker compose down
```

## Environment Variables

Configured in `.env` at the project root. Key variables:

- `SERVER_PORT` — Server port (default: 3000)
- `CLIENT_PORT` — Vite dev server port (default: 5173)
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
