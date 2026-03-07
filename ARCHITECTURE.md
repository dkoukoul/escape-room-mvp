# Architecture — Project ODYSSEY

> Co-op escape room engine: Bun server + Vite client + Socket.io real-time comms.

## System Overview

```
┌─────────────────┐    Socket.io     ┌─────────────────────────────────────────┐
│  Vite Client    │◄───────────────►│  Bun Server (src/server/index.ts)       │
│  (Vanilla TS)   │   WebSocket      │                                         │
│  Port 5173      │                  │  ┌─────────────┐  ┌──────────────────┐  │
└─────────────────┘                  │  │ GameEngine   │  │ PuzzleHandlers   │  │
                                     │  │ (state       │──│ (pluggable per   │  │
                                     │  │  machine)    │  │  puzzle type)    │  │
                                     │  └──────┬───────┘  └──────────────────┘  │
                                     │         │                                │
                                     │  ┌──────┴───────┐                        │
                                     │  │ RoomManager   │                        │
                                     │  └──────┬───────┘                        │
                                     │         │                                │
                                     │  ┌──────┴───────┐  ┌──────────────────┐  │
                                     │  │ Redis        │  │ Postgres         │  │
                                     │  │ (rooms,      │  │ (scores via      │  │
                                     │  │  sessions)   │  │  Prisma)         │  │
                                     │  └──────────────┘  └──────────────────┘  │
                                     └─────────────────────────────────────────┘
```

**Tech stack:** Bun (runtime), TypeScript (language), Socket.io (real-time), Vite (client dev/build), vanilla CSS (styling), YAML (level config), Redis (room persistence), PostgreSQL + Prisma (score storage).

> **Note:** The README mentions React and TailwindCSS — these are **not used**. The client is vanilla TypeScript with manual DOM manipulation via `src/client/lib/dom.ts`.

---

## Directory Map

```
escape-room-mvp/
├── shared/                        # Source of truth for types & events
│   ├── types.ts                   #   All interfaces: Player, Room, GameState, PuzzleConfig, etc.
│   ├── events.ts                  #   Socket event names + payload interfaces (Client→Server & Server→Client)
│   └── logger.ts                  #   Shared winston logger config
│
├── src/server/                    # Bun server
│   ├── index.ts                   #   Entry point: Socket.io setup, all event handlers
│   ├── services/
│   │   ├── game-engine.ts         #   Core state machine (lobby→intro→briefing→playing→victory/defeat)
│   │   ├── room-manager.ts        #   In-memory room CRUD, backed by Redis
│   │   └── role-assigner.ts       #   Assigns roles to players per puzzle layout
│   ├── puzzles/
│   │   ├── puzzle-handler.ts      #   PuzzleHandler interface + registry
│   │   ├── register.ts            #   Registers all 10 puzzle handlers
│   │   ├── asymmetric-symbols.ts  #   Puzzle: one navigator sees solution, decoders click letters
│   │   ├── rhythm-tap.ts          #   Puzzle: all players tap colors in sequence
│   │   ├── collaborative-wiring.ts#   Puzzle: players coordinate wire connections
│   │   ├── cipher-decode.ts       #   Puzzle: decode cipher text with role-based clues
│   │   ├── collaborative-assembly.ts # Puzzle: assemble fragments on a grid
│   │   ├── labyrinth-navigate.ts  #   Puzzle: maze navigation with split vision
│   │   ├── echo-relay.ts          #   Puzzle: frequency tuning to decode garbled text
│   │   └── star-alignment.ts      #   Puzzle: place stars to form constellation
│   ├── repositories/
│   │   ├── redis-service.ts       #   Room serialization/deserialization to Redis
│   │   └── postgres-service.ts    #   Score CRUD via Prisma
│   └── utils/
│       ├── config-loader.ts       #   YAML level loader with hot-reload (chokidar)
│       ├── config-validator.ts    #   Runtime validation of parsed YAML configs
│       ├── timer.ts               #   Game timer (countdown per room)
│       ├── logger.ts              #   Server-side winston logger instance
│       └── utils.ts               #   Small utility functions
│
├── src/client/                    # Vite-served client (vanilla TS + CSS)
│   ├── index.html                 #   HTML shell with screen divs and HUD
│   ├── main.ts                    #   Entry point: boots all screens, connects socket
│   ├── lib/
│   │   ├── dom.ts                 #   DOM helpers: h(), $(), mount(), clear()
│   │   ├── router.ts              #   Screen manager: showScreen("lobby"|"puzzle"|...)
│   │   ├── socket.ts              #   Socket.io client wrapper: connect(), on(), emit()
│   │   ├── theme-engine.ts        #   Dynamic CSS theme loading
│   │   └── visual-fx.ts           #   Glitch visual effects (matrix rain, scanlines)
│   ├── screens/
│   │   ├── lobby.ts               #   Join/create room, player list, level select, leaderboard
│   │   ├── level-intro.ts         #   Animated story intro with typewriter effect
│   │   ├── briefing.ts            #   Puzzle briefing text + "Ready" button
│   │   ├── puzzle.ts              #   Puzzle container: dispatches to correct renderer by type
│   │   └── results.ts             #   Victory/defeat screen with score
│   ├── puzzles/                   #   Client-side puzzle renderers (one per puzzle type)
│   │   ├── asymmetric-symbols.ts
│   │   ├── rhythm-tap.ts
│   │   ├── collaborative-wiring.ts
│   │   ├── cipher-decode.ts
│   │   ├── collaborative-assembly.ts
│   │   ├── labyrinth-navigate.ts
│   │   ├── echo-relay.ts
│   │   └── star-alignment.ts
│   ├── styles/
│   │   ├── style.css              #   Main styles (lobby, HUD, screens)
│   │   ├── puzzles.css            #   Puzzle-specific styles
│   │   ├── glitch.css             #   Glitch/distortion effects
│   │   └── themes/                #   Theme CSS files loaded per level
│   ├── audio/                     #   Audio manager (zzfx-based)
│   └── types/                     #   Client-specific type augmentations
│
├── config/                        # YAML level definitions
│   ├── level_01.yaml              #   "The Akropolis Defragmentation" — 8 puzzles
│   └── sample-level               #   Reference/template level
│
├── prisma/
│   ├── schema.prisma              #   DB schema: GameScore model
│   └── prisma.config.ts           #   Prisma config (connection URL, migrations path)
│
├── docker-compose.yml             #   Redis + Postgres containers
└── vite.config.ts                 #   Vite: aliases (@shared, @client), proxy /socket.io
```

