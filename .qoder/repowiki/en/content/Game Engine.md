# Game Engine

<cite>
**Referenced Files in This Document**
- [ARCHITECTURE.md](file://ARCHITECTURE.md)
- [README.md](file://README.md)
- [src/server/index.ts](file://src/server/index.ts)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts)
- [src/server/services/room-manager.ts](file://src/server/services/room-manager.ts)
- [src/server/services/role-assigner.ts](file://src/server/services/role-assigner.ts)
- [src/server/puzzles/puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts)
- [src/server/puzzles/register.ts](file://src/server/puzzles/register.ts)
- [src/server/puzzles/asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts)
- [src/server/utils/timer.ts](file://src/server/utils/timer.ts)
- [src/server/repositories/postgres-service.ts](file://src/server/repositories/postgres-service.ts)
- [src/server/repositories/redis-service.ts](file://src/server/repositories/redis-service.ts)
- [src/server/utils/logger.ts](file://src/server/utils/logger.ts)
- [src/server/utils/config-loader.ts](file://src/server/utils/config-loader.ts)
- [shared/types.ts](file://shared/types.ts)
- [shared/events.ts](file://shared/events.ts)
- [shared/logger.ts](file://shared/logger.ts)
- [src/client/main.ts](file://src/client/main.ts)
- [src/client/lib/socket.ts](file://src/client/lib/socket.ts)
- [src/client/screens/puzzle.ts](file://src/client/screens/puzzle.ts)
- [src/client/logger.ts](file://src/client/logger.ts)
</cite>

## Update Summary
**Changes Made**
- Fixed critical scoring calculation bug in calculateScore function - now properly uses level.timer_seconds instead of hardcoded constants
- Enhanced fairness in scoring calculations by making time-based scoring proportional to intended difficulty and time constraints of each level
- Removed TODO comment regarding Redis persistence for timer state in game-engine.ts
- Improved score calculation algorithm to provide fairer gameplay experiences across different level difficulties
- Updated scoring system to eliminate arbitrary constants and use level-specific time limits

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Enhanced Error Handling and Logging](#enhanced-error-handling-and-logging)
7. [Glitch Management System](#glitch-management-system)
8. [Scoring System Enhancement](#scoring-system-enhancement)
9. [Dependency Analysis](#dependency-analysis)
10. [Performance Considerations](#performance-considerations)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Conclusion](#conclusion)

## Introduction
This document describes the Game Engine that powers Project ODYSSEY, a co-op escape room experience for 2–6 players. The engine orchestrates game phases, puzzle lifecycle, asynchronous roles, and persistent state across a real-time multiplayer environment. It is implemented with Bun (server), Socket.io (real-time), and a vanilla TypeScript/Vite client. Levels and puzzles are configured via YAML, enabling rapid iteration without touching core engine code.

**Updated** Enhanced with comprehensive error handling, defensive programming, robust glitch management, improved game state immutability, and a fixed critical scoring calculation bug that ensures fairer gameplay experiences.

## Project Structure
The repository is organized into server, client, shared, and data layers:
- Server: Socket.io entry point, game engine, room management, puzzle handlers, persistence, and utilities
- Client: Vite-served vanilla TypeScript UI with screens, puzzle renderers, and audio
- Shared: Strongly typed domain models, events, and logging infrastructure
- Data: Prisma schema and PostgreSQL service for scores; Redis-backed room persistence

```mermaid
graph TB
subgraph "Client"
CM["src/client/main.ts"]
CS["src/client/lib/socket.ts"]
CP["src/client/screens/puzzle.ts"]
CL["src/client/logger.ts"]
end
subgraph "Server"
SI["src/server/index.ts"]
GE["src/server/services/game-engine.ts"]
RM["src/server/services/room-manager.ts"]
RA["src/server/services/role-assigner.ts"]
TH["src/server/puzzles/puzzle-handler.ts"]
RG["src/server/puzzles/register.ts"]
AS["src/server/puzzles/asymmetric-symbols.ts"]
TM["src/server/utils/timer.ts"]
PG["src/server/repositories/postgres-service.ts"]
RS["src/server/repositories/redis-service.ts"]
SL["src/server/utils/logger.ts"]
CLD["src/server/utils/config-loader.ts"]
end
subgraph "Shared"
ST["shared/types.ts"]
SE["shared/events.ts"]
SHL["shared/logger.ts"]
end
CM --> CS
CM --> CP
CS --> SI
SI --> GE
GE --> RM
GE --> RA
GE --> TH
GE --> TM
GE --> PG
GE --> SL
TH --> RG
RG --> AS
CM --> CL
CM --> ST
SI --> ST
SI --> SE
SI --> SL
SL --> SHL
CLD --> ST
```

**Diagram sources**
- [src/client/main.ts](file://src/client/main.ts#L1-L266)
- [src/client/lib/socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [src/client/screens/puzzle.ts](file://src/client/screens/puzzle.ts#L1-L101)
- [src/client/logger.ts](file://src/client/logger.ts#L1-L38)
- [src/server/index.ts](file://src/server/index.ts#L1-L321)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L1-L794)
- [src/server/services/room-manager.ts](file://src/server/services/room-manager.ts#L1-L283)
- [src/server/services/role-assigner.ts](file://src/server/services/role-assigner.ts#L1-L78)
- [src/server/puzzles/puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L1-L56)
- [src/server/puzzles/register.ts](file://src/server/puzzles/register.ts#L1-L21)
- [src/server/puzzles/asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L1-L170)
- [src/server/utils/timer.ts](file://src/server/utils/timer.ts#L1-L81)
- [src/server/repositories/postgres-service.ts](file://src/server/repositories/postgres-service.ts#L1-L83)
- [src/server/repositories/redis-service.ts](file://src/server/repositories/redis-service.ts#L1-L50)
- [src/server/utils/logger.ts](file://src/server/utils/logger.ts#L1-L21)
- [src/server/utils/config-loader.ts](file://src/server/utils/config-loader.ts#L1-L147)
- [shared/types.ts](file://shared/types.ts#L1-L181)
- [shared/events.ts](file://shared/events.ts#L1-L228)
- [shared/logger.ts](file://shared/logger.ts#L1-L22)

**Section sources**
- [ARCHITECTURE.md](file://ARCHITECTURE.md#L35-L107)
- [README.md](file://README.md#L79-L98)

## Core Components
- Game Engine: Central state machine managing phases (lobby → level_intro → briefing → playing → puzzle_transition → … → victory/defeat), timers, glitch mechanics, and scoring
- Room Manager: In-memory room CRUD with Redis serialization/deserialization for persistence
- Role Assigner: Randomized role assignment per puzzle based on YAML layout definitions
- Puzzle Handlers: Pluggable implementations of a common interface for puzzle logic, views, and win conditions
- Timer: Server-authoritative countdown with resume on restart
- Postgres Service: Score persistence and leaderboard queries with enhanced error handling
- Redis Service: Persistent room storage with comprehensive error logging
- Client: Socket.io wrapper, screen orchestration, puzzle renderers, and structured logging
- Logger Infrastructure: Unified logging system with Winston for server and custom logger for client
- Config Loader: YAML-based level configuration loading with hot-reload and property normalization

**Updated** Enhanced with defensive copying of configuration objects to prevent direct modifications, improved logging granularity for production environments, robust error handling across all components, and a fixed critical scoring calculation bug that ensures fairer gameplay experiences.

**Section sources**
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L1-L794)
- [src/server/services/room-manager.ts](file://src/server/services/room-manager.ts#L1-L283)
- [src/server/services/role-assigner.ts](file://src/server/services/role-assigner.ts#L1-L78)
- [src/server/puzzles/puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L1-L56)
- [src/server/utils/timer.ts](file://src/server/utils/timer.ts#L1-L81)
- [src/server/repositories/postgres-service.ts](file://src/server/repositories/postgres-service.ts#L1-L83)
- [src/server/repositories/redis-service.ts](file://src/server/repositories/redis-service.ts#L1-L50)
- [src/client/main.ts](file://src/client/main.ts#L1-L266)
- [src/client/logger.ts](file://src/client/logger.ts#L1-L38)
- [src/server/utils/logger.ts](file://src/server/utils/logger.ts#L1-L21)
- [shared/logger.ts](file://shared/logger.ts#L1-L22)
- [src/server/utils/config-loader.ts](file://src/server/utils/config-loader.ts#L1-L147)

## Architecture Overview
The system uses a real-time, event-driven architecture with enhanced error handling, robust state management, and defensive programming practices:
- Client connects via Socket.io and listens for server events
- Server routes events to the Game Engine, which updates room state and broadcasts UI updates
- Puzzle handlers encapsulate game logic; the engine delegates actions to them generically
- Roles and views are computed per puzzle; only the engine knows the current phase and state
- Comprehensive error handling with structured logging and metadata for debugging
- Robust glitch management with defensive programming and fallback mechanisms
- **Enhanced** Game state immutability through defensive copying of configuration objects
- **Enhanced** Fair scoring system using level-specific time constraints instead of arbitrary constants

```mermaid
sequenceDiagram
participant Browser as "Client main.ts"
participant Socket as "Client socket.ts"
participant Server as "Server index.ts"
participant Engine as "Game Engine"
participant Room as "Room Manager"
participant Timer as "GameTimer"
participant DB as "PostgresService"
participant Redis as "RedisService"
Browser->>Socket : connect()
Browser->>Server : ClientEvents.CREATE_ROOM / JOIN_ROOM
Server->>Room : create/join
Room->>Redis : saveRoom()
Redis-->>Room : ack/error
Server-->>Browser : ServerEvents.ROOM_CREATED / ROOM_JOINED
Browser->>Server : ClientEvents.START_GAME
Server->>Engine : startGame(io, room)
Engine->>Engine : Create shallow copy of level.glitch
Engine->>Timer : start(totalSeconds)
Engine-->>Browser : ServerEvents.GAME_STARTED
Engine-->>Browser : ServerEvents.PHASE_CHANGE(level_intro)
Browser->>Server : ClientEvents.INTRO_COMPLETE
Server->>Engine : handleLevelIntroComplete(io, room, playerId)
Engine-->>Browser : ServerEvents.PHASE_CHANGE(briefing)
Engine-->>Browser : ServerEvents.BRIEFING
Browser->>Server : ClientEvents.PLAYER_READY
Server->>Engine : handlePlayerReady(io, room, playerId)
Engine-->>Browser : ServerEvents.PHASE_CHANGE(playing)
Engine-->>Browser : ServerEvents.ROLES_ASSIGNED
Engine-->>Browser : ServerEvents.PUZZLE_START
loop During puzzle
Browser->>Server : ClientEvents.PUZZLE_ACTION
Server->>Engine : handlePuzzleAction(io, room, playerId, action, data)
Engine->>Engine : handler.handleAction(...) with debug logging
Engine->>Engine : addGlitch(io, room, glitchDelta)
Engine-->>Browser : ServerEvents.PUZZLE_UPDATE
Engine-->>Browser : ServerEvents.GLITCH_UPDATE
end
alt Win Condition
Engine-->>Browser : ServerEvents.PUZZLE_COMPLETED
Engine-->>Browser : ServerEvents.PHASE_CHANGE(puzzle_transition)
Engine-->>Browser : ServerEvents.BRIEFING (next)
else Lose Condition (timer/glitch)
Engine-->>Browser : ServerEvents.DEFEAT
end
opt Victory
Engine-->>Browser : ServerEvents.VICTORY
Engine->>DB : createGameScore(...)
DB-->>Engine : ack/error
Engine->>Redis : persistRoom()
Redis-->>Engine : ack/error
end
```

**Diagram sources**
- [src/client/main.ts](file://src/client/main.ts#L1-L266)
- [src/client/lib/socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [src/server/index.ts](file://src/server/index.ts#L1-L321)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L1-L794)
- [src/server/utils/timer.ts](file://src/server/utils/timer.ts#L1-L81)
- [src/server/repositories/postgres-service.ts](file://src/server/repositories/postgres-service.ts#L1-L83)
- [src/server/repositories/redis-service.ts](file://src/server/repositories/redis-service.ts#L1-L50)

## Detailed Component Analysis

### Game Engine
Responsibilities:
- Initialize and transition between game phases
- Manage timers and broadcast updates
- Coordinate puzzle start, action handling, and completion
- Compute scores and persist results
- Handle reconnections and debug utilities
- **Enhanced** Implement defensive copying to prevent level configuration mutations
- **Enhanced** Comprehensive error handling with structured logging and metadata
- **Enhanced** Robust glitch management with defensive programming and fallback mechanisms
- **Enhanced** Fair scoring system using level-specific time constraints

Key flows:
- startGame: validates level, creates defensive copy of glitch state, initializes state, starts global timer, emits start events
- handlePlayerReady: advances from briefing to puzzle when all players are ready
- handlePuzzleAction: delegates to the active handler with debug logging, applies glitch penalties, and rebroadcasts views
- handleVictory/handleDefeat: computes score using level.timer_seconds, persists to DB, and cleans up timers with enhanced logging
- **Enhanced** addGlitch: centralized glitch management with comprehensive validation and error handling

**Updated** Enhanced error handling with comprehensive error metadata including error messages, stack traces, and error names for better debugging. Improved logging coverage for victory handling processes including room validation, player verification, persistence attempts, and event emissions. Implemented defensive copying of level configuration objects to prevent direct mutations. Fixed critical scoring calculation bug to ensure fairer gameplay experiences.

```mermaid
flowchart TD
Start(["startGame"]) --> Init["Load level<br/>Create defensive copy of glitch state<br/>Init GameState<br/>Persist room"]
Init --> Timer["Start GameTimer<br/>Emit TIMER_UPDATE"]
Timer --> Intro["Emit GAME_STARTED<br/>PHASE_CHANGE(level_intro)"]
Intro --> Briefing["startPuzzleBriefing<br/>PHASE_CHANGE(briefing)<br/>BRIEFING"]
Briefing --> Ready{"All players ready?"}
Ready -- No --> Briefing
Ready -- Yes --> Playing["startPuzzle<br/>PHASE_CHANGE(playing)<br/>ROLES_ASSIGNED<br/>PUZZLE_START"]
Playing --> Action["handlePuzzleAction<br/>Debug logging only<br/>PUZZLE_UPDATE"]
Action --> Win{"checkWin?"}
Win -- No --> Action
Win -- Yes --> Completed["PUZZLE_COMPLETED<br/>PHASE_CHANGE(puzzle_transition)"]
Completed --> Next{"More puzzles?"}
Next -- Yes --> Briefing
Next -- No --> Victory["handleVictory<br/>VICTORY<br/>storeScore"]
Timer --> Expire["handleDefeat(reason=timer)"]
Victory --> Store["storeScore<br/>with enhanced error handling"]
Store --> Log["Structured logging with metadata"]
```

**Diagram sources**
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L169-L202)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L207-L246)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L273-L340)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L345-L404)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L409-L445)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L509-L542)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L531-L584)

**Section sources**
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L1-L794)

### Room Manager
Responsibilities:
- Create, join, leave rooms
- Serialize/deserialize rooms to/from Redis
- Track players, host, and room state
- Provide room lookup and player lists
- **Enhanced** Comprehensive error logging for all persistence operations
- **Enhanced** Room state migration and validation for legacy configurations

Integration:
- Used by the Game Engine for room state and persistence
- Used by the server's Socket.io handlers for room operations
- **Enhanced** Structured error logging for Redis operations and room state management
- **Enhanced** Automatic migration of legacy room state formats

**Updated** Enhanced with comprehensive error logging for all persistence operations including room creation, joining, leaving, and state synchronization. Implemented automatic room state migration to fix legacy configurations and ensure consistent glitch state properties.

**Section sources**
- [src/server/services/room-manager.ts](file://src/server/services/room-manager.ts#L1-L283)

### Role Assigner
Responsibilities:
- Randomly assign roles per puzzle based on layout definitions
- Support "remaining" distribution and single-player debug behavior

Behavior:
- Fisher–Yates shuffle ensures randomized role distribution
- Ensures deterministic assignment per puzzle start

**Section sources**
- [src/server/services/role-assigner.ts](file://src/server/services/role-assigner.ts#L1-L78)

### Puzzle Handler Interface and Registry
Responsibilities:
- Define the contract for all puzzle logic
- Provide registration and retrieval of handlers

Contract:
- init: build initial puzzle state
- handleAction: process player actions and return state + glitch delta
- checkWin: determine victory
- getPlayerView: role-specific view data

Registration:
- All puzzle handlers are imported and registered at startup

**Section sources**
- [src/server/puzzles/puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L1-L56)
- [src/server/puzzles/register.ts](file://src/server/puzzles/register.ts#L1-L21)

### Example Puzzle: Asymmetric Symbols
Logic highlights:
- Words are shuffled and a subset selected per round
- Capturing correct letters completes segments; wrong captures incur glitch penalty
- Navigator sees solution; decoders see fly-in letters and capture state

Client rendering:
- The puzzle screen dispatches to the appropriate renderer based on type

**Section sources**
- [src/server/puzzles/asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L1-L170)
- [src/client/screens/puzzle.ts](file://src/client/screens/puzzle.ts#L1-L101)

### Timer
Responsibilities:
- Server-authoritative countdown
- Resume on server restart using persisted room state
- Emit periodic updates and expire on zero

**Section sources**
- [src/server/utils/timer.ts](file://src/server/utils/timer.ts#L1-L81)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L591-L617)

### Postgres Service
Responsibilities:
- Persist game scores after victory
- Retrieve top scores for leaderboard
- **Enhanced** Comprehensive error handling with structured logging

Schema:
- GameScore model stores room, players, time remaining, glitches, score, and timestamp

**Updated** Enhanced error handling with comprehensive error metadata including error messages, stack traces, and error names for better debugging.

**Section sources**
- [src/server/repositories/postgres-service.ts](file://src/server/repositories/postgres-service.ts#L1-L83)
- [shared/types.ts](file://shared/types.ts#L174-L182)

### Redis Service
Responsibilities:
- Persistent room storage with JSON serialization
- Room restoration from Redis on join attempts
- Connection monitoring with structured logging

**Updated** Enhanced with comprehensive error logging for Redis operations including connection errors, save operations, and room restoration attempts.

**Section sources**
- [src/server/repositories/redis-service.ts](file://src/server/repositories/redis-service.ts#L1-L50)

### Config Loader
Responsibilities:
- Load YAML level configurations with hot-reload capability
- Normalize snake_case properties to camelCase for runtime compatibility
- Validate level configurations and provide hot-reload functionality

Key Features:
- Property transformation: Converts YAML properties like `max`, `decay_rate` to `maxValue`, `decayRate`
- Hot-reload: Watches for configuration file changes and automatically reloads
- Validation: Ensures all required fields are present and properly formatted

**Updated** Enhanced with comprehensive property normalization from YAML snake_case to TypeScript camelCase format, ensuring consistent runtime behavior across different configuration sources.

**Section sources**
- [src/server/utils/config-loader.ts](file://src/server/utils/config-loader.ts#L1-L147)

### Client: Socket Wrapper and Screens
Responsibilities:
- Typed Socket.io wrapper for emitting and listening to events
- Screen orchestration and HUD updates (timer, glitch meter)
- Puzzle renderer dispatch based on type
- **Enhanced** Structured logging with configurable log levels

Event wiring:
- Client listens for game flow events and triggers screen transitions
- Emits gameplay events like puzzle actions and readiness
- **Enhanced** Configurable log levels (DEBUG, INFO, WARN, ERROR) with metadata support

**Updated** Enhanced with configurable log levels and structured logging capabilities for better debugging and operational visibility.

**Section sources**
- [src/client/lib/socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [src/client/main.ts](file://src/client/main.ts#L1-L266)
- [src/client/screens/puzzle.ts](file://src/client/screens/puzzle.ts#L1-L101)
- [src/client/logger.ts](file://src/client/logger.ts#L1-L38)

## Enhanced Error Handling and Logging

### Server-Side Logging Infrastructure
The server implements a comprehensive logging system using Winston with structured logging capabilities:

- **Log Levels**: DEBUG, INFO, WARN, ERROR with configurable thresholds
- **Structured Metadata**: All log entries include timestamps, levels, messages, and contextual metadata
- **Error Context**: Comprehensive error metadata including error messages, stack traces, and error names
- **Component-Specific Logging**: Each module maintains its own logger instance with appropriate context

### Key Logging Enhancements
- **Error Metadata**: All error logs now include comprehensive metadata such as error messages, stack traces, and error names
- **Room Validation**: Enhanced logging for room operations including validation, persistence, and state changes
- **Player Verification**: Detailed logging for player actions, role assignments, and state synchronization
- **Persistence Attempts**: Comprehensive logging for Redis and database operations with success/failure indicators
- **Event Emissions**: Structured logging for all server-client communications and state changes
- **Production Optimization**: Reduced logging verbosity by changing puzzle action processing from INFO to DEBUG level

### Client-Side Logging
The client implements a lightweight logging system with configurable levels:

- **Configurable Levels**: Runtime control of log verbosity via environment variables
- **Metadata Support**: Console logging with structured metadata for debugging
- **Environment-Based**: Development environments default to DEBUG level, production to INFO

### Error Handling Patterns
All major functions now follow consistent error handling patterns:

```typescript
try {
  // Main operation
} catch (err) {
  const errorDetails = err instanceof Error 
    ? { message: err.message, stack: err.stack, name: err.name }
    : { value: String(err) };
  logger.error("Operation failed", { err: errorDetails, context: additionalContext });
}
```

**Updated** Enhanced logging granularity with puzzle action processing now using DEBUG level instead of INFO to reduce production log noise while maintaining detailed debugging information.

**Section sources**
- [src/server/utils/logger.ts](file://src/server/utils/logger.ts#L1-L21)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L496-L526)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L531-L584)
- [src/server/services/room-manager.ts](file://src/server/services/room-manager.ts#L78-L244)
- [src/server/repositories/postgres-service.ts](file://src/server/repositories/postgres-service.ts#L42-L54)
- [src/server/repositories/redis-service.ts](file://src/server/repositories/redis-service.ts#L9-L15)
- [src/client/logger.ts](file://src/client/logger.ts#L1-L38)
- [shared/logger.ts](file://shared/logger.ts#L1-L22)

## Glitch Management System

### Enhanced addGlitch Function
The addGlitch function has been significantly enhanced with comprehensive defensive programming and error handling:

**Defensive Programming Checks:**
- Validates that room.state.glitch exists before processing
- Provides fallback values for maxValue (defaults to 100) and currentValue (defaults to 0)
- Ensures state integrity by setting maxValue consistently

**Enhanced Error Handling:**
- Comprehensive try-catch blocks with detailed error metadata
- Structured logging with room codes, delta values, and current glitch states
- Graceful degradation when persistence fails

**Improved Persistence Handling:**
- Non-blocking persistence attempts with error catching
- Detailed error reporting with stack traces and contextual information
- Continued operation even when persistence fails

**State Validation:**
- Prevents overflow by using Math.min for value clamping
- Maintains consistency between value and maxValue fields
- Triggers defeat conditions when glitch reaches maximum threshold

**Client Integration:**
- Emits GLITCH_UPDATE events with complete glitch state
- Updates client HUD with visual feedback and screen shake effects
- Provides real-time glitch intensity visualization

```mermaid
flowchart TD
AddGlitch["addGlitch(io, room, delta)"] --> Validate["Validate glitch state"]
Validate --> CheckState{"room.state.glitch exists?"}
CheckState -- No --> LogError["Log error and return"]
CheckState -- Yes --> Fallback["Set fallback values"]
Fallback --> Calc["Calculate new value"]
Calc --> Clamp["Clamp to maxValue"]
Clamp --> Persist["persistRoom() with error handling"]
Persist --> Emit["Emit GLITCH_UPDATE"]
Emit --> CheckDefeat{"value >= maxValue?"}
CheckDefeat -- Yes --> Defeat["handleDefeat('glitch')"]
CheckDefeat -- No --> Complete["Complete successfully"]
```

**Diagram sources**
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L458-L506)

**Section sources**
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L458-L506)
- [src/client/main.ts](file://src/client/main.ts#L113-L140)
- [shared/types.ts](file://shared/types.ts#L51-L56)
- [shared/events.ts](file://shared/events.ts#L205-L207)

## Scoring System Enhancement

### Fixed Critical Scoring Calculation Bug
The scoring system has been enhanced with a critical bug fix that ensures fairer gameplay experiences:

**Previous Issues:**
- Scoring algorithm used hardcoded constants (1000 seconds and 1000 glitch penalty caps)
- Scores were not proportional to intended difficulty and time constraints of each level
- Different levels with varying time limits produced unfair score comparisons

**Fixed Implementation:**
- The `calculateScore` function now properly uses `level.timer_seconds` instead of hardcoded constants
- Time-based scoring is now proportional to the intended difficulty of each level
- Glitch penalties maintain their relative weight while being applied to level-specific time limits
- Score calculation formula: `(Math.max(0, levelTime - elapsedSeconds) * 10) - (glitchFinal * 50)`

**Benefits:**
- Fairer gameplay across different level difficulties
- Scores now accurately reflect player performance relative to level constraints
- Elimination of arbitrary constants that previously skewed scoring
- Consistent scoring mechanics regardless of level design

**Algorithm Details:**
- Time score: `Math.max(0, levelTime - elapsedSeconds) * 10`
- Glitch penalty: `glitchFinal * 50`
- Final score: `Math.max(0, timeScore - glitchPenalty)`

**Section sources**
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L509-L514)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L584-L589)

## Dependency Analysis
High-level dependencies:
- Server entry depends on Game Engine, Room Manager, Puzzle Registry, Timer, and Postgres
- Game Engine depends on Room Manager, Role Assigner, Timer, Postgres, and Puzzle Registry
- Client depends on Socket wrapper and event definitions
- **Enhanced** All components depend on unified logging infrastructure
- **Enhanced** Glitch management system integrates with all puzzle handlers
- **Enhanced** Config Loader provides normalized configuration data to Game Engine
- **Enhanced** Scoring system now depends on level-specific timer constraints

```mermaid
graph LR
SI["Server index.ts"] --> GE["Game Engine"]
GE --> RM["Room Manager"]
GE --> RA["Role Assigner"]
GE --> TH["Puzzle Handler Registry"]
GE --> TM["GameTimer"]
GE --> PG["PostgresService"]
GE --> SL["Server Logger"]
GE --> AG["addGlitch Function"]
GE --> CLD["Config Loader"]
GE --> CS["calculateScore Function"]
CM["Client main.ts"] --> CS["Socket wrapper"]
CS --> SI
CM --> CP["Puzzle screen dispatcher"]
CM --> CL["Client Logger"]
CL --> SHL["Shared Logger Interface"]
SL --> SHL
AG --> SHL
CS --> ST["LevelConfig.timer_seconds"]
CLD --> ST["Normalized Config Types"]
```

**Diagram sources**
- [src/server/index.ts](file://src/server/index.ts#L1-L321)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L1-L794)
- [src/server/services/room-manager.ts](file://src/server/services/room-manager.ts#L1-L283)
- [src/server/services/role-assigner.ts](file://src/server/services/role-assigner.ts#L1-L78)
- [src/server/puzzles/puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L1-L56)
- [src/server/utils/timer.ts](file://src/server/utils/timer.ts#L1-L81)
- [src/server/repositories/postgres-service.ts](file://src/server/repositories/postgres-service.ts#L1-L83)
- [src/client/main.ts](file://src/client/main.ts#L1-L266)
- [src/client/lib/socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [src/client/screens/puzzle.ts](file://src/client/screens/puzzle.ts#L1-L101)
- [src/client/logger.ts](file://src/client/logger.ts#L1-L38)
- [src/server/utils/logger.ts](file://src/server/utils/logger.ts#L1-L21)
- [shared/logger.ts](file://shared/logger.ts#L1-L22)
- [src/server/utils/config-loader.ts](file://src/server/utils/config-loader.ts#L1-L147)

**Section sources**
- [src/server/index.ts](file://src/server/index.ts#L1-L321)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L1-L794)

## Performance Considerations
- Real-time updates: Keep puzzle update payloads minimal; avoid frequent full-state replays
- Network resilience: Socket.io reconnection is enabled; ensure client-side backoff and retry logic
- Timer accuracy: Server-authoritative timing prevents desync; clients should treat server updates as canonical
- Persistence: Redis serialization occurs on every mutation; batch operations if extending
- Scrolling leaderboards: Fetch paginated top scores to reduce payload sizes
- **Enhanced** Logging overhead: Structured logging adds minimal performance impact while providing comprehensive debugging capabilities
- **Enhanced** Glitch management: Defensive programming adds minimal overhead but prevents critical failures
- **Enhanced** Client-side glitch HUD: Optimized DOM manipulation with efficient CSS property updates
- **Enhanced** Game state immutability: Defensive copying of configuration objects adds negligible overhead for security benefits
- **Enhanced** Scoring performance: Fixed scoring calculation eliminates unnecessary constant operations and improves algorithmic efficiency

## Troubleshooting Guide
Common issues and diagnostics:
- Connection failures: Verify Socket.io client initialization and CORS configuration
- Missing level or invalid room state: Check level selection and Room Manager persistence
- Stuck timers: Confirm GameTimer lifecycle and resume on startup
- Score recording errors: Validate DATABASE_URL and Prisma client generation
- Asymmetric roles not applied: Ensure Role Assigner runs before puzzle start and getPlayerView is invoked per player
- **Enhanced** Error debugging: Use structured logs with error metadata for comprehensive troubleshooting
- **Enhanced** Room persistence issues: Monitor Redis connectivity and error logs for persistence failures
- **Enhanced** Client-side debugging: Configure log levels via environment variables for different verbosity levels
- **Enhanced** Glitch state corruption: Check for null/undefined glitch states and verify fallback mechanisms
- **Enhanced** Persistence failures: Monitor error logs for failed room saves and implement retry strategies
- **Enhanced** Configuration object mutations: Verify that level configurations are not being directly modified by checking for defensive copying
- **Enhanced** Scoring inconsistencies: Verify that level.timer_seconds is properly loaded and used in calculateScore function

Operational checks:
- Server logs indicate initialization steps and error contexts with comprehensive metadata
- Client logs surface event handling and UI updates with configurable verbosity
- Use debug toggle to inspect role-specific views
- **Enhanced** Error correlation: Use room codes and player IDs to correlate server and client logs
- **Enhanced** Error patterns: Monitor for recurring error patterns and metadata anomalies
- **Enhanced** Glitch state monitoring: Track glitch value changes and persistence failures
- **Enhanced** Production logging: Verify that puzzle action processing uses DEBUG level to minimize log noise
- **Enhanced** Scoring verification: Compare calculated scores with expected level-specific time constraints

**Section sources**
- [src/server/index.ts](file://src/server/index.ts#L64-L84)
- [src/server/services/game-engine.ts](file://src/server/services/game-engine.ts#L591-L617)
- [src/server/repositories/postgres-service.ts](file://src/server/repositories/postgres-service.ts#L1-L83)
- [src/client/main.ts](file://src/client/main.ts#L1-L266)
- [src/server/utils/logger.ts](file://src/server/utils/logger.ts#L1-L21)
- [src/client/logger.ts](file://src/client/logger.ts#L1-L38)

## Conclusion
The Game Engine provides a robust, extensible foundation for co-op escape rooms with significantly enhanced error handling, defensive programming, and comprehensive glitch management capabilities. The enhanced addGlitch function exemplifies these improvements with its comprehensive validation, fallback mechanisms, and graceful error handling. The robust logging system with Winston provides consistent error tracking across all components, while the client-side logging infrastructure offers configurable verbosity levels for different deployment scenarios.

**Critical Bug Fix**: The most significant enhancement is the fix to the critical scoring calculation bug in the `calculateScore` function. The scoring algorithm now properly uses `level.timer_seconds` instead of hardcoded constants (1000 seconds and 1000 glitch penalty caps). This ensures scores are proportional to intended difficulty and time constraints of each level, providing fairer gameplay experiences across different level designs.

**Additional Improvements**: The removal of the TODO comment regarding Redis persistence for timer state indicates progress toward more robust state management. The enhanced game state immutability through defensive copying of configuration objects ensures game stability and prevents configuration corruption. The adjustment to DEBUG level logging for puzzle actions reduces production log noise while maintaining detailed debugging information.

The separation of concerns across server, client, and shared modules yields maintainability and clarity for both contributors and operators, now enhanced with comprehensive error handling, defensive programming, resilient state management, improved configuration safety, and a fairer scoring system that makes the overall system significantly more robust and production-ready.