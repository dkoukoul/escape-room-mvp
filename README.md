# ⚡ Project ODYSSEY: A platform for online co-op escape rooms

**Project ODYSSEY** is an open-source, high-performance co-op escape room engine built for the web. It is designed for **2 to 6 players** to solve asymmetric, logic-based puzzles in a high-stakes, "glitching" environment.

The first mission: **The Akropolis Defragmentation.**

Try it out at: [odyssey.kpopgenerator.cloud](https://odyssey.kpopgenerator.cloud)

---

## 🏛️ The Story (Mission 01)

The year is 2084. Global history is stored in a supercomputer beneath Athens. A group known as _The Erasers_ has uploaded the **Chronos Virus**. Ancient Greece is pixelating. You and your squad are **Cyber-Hoplites**—digital soldiers sent into the simulation to repair the "Glitch" before the Parthenon (and democracy) is deleted forever.

---

## 🛠️ Tech Stack

- **Runtime:** [Bun](https://bun.sh/) (Fastest TS/JS runtime)
- **Language:** TypeScript
- **Communication:** Socket.io (Real-time state synchronization)
- **Frontend:** Vite (dev server + bundler) + Vanilla TypeScript + CSS
- **Configuration:** YAML (For levels, puzzles, and role definitions)
- **Audio:** ElevenLabs AI (Greek Voiceover) + Web Audio API (Glitch SFX via zzfx)
- **Database:** PostgreSQL + Prisma ORM (score storage)
- **Cache:** Redis (room persistence + session state)

---

## ⚙️ Config-First Architecture

The architecture must follow the clean architecture principles.
The game is entirely data-driven. To create a new puzzle or level, you don't need to touch the core engine—you simply edit the `levels/` directory.

### Example Level Configuration (`level_01.yaml`)

```yaml
id: "akropolis_gate"
title: "The Neon Propylaea"
min_players: 2
max_players: 6
timer_seconds: 600
glitch_intensity: 0.2

puzzles:
  - id: "doric_code_01"
    type: "asymmetric_symbols"
    layout:
      navigators: 1 # Sees the solution
      decoders: 5 # Must click the flying letters
    data:
      solution_words: ["ΦΙΛΟΣΟΦΙΑ", "ΔΗΜΟΚΡΑΤΙΑ", "ΗΡΩΣ"]
      glitch_speed: "fast"

  - id: "power_sync"
    type: "rhythm_tap"
    layout:
      all_players: true
    data:
      sequence: ["blue", "red", "green", "yellow"]
      tolerance_ms: 500

audio_cues:
  intro: "athena_welcome_01.mp3"
  glitch_warning: "athena_system_failure.mp3"
```

---

## 🕹️ Game Mechanics

- **Role Randomization:** Every time a game starts, players are assigned roles (e.g., _The Strategos_, _The Tech-Oracle_, _The Engineer_).
- **Asymmetric Views:** If `player.role === 'Navigator'`, they see the map. Everyone else sees static. They _must_ talk to survive.
- **The Glitch Meter:** A shared global state. If someone makes a mistake, the `glitch_value` increases, causing the screen to shake and colors to distort for **everyone**.
- **No Registration:** Players enter a room using a 4-character code (e.g., `zeus`).

---

## 📁 Project Structure

```text
escape-room-mvp/
├── config/              # YAML level definitions
├── shared/              # Shared types, events, logger (source of truth)
├── src/
│   ├── client/          # Vite-served vanilla TS + CSS frontend
│   │   ├── screens/     # UI screens (lobby, puzzle, results, etc.)
│   │   ├── puzzles/     # Client-side puzzle renderers
│   │   ├── lib/         # DOM helpers, router, socket wrapper
│   │   └── styles/      # CSS styles and themes
│   └── server/          # Bun + Socket.io backend
│       ├── services/    # GameEngine, RoomManager, RoleAssigner
│       ├── puzzles/     # Server-side puzzle logic handlers
│       ├── repositories/# Redis + Postgres services
│       └── utils/       # Config loader, timer, logger
├── prisma/              # Prisma schema and migrations
└── package.json
```

> See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed breakdown.

---

## 🚀 Development

### Prerequisites

- [Bun](https://bun.sh/) (latest)
- Docker (for Redis + PostgreSQL)

### Quick Start

```bash
bun install                        # Install dependencies
docker compose up -d               # Start Redis + Postgres
bunx prisma generate               # Generate Prisma client
bun run dev                        # Start both server + client
```

Server runs on `:3000`, client on `:5173`.

### To create a new puzzle:

1.  Define the puzzle logic in `src/server/puzzles/[type].ts` (implement `PuzzleHandler` interface).
2.  Register it in `src/server/puzzles/register.ts`.
3.  Create a client renderer in `src/client/puzzles/[type].ts`.
4.  Add a `case` in `src/client/screens/puzzle.ts`.
5.  Add the new type to `PuzzleType` union in `shared/types.ts`.
6.  Add a new entry in your `.yaml` level file.

> See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed how-to guides.
