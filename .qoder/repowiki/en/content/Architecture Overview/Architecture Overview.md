# Architecture Overview

<cite>
**Referenced Files in This Document**
- [ARCHITECTURE.md](file://ARCHITECTURE.md)
- [README.md](file://README.md)
- [TESTING.md](file://TESTING.md)
- [events.ts](file://shared/events.ts)
- [types.ts](file://shared/types.ts)
- [index.ts](file://src/server/index.ts)
- [game-engine.ts](file://src/server/services/game-engine.ts)
- [room-manager.ts](file://src/server/services/room-manager.ts)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts)
- [register.ts](file://src/server/puzzles/register.ts)
- [config-loader.ts](file://src/server/utils/config-loader.ts)
- [socket.ts](file://src/client/lib/socket.ts)
- [main.ts](file://src/client/main.ts)
- [puzzle.ts](file://src/client/screens/puzzle.ts)
- [postgres-service.ts](file://src/server/repositories/postgres-service.ts)
- [redis-service.ts](file://src/server/repositories/redis-service.ts)
- [vitest.config.ts](file://vitest.config.ts)
- [playwright.config.ts](file://playwright.config.ts)
- [setup.ts](file://src/client/__tests__/setup.ts)
- [example.test.ts](file://src/client/__tests__/example.test.ts)
- [cipher-decode.test.ts](file://src/server/puzzles/cipher-decode.test.ts)
- [collaborative-wiring.test.ts](file://src/server/puzzles/collaborative-wiring.test.ts)
- [room-manager.test.ts](file://src/server/services/room-manager.test.ts)
- [lobby.spec.ts](file://e2e/lobby.spec.ts)
- [puzzles.spec.ts](file://e2e/puzzles.spec.ts)
</cite>

## Update Summary
**Changes Made**
- Updated testing infrastructure documentation to reflect Bun's built-in test runner adoption
- Removed references to Playwright framework from architecture overview
- Added comprehensive testing workflow documentation covering unit, integration, and E2E testing
- Updated development workflow to reflect new testing approach
- Enhanced testing configuration documentation with Vitest and Playwright setup

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Testing Infrastructure](#testing-infrastructure)
6. [Detailed Component Analysis](#detailed-component-analysis)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)

## Introduction
This document presents the architecture of Project ODYSSEY, a co-op escape room engine built with a clean architecture approach. The system separates concerns across three layers:
- Client: Vanilla TypeScript/Vite front-end with real-time UI updates via Socket.io.
- Server: Bun-based Socket.io server orchestrating game state, rooms, and puzzle logic.
- Data: Redis for room/session persistence and PostgreSQL via Prisma for scores.

It is event-driven, config-first, and data-driven. The design emphasizes modularity, pluggable puzzle handlers, typed event systems, and scalable service architecture.

**Updated** The project now uses Bun's built-in test runner as the primary testing infrastructure, replacing previous testing frameworks and adopting a comprehensive testing strategy with unit, integration, and end-to-end testing approaches.

## Project Structure
The repository is organized into:
- shared/: Shared contracts (types, events, logger) consumed by both client and server.
- src/server/: Bun server with services (game engine, room manager), puzzle handlers, repositories, and utilities.
- src/client/: Vite-served client with screens, puzzle renderers, routing, and Socket.io wrapper.
- config/: YAML-based level definitions.
- prisma/: Prisma schema and configuration for PostgreSQL.
- src/client/__tests__/: Client-side unit tests with Vitest and DOM mocking.
- src/server/puzzles/: Server-side puzzle logic with Bun test runner.
- e2e/: End-to-end tests using Playwright for browser automation.

```mermaid
graph TB
subgraph "Client Layer"
C_MAIN["src/client/main.ts"]
C_SOCKET["src/client/lib/socket.ts"]
C_SCREENS["src/client/screens/*"]
C_PUZZLES["src/client/puzzles/*"]
C_TESTS["src/client/__tests__/*"]
end
subgraph "Server Layer"
S_ENTRY["src/server/index.ts"]
S_ENGINE["src/server/services/game-engine.ts"]
S_ROOM["src/server/services/room-manager.ts"]
S_PUZZLE_IF["src/server/puzzles/puzzle-handler.ts"]
S_PUZZLE_REG["src/server/puzzles/register.ts"]
S_CONFIG["src/server/utils/config-loader.ts"]
S_REDIS["src/server/repositories/redis-service.ts"]
S_PG["src/server/repositories/postgres-service.ts"]
S_SERVER_TESTS["src/server/puzzles/*.test.ts"]
S_ROOM_TESTS["src/server/services/room-manager.test.ts"]
end
subgraph "Shared Layer"
SH_TYPES["shared/types.ts"]
SH_EVENTS["shared/events.ts"]
end
subgraph "Testing Infrastructure"
T_VITEST["Vitest Config"]
T_PLAYWRIGHT["Playwright Config"]
T_CLIENT_TESTS["Client Unit Tests"]
T_SERVER_TESTS["Server Unit Tests"]
T_E2E_TESTS["End-to-End Tests"]
end
subgraph "External"
EXT_WS["Socket.io Server"]
EXT_REDIS["Redis"]
EXT_PG["PostgreSQL"]
end
C_MAIN --> C_SOCKET
C_SOCKET --> EXT_WS
EXT_WS --> S_ENTRY
S_ENTRY --> S_ROOM
S_ENTRY --> S_ENGINE
S_ENGINE --> S_PUZZLE_IF
S_PUZZLE_IF --> S_PUZZLE_REG
S_ENTRY --> S_REDIS
S_ENTRY --> S_PG
S_ENGINE --> S_CONFIG
S_ROOM --> S_REDIS
S_PG --> EXT_PG
S_REDIS --> EXT_REDIS
SH_TYPES -.-> S_ENGINE
SH_EVENTS -.-> S_ENTRY
SH_EVENTS -.-> C_SOCKET
T_VITEST --> C_TESTS
T_PLAYWRIGHT --> T_E2E_TESTS
```

**Diagram sources**
- [index.ts](file://src/server/index.ts#L1-L321)
- [game-engine.ts](file://src/server/services/game-engine.ts#L1-L711)
- [room-manager.ts](file://src/server/services/room-manager.ts#L1-L262)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L1-L57)
- [register.ts](file://src/server/puzzles/register.ts#L1-L21)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L1-L135)
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [main.ts](file://src/client/main.ts#L1-L266)
- [events.ts](file://shared/events.ts#L1-L228)
- [types.ts](file://shared/types.ts#L1-L187)
- [vitest.config.ts](file://vitest.config.ts#L1-L42)
- [playwright.config.ts](file://playwright.config.ts#L1-L85)

**Section sources**
- [ARCHITECTURE.md](file://ARCHITECTURE.md#L35-L107)
- [README.md](file://README.md#L79-L98)

## Core Components
- Shared Contracts
  - Types: Player, Room, GameState, PuzzleConfig, PlayerView, enums for phases and statuses.
  - Events: Strongly typed ClientEvents and ServerEvents with payload interfaces.
- Server Entry and Real-Time Orchestration
  - Socket.io server wiring, Redis adapter for multi-instance support, and event handlers for lobby, gameplay, and admin events.
- Game Engine
  - State machine managing phases (lobby → level_intro → briefing → playing → puzzle_transition → victory/defeat), timers, glitch, and puzzle lifecycle.
- Room Manager
  - In-memory room store with Redis persistence; handles creation, joining, leaving, and reconnection logic.
- Puzzle Handlers
  - Pluggable interface with registration; each handler implements initialization, action handling, win checking, and role-specific views.
- Configuration System
  - YAML-based levels loaded at startup and watched for hot-reload; validated at runtime.
- Repositories
  - RedisService persists rooms and scores; PostgresService stores scores via Prisma.
- Client
  - Socket wrapper, typed event handlers, screen router, and puzzle renderers.
- Testing Infrastructure
  - Bun's built-in test runner for unit tests with comprehensive mocking and coverage.
  - Playwright for end-to-end browser automation testing.
  - Vitest configuration with happy-dom environment for client-side testing.

**Section sources**
- [events.ts](file://shared/events.ts#L28-L90)
- [types.ts](file://shared/types.ts#L7-L187)
- [index.ts](file://src/server/index.ts#L14-L321)
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L154)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L12-L56)
- [register.ts](file://src/server/puzzles/register.ts#L14-L20)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L25-L95)
- [redis-service.ts](file://src/server/repositories/redis-service.ts#L39-L67)
- [postgres-service.ts](file://src/server/repositories/postgres-service.ts#L24-L67)
- [socket.ts](file://src/client/lib/socket.ts#L11-L85)
- [main.ts](file://src/client/main.ts#L47-L266)

## Architecture Overview
Project ODYSSEY follows clean architecture with clear boundaries:
- Client Layer: UI screens, routing, and Socket.io client wrapper.
- Server Layer: Services (GameEngine, RoomManager), repositories, and utilities.
- Data Layer: Redis and PostgreSQL via Prisma.
- Shared Layer: Types and events.

Event-driven communication uses Socket.io with typed events. The system is config-first and data-driven, enabling new levels and puzzles without changing core engine code.

**Updated** The architecture now includes a comprehensive testing infrastructure that supports multiple testing approaches: unit testing with Bun's test runner, client-side DOM testing with Vitest, and end-to-end testing with Playwright.

```mermaid
graph TB
CLIENT["Client (Vite + Vanilla TS)"]
SERVER["Server (Bun + Socket.io)"]
DATA_REDIS["Redis"]
DATA_PG["PostgreSQL"]
TESTING["Testing Infrastructure"]
CLIENT -- "Typed Events" --> SERVER
SERVER -- "Room CRUD" --> DATA_REDIS
SERVER -- "Scores" --> DATA_PG
CLIENT -.-> TESTING
SERVER -.-> TESTING
subgraph "Server Services"
RM["RoomManager"]
GE["GameEngine"]
CFG["ConfigLoader"]
RH["PuzzleHandlers"]
end
SERVER --> RM
SERVER --> GE
SERVER --> CFG
SERVER --> RH
```

**Diagram sources**
- [index.ts](file://src/server/index.ts#L86-L305)
- [room-manager.ts](file://src/server/services/room-manager.ts#L14-L262)
- [game-engine.ts](file://src/server/services/game-engine.ts#L14-L711)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L25-L135)
- [redis-service.ts](file://src/server/repositories/redis-service.ts#L39-L67)
- [postgres-service.ts](file://src/server/repositories/postgres-service.ts#L24-L67)

## Testing Infrastructure
The project employs a multi-layered testing strategy using modern JavaScript testing tools:

### Unit Testing with Bun
- **Primary Test Runner**: Bun's built-in test runner provides fast, native JavaScript testing.
- **Server-Side Tests**: Located alongside source files with `.test.ts` extension.
- **Mocking**: Comprehensive mocking of Redis, database connections, and external dependencies.
- **Coverage**: Automatic coverage reporting for server-side logic.

### Client-Side Testing with Vitest
- **Environment**: happy-dom for fast DOM simulation without browser overhead.
- **Setup**: Global test setup with socket mocking and logger stubs.
- **Coverage**: Dedicated coverage reporting for client-side code.
- **Aliases**: Path aliases configured for clean imports (@client, @shared).

### End-to-End Testing with Playwright
- **Browser Automation**: Multi-browser testing across Chrome, Firefox, Safari, and mobile devices.
- **Real Environment**: Tests run against the actual development server.
- **WebSocket Integration**: Direct WebSocket testing for real-time features.
- **Cross-Platform**: Mobile viewport testing and responsive design validation.

### Testing Workflow
- **Development**: `bun test --watch` for continuous feedback during development.
- **CI/CD**: Automated testing pipeline with parallel execution and coverage reporting.
- **Manual Testing**: Browser-based manual verification for complex scenarios.

**Section sources**
- [TESTING.md](file://TESTING.md#L1-L102)
- [vitest.config.ts](file://vitest.config.ts#L1-L42)
- [playwright.config.ts](file://playwright.config.ts#L1-L85)
- [setup.ts](file://src/client/__tests__/setup.ts#L1-L54)
- [example.test.ts](file://src/client/__tests__/example.test.ts#L1-L59)
- [cipher-decode.test.ts](file://src/server/puzzles/cipher-decode.test.ts#L1-L74)
- [collaborative-wiring.test.ts](file://src/server/puzzles/collaborative-wiring.test.ts#L1-L63)
- [room-manager.test.ts](file://src/server/services/room-manager.test.ts#L1-L56)

## Detailed Component Analysis

### Game Engine
The Game Engine is the core state machine orchestrating the game lifecycle per room. It:
- Initializes and validates levels, timers, and glitch state.
- Manages phases and transitions (briefing, playing, puzzle_transition).
- Coordinates role assignment and per-player views.
- Applies glitch penalties and checks for defeat conditions.
- Calculates and records scores upon victory.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Server Entry"
participant Engine as "GameEngine"
participant Room as "RoomManager"
participant Repo as "PostgresService"
Client->>Server : "START_GAME"
Server->>Engine : startGame(room, index?)
Engine->>Engine : validate level, init state, start timer
Engine->>Client : "GAME_STARTED", "PHASE_CHANGE"
Client-->>Server : "PLAYER_READY"
Server->>Engine : handlePlayerReady(room, playerId)
Engine->>Engine : startPuzzleBriefing(room)
Engine->>Client : "BRIEFING", "PHASE_CHANGE"
Client-->>Server : "READY"
Server->>Engine : handlePlayerReady(...)
Engine->>Engine : startPuzzle(room, level, index)
Engine->>Client : "ROLES_ASSIGNED", "PUZZLE_START"
loop puzzle lifecycle
Client-->>Server : "PUZZLE_ACTION"
Server->>Engine : handlePuzzleAction(room, playerId, action, data)
Engine->>Engine : handler.handleAction(...) + checkWin()
Engine->>Client : "PUZZLE_UPDATE"
end
alt win
Engine->>Client : "PUZZLE_COMPLETED"
Engine->>Engine : advance or handleVictory()
Engine->>Repo : createGameScore(...)
Engine->>Client : "VICTORY"
else lose
Engine->>Client : "DEFEAT"
end
```

**Diagram sources**
- [index.ts](file://src/server/index.ts#L154-L243)
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L521)
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L154)
- [postgres-service.ts](file://src/server/repositories/postgres-service.ts#L28-L39)

**Section sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [game-engine.ts](file://src/server/services/game-engine.ts#L263-L319)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)
- [game-engine.ts](file://src/server/services/game-engine.ts#L388-L424)
- [game-engine.ts](file://src/server/services/game-engine.ts#L488-L521)
- [game-engine.ts](file://src/server/services/game-engine.ts#L526-L550)
- [game-engine.ts](file://src/server/services/game-engine.ts#L567-L596)
- [game-engine.ts](file://src/server/services/game-engine.ts#L601-L665)
- [game-engine.ts](file://src/server/services/game-engine.ts#L678-L710)

### Room Manager
Room Manager maintains in-memory rooms and persists them to Redis. It:
- Generates room codes and enforces capacity limits.
- Handles joins, leaves, reconnections, and host reassignment.
- Persists all mutations to Redis for durability and multi-instance support.

```mermaid
flowchart TD
Start(["Join Request"]) --> FindRoom["Find Room in Memory"]
FindRoom --> Found{"Found?"}
Found --> |No| RestoreFromRedis["Restore from Redis"]
RestoreFromRedis --> Found
Found --> |No| ReturnError["Return 'Room not found'"]
Found --> |Yes| ReconnectLogic["Reconnection Logic"]
ReconnectLogic --> Full{"Capacity?"}
Full --> |Full| ReturnFull["Return 'Room full'"]
Full --> |Open| AddPlayer["Add Player to Room"]
AddPlayer --> Persist["Persist to Redis"]
Persist --> Done(["Done"])
ReturnError --> Done
ReturnFull --> Done
```

**Diagram sources**
- [room-manager.ts](file://src/server/services/room-manager.ts#L89-L154)
- [room-manager.ts](file://src/server/services/room-manager.ts#L239-L261)

**Section sources**
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L87)
- [room-manager.ts](file://src/server/services/room-manager.ts#L89-L154)
- [room-manager.ts](file://src/server/services/room-manager.ts#L156-L189)
- [room-manager.ts](file://src/server/services/room-manager.ts#L191-L204)
- [room-manager.ts](file://src/server/services/room-manager.ts#L239-L261)

### Puzzle Handlers and Registry
Puzzle Handlers implement a common interface and are registered centrally. The engine retrieves the appropriate handler by puzzle type and delegates:
- Initialization of puzzle state.
- Action handling and glitch deltas.
- Win condition checks.
- Per-player role-specific views.

```mermaid
classDiagram
class PuzzleHandler {
+init(players, config) PuzzleState
+handleAction(state, playerId, action, data) Result
+checkWin(state) boolean
+getPlayerView(state, playerId, role, config) PlayerView
}
class Registry {
+registerPuzzleHandler(type, handler) void
+getPuzzleHandler(type) PuzzleHandler
}
class AsymmetricSymbolsHandler
class RhythmTapHandler
class CollaborativeWiringHandler
class CipherDecodeHandler
class CollaborativeAssemblyHandler
class AlphabetWallHandler
class DemogorgonHuntHandler
Registry --> PuzzleHandler : "manages"
AsymmetricSymbolsHandler ..|> PuzzleHandler
RhythmTapHandler ..|> PuzzleHandler
CollaborativeWiringHandler ..|> PuzzleHandler
CipherDecodeHandler ..|> PuzzleHandler
CollaborativeAssemblyHandler ..|> PuzzleHandler
AlphabetWallHandler ..|> PuzzleHandler
DemogorgonHuntHandler ..|> PuzzleHandler
```

**Diagram sources**
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L12-L56)
- [register.ts](file://src/server/puzzles/register.ts#L14-L20)

**Section sources**
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L12-L56)
- [register.ts](file://src/server/puzzles/register.ts#L14-L20)

### Client Screens and Real-Time Updates
The client connects via Socket.io and reacts to server events to drive UI:
- Bootstraps audio, screens, and HUD.
- Subscribes to timer, glitch, phase, puzzle start/update, and results events.
- Navigates between screens (lobby, level-intro, briefing, puzzle, results).
- Dispatches actions to the server and renders puzzle-specific UI.

```mermaid
sequenceDiagram
participant Boot as "Client main.ts"
participant Socket as "socket.ts"
participant Server as "Server index.ts"
participant Screens as "screens/*"
Boot->>Socket : connect()
Socket-->>Boot : "connect"
Boot->>Screens : init screens
Server-->>Boot : "GAME_STARTED"
Boot->>Boot : apply theme, load music
Server-->>Boot : "PHASE_CHANGE"
Boot->>Screens : showScreen("briefing"|"puzzle"|"results")
Server-->>Boot : "PUZZLE_START"
Boot->>Screens : render puzzle by type
Server-->>Boot : "PUZZLE_UPDATE"
Boot->>Screens : update puzzle view
Server-->>Boot : "VICTORY"/"DEFEAT"
Boot->>Screens : show results
```

**Diagram sources**
- [main.ts](file://src/client/main.ts#L47-L266)
- [socket.ts](file://src/client/lib/socket.ts#L11-L85)
- [index.ts](file://src/server/index.ts#L86-L305)
- [puzzle.ts](file://src/client/screens/puzzle.ts#L23-L101)

**Section sources**
- [main.ts](file://src/client/main.ts#L47-L266)
- [socket.ts](file://src/client/lib/socket.ts#L11-L85)
- [puzzle.ts](file://src/client/screens/puzzle.ts#L23-L101)

### Configuration System (Config-First and Data-Driven)
Levels are defined in YAML and loaded at startup with hot-reload:
- Loads all .yaml/.yml files, parses into LevelConfig, validates, and exposes summaries.
- Provides default level retrieval and level selection per room.
- Enables dynamic addition of levels and puzzles without code changes.

```mermaid
flowchart TD
Start(["Startup"]) --> Scan["Scan config directory"]
Scan --> Parse["Parse YAML to LevelConfig"]
Parse --> Validate["Validate LevelConfig"]
Validate --> Store["Store in memory map"]
Store --> Watch["Watch for changes"]
Watch --> Reload["Reload on change"]
Reload --> Validate
```

**Diagram sources**
- [config-loader.ts](file://src/server/utils/config-loader.ts#L25-L95)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L100-L134)

**Section sources**
- [config-loader.ts](file://src/server/utils/config-loader.ts#L25-L95)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L100-L134)

### Data Persistence
- Redis: Room serialization/deserialization and short-lived caching; used for room CRUD and crash recovery.
- PostgreSQL: Scores persisted via Prisma; supports top-N leaderboards.

```mermaid
graph LR
GE["GameEngine"] -- "createGameScore(...)" --> PG["PostgresService"]
RM["RoomManager"] -- "saveRoom(room)" --> RS["RedisService"]
RS --> REDIS["Redis"]
PG --> DB["PostgreSQL"]
```

**Diagram sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L458-L483)
- [postgres-service.ts](file://src/server/repositories/postgres-service.ts#L28-L39)
- [room-manager.ts](file://src/server/services/room-manager.ts#L239-L245)
- [redis-service.ts](file://src/server/repositories/redis-service.ts#L40-L44)

**Section sources**
- [redis-service.ts](file://src/server/repositories/redis-service.ts#L39-L67)
- [postgres-service.ts](file://src/server/repositories/postgres-service.ts#L24-L67)

## Dependency Analysis
- Clean Architecture Layers
  - Client depends on shared events and types; it emits client events and reacts to server events.
  - Server depends on shared types and events; it orchestrates services and repositories.
  - Repositories depend on external databases; services encapsulate domain logic.
- Coupling and Cohesion
  - Puzzle handlers are loosely coupled via the shared interface and registry.
  - GameEngine and RoomManager are cohesive around game lifecycle and room management respectively.
- External Dependencies
  - Socket.io for real-time bidirectional events.
  - Redis for distributed room state and multi-instance scaling.
  - PostgreSQL via Prisma for durable scoring.
  - Bun for native JavaScript testing and development.
  - Vitest for client-side DOM testing with happy-dom.
  - Playwright for end-to-end browser automation.

```mermaid
graph TB
SH_TYPES["shared/types.ts"]
SH_EVENTS["shared/events.ts"]
C_MAIN["client/main.ts"]
C_SOCKET["client/lib/socket.ts"]
S_ENTRY["server/index.ts"]
S_ENGINE["server/services/game-engine.ts"]
S_ROOM["server/services/room-manager.ts"]
S_PUZZLE_IF["server/puzzles/puzzle-handler.ts"]
S_PUZZLE_REG["server/puzzles/register.ts"]
S_CONFIG["server/utils/config-loader.ts"]
S_REDIS["server/repositories/redis-service.ts"]
S_PG["server/repositories/postgres-service.ts"]
C_MAIN --> C_SOCKET
C_SOCKET --> SH_EVENTS
S_ENTRY --> S_ENGINE
S_ENTRY --> S_ROOM
S_ENGINE --> S_PUZZLE_IF
S_PUZZLE_IF --> S_PUZZLE_REG
S_ENGINE --> S_CONFIG
S_ROOM --> S_REDIS
S_ENTRY --> S_REDIS
S_ENTRY --> S_PG
S_ENGINE --> SH_TYPES
S_ENGINE --> SH_EVENTS
S_ROOM --> SH_TYPES
S_PUZZLE_IF --> SH_TYPES
```

**Diagram sources**
- [types.ts](file://shared/types.ts#L1-L187)
- [events.ts](file://shared/events.ts#L1-L228)
- [main.ts](file://src/client/main.ts#L14-L44)
- [socket.ts](file://src/client/lib/socket.ts#L5-L85)
- [index.ts](file://src/server/index.ts#L14-L45)
- [game-engine.ts](file://src/server/services/game-engine.ts#L14-L46)
- [room-manager.ts](file://src/server/services/room-manager.ts#L14-L16)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L5-L6)
- [register.ts](file://src/server/puzzles/register.ts#L5-L12)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L9-L10)
- [redis-service.ts](file://src/server/repositories/redis-service.ts#L4-L7)
- [postgres-service.ts](file://src/server/repositories/postgres-service.ts#L1-L3)

**Section sources**
- [index.ts](file://src/server/index.ts#L14-L45)
- [game-engine.ts](file://src/server/services/game-engine.ts#L14-L46)
- [room-manager.ts](file://src/server/services/room-manager.ts#L14-L16)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L5-L6)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L9-L10)
- [redis-service.ts](file://src/server/repositories/redis-service.ts#L4-L7)
- [postgres-service.ts](file://src/server/repositories/postgres-service.ts#L1-L3)

## Performance Considerations
- Real-time responsiveness: Socket.io minimizes latency for synchronized state updates.
- Hot-reload for levels: Chokidar watches config directory to avoid restarts during development.
- Redis TTL: Rooms expire after inactivity to free memory; adjust TTL for production needs.
- Timer efficiency: GameEngine maintains per-room timers and stops them on game end to prevent leaks.
- Scalability: Redis adapter enables horizontal scaling across instances.
- Testing performance: Bun's native test runner provides faster execution than traditional JavaScript test runners.
- DOM testing speed: happy-dom environment in Vitest provides fast browser simulation for client tests.

## Troubleshooting Guide
- Socket connection errors
  - Verify CORS configuration and client port alignment.
  - Check connection logs and reconnection attempts.
- Room persistence failures
  - Confirm Redis connectivity and availability; review save/load logs.
- Score recording issues
  - Validate DATABASE_URL and Prisma client initialization.
- Level loading problems
  - Inspect YAML parsing and validation logs; ensure required fields exist.
- Testing issues
  - **Updated** For Bun test runner: verify test file extensions (.test.ts) and proper module imports.
  - **Updated** For Vitest: ensure happy-dom environment is properly configured and mocks are correctly set up.
  - **Updated** For Playwright: check browser compatibility and network connectivity for E2E tests.

**Section sources**
- [index.ts](file://src/server/index.ts#L54-L61)
- [socket.ts](file://src/client/lib/socket.ts#L24-L34)
- [redis-service.ts](file://src/server/repositories/redis-service.ts#L9-L15)
- [postgres-service.ts](file://src/server/repositories/postgres-service.ts#L14-L22)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L46-L64)

## Conclusion
Project ODYSSEY's architecture cleanly separates client, server, and data concerns while embracing event-driven, config-first, and data-driven design. The typed event system, pluggable puzzle handlers, and modular services enable rapid iteration and scalability. The combination of Redis and PostgreSQL ensures both real-time collaboration and durable scoring, while the Socket.io-based real-time layer delivers responsive, synchronized gameplay.

**Updated** The architecture now includes a comprehensive testing infrastructure that supports multiple testing approaches, ensuring code quality across the entire development lifecycle. The adoption of Bun's built-in test runner, Vitest for client-side DOM testing, and Playwright for end-to-end browser automation provides robust coverage and reliable development workflow. This multi-layered testing strategy enhances maintainability, reduces regression risks, and accelerates development cycles while maintaining the system's architectural integrity.