---

## Key Abstractions

### Game Phase State Machine

The server manages a `GamePhase` for each room:

```
lobby → level_intro → briefing → playing → puzzle_transition → briefing → playing → ... → victory
                                                                                      └→ defeat
```

Transitions are driven by `game-engine.ts`. The client reacts to `PHASE_CHANGE` events.

### PuzzleHandler Interface

Every puzzle type implements `PuzzleHandler` (defined in `puzzle-handler.ts`):

```typescript
interface PuzzleHandler {
  init(players, config): PuzzleState; // Setup initial state
  handleAction(state, playerId, action, data): { state; glitchDelta }; // Process player input
  checkWin(state): boolean; // Victory condition
  getPlayerView(state, playerId, role, config): PlayerView; // Role-specific view
}
```

Handlers are registered in `register.ts`. The engine calls them generically — it doesn't know puzzle-specific logic.

### Asymmetric Views (Role System)

Each puzzle defines roles in its YAML `layout.roles` array. Players are assigned roles by `role-assigner.ts`. `getPlayerView()` returns different `viewData` per role — this is how one player sees the solution while others see input controls.

### Socket Events

All event names and payload types are defined in `shared/events.ts`:

- `ClientEvents` — client → server (e.g., `PUZZLE_ACTION`, `CREATE_ROOM`)
- `ServerEvents` — server → client (e.g., `PUZZLE_UPDATE`, `GAME_STARTED`)

The server's `index.ts` wires `socket.on(ClientEvents.X)` handlers. The client uses `on(ServerEvents.X)` / `emit(ClientEvents.X)` via `lib/socket.ts`.

---

## How To: Add a New Puzzle

1. **Server handler:** Create `src/server/puzzles/my-puzzle.ts` implementing `PuzzleHandler`
2. **Register:** Add to `src/server/puzzles/register.ts`
3. **Type union:** Add `"my_puzzle"` to `PuzzleType` in `shared/types.ts`
4. **Client renderer:** Create `src/client/puzzles/my-puzzle.ts` with `render*()` and `update*()` exports
5. **Dispatch:** Add a `case "my_puzzle"` in `src/client/screens/puzzle.ts` (both `renderPuzzle` and `updatePuzzle`)
6. **YAML config:** Add a puzzle entry in your level YAML file under `puzzles:`
7. **Styles:** Add puzzle-specific CSS to `src/client/styles/puzzles.css`

## How To: Add a New Screen

1. Add a `<div id="screen-myscreen" class="screen">` in `src/client/index.html`
2. Add `"myscreen"` to `ScreenName` type in `src/client/lib/router.ts`
3. Create `src/client/screens/myscreen.ts` with an `initMyScreen()` function
4. Call `initMyScreen()` from `src/client/main.ts`
5. Trigger navigation with `showScreen("myscreen")` from anywhere

## How To: Add a New Socket Event

1. Add event name to `ClientEvents` or `ServerEvents` in `shared/events.ts`
2. Define payload interface in the same file
3. **Server:** Add `socket.on(ClientEvents.MY_EVENT, handler)` in `src/server/index.ts`
4. **Client:** Use `on(ServerEvents.MY_EVENT, callback)` and `emit(ClientEvents.MY_EVENT, payload)` from `src/client/lib/socket.ts`

---

## Configuration System

Levels are defined in YAML files under `config/`. The `config-loader.ts` module:

- Reads all `.yaml`/`.yml` files at startup
- Parses them into `LevelConfig` objects (see `shared/types.ts`)
- Validates via `config-validator.ts`
- Watches for file changes (hot-reload in dev via chokidar)

## State Persistence

- **Redis:** Rooms are serialized/deserialized on every mutation (`RedisService.saveRoom()`). On server restart, rooms are reloaded from Redis via `loadAllRooms()`.
- **Postgres (Prisma):** Game scores are stored after victory via `PostgresService.createGameScore()`. Schema is in `prisma/schema.prisma`.

## Path Aliases

Both Vite and TypeScript are configured with:

- `@shared/*` → `./shared/*`
- `@client/*` → `./src/client/*`
- `@server/*` → `./src/server/*` (tsconfig only)
