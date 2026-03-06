# Data Flow Architecture

<cite>
**Referenced Files in This Document**
- [events.ts](file://shared/events.ts)
- [socket.ts](file://src/client/lib/socket.ts)
- [index.ts](file://src/server/index.ts)
- [game-engine.ts](file://src/server/services/game-engine.ts)
- [room-manager.ts](file://src/server/services/room-manager.ts)
- [types.ts](file://shared/types.ts)
- [lobby.ts](file://src/client/screens/lobby.ts)
- [puzzle.ts](file://src/client/screens/puzzle.ts)
- [main.ts](file://src/client/main.ts)
- [config-loader.ts](file://src/server/utils/config-loader.ts)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts)
- [register.ts](file://src/server/puzzles/register.ts)
- [alphabet-wall.ts](file://src/server/puzzles/alphabet-wall.ts)
- [cipher-decode.ts](file://src/server/puzzles/cipher-decode.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes the real-time communication system for Project ODYSSEY, focusing on the complete data flow from client actions to server processing and back to client updates. It explains the event-driven architecture using typed Socket.io events defined centrally, documents the data transformation pipeline, and provides examples for room creation, puzzle interactions, and game phase transitions. It also covers error handling, validation, and state synchronization mechanisms.

## Project Structure
The system is split into:
- Client: browser-side screens, socket wrapper, and UI rendering
- Server: Socket.io server, game engine, room manager, puzzle handlers, and configuration loader
- Shared: typed event names and payloads, and core game types

```mermaid
graph TB
subgraph "Client"
C_Socket["Client Socket Wrapper<br/>src/client/lib/socket.ts"]
C_Lobby["Lobby Screen<br/>src/client/screens/lobby.ts"]
C_Puzzle["Puzzle Screen<br/>src/client/screens/puzzle.ts"]
C_Main["Main Boot & HUD<br/>src/client/main.ts"]
end
subgraph "Shared"
S_Events["Typed Events<br/>shared/events.ts"]
S_Types["Core Types<br/>shared/types.ts"]
end
subgraph "Server"
S_Index["Socket.IO Entry<br/>src/server/index.ts"]
S_Game["Game Engine<br/>src/server/services/game-engine.ts"]
S_Room["Room Manager<br/>src/server/services/room-manager.ts"]
S_Config["Config Loader<br/>src/server/utils/config-loader.ts"]
S_Puzzles["Puzzle Handlers<br/>src/server/puzzles/*"]
end
C_Lobby --> C_Socket
C_Puzzle --> C_Socket
C_Main --> C_Socket
C_Socket --> S_Index
S_Index --> S_Room
S_Index --> S_Game
S_Index --> S_Config
S_Index --> S_Puzzles
S_Game --> S_Room
S_Game --> S_Config
S_Game --> S_Puzzles
S_Room --> S_Config
S_Puzzles --> S_Config
S_Events -.-> C_Socket
S_Events -.-> S_Index
S_Types -.-> S_Game
S_Types -.-> S_Room
S_Types -.-> S_Puzzles
```

**Diagram sources**
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [index.ts](file://src/server/index.ts#L1-L321)
- [game-engine.ts](file://src/server/services/game-engine.ts#L1-L711)
- [room-manager.ts](file://src/server/services/room-manager.ts#L1-L262)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L1-L135)
- [events.ts](file://shared/events.ts#L1-L228)
- [types.ts](file://shared/types.ts#L1-L187)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L1-L57)
- [register.ts](file://src/server/puzzles/register.ts#L1-L21)

**Section sources**
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [index.ts](file://src/server/index.ts#L1-L321)
- [events.ts](file://shared/events.ts#L1-L228)
- [types.ts](file://shared/types.ts#L1-L187)

## Core Components
- Typed Events: Centralized event names and payload interfaces ensure consistency across client and server.
- Socket Wrapper: Provides typed emit/on wrappers and robust connection lifecycle handling.
- Server Entry: Socket.io server wiring, Redis adapter for multi-instance scaling, and event handlers.
- Game Engine: Orchestrates game lifecycle, phases, timers, puzzle transitions, and end-of-game outcomes.
- Room Manager: In-memory room store with Redis persistence and reconnection logic.
- Puzzle Handlers: Pluggable puzzle implementations with init, handleAction, checkWin, and getPlayerView.
- Client Screens: Lobby, puzzle, and HUD updates driven by server events.

**Section sources**
- [events.ts](file://shared/events.ts#L28-L90)
- [socket.ts](file://src/client/lib/socket.ts#L51-L84)
- [index.ts](file://src/server/index.ts#L86-L305)
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L87)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L12-L44)

## Architecture Overview
The system uses a typed, event-driven Socket.io architecture:
- Client emits typed events to the server.
- Server validates payloads, updates room/game state, and broadcasts typed events to clients.
- Clients listen for server events and update UI accordingly.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Socket as "Socket Wrapper"
participant Server as "Server Entry"
participant Engine as "Game Engine"
participant Room as "Room Manager"
participant Puzzles as "Puzzle Handlers"
Client->>Socket : emit("room : create", payload)
Socket->>Server : ClientEvents.CREATE_ROOM
Server->>Room : createRoom(hostId, playerName)
Room-->>Server : Room
Server-->>Client : ServerEvents.ROOM_CREATED
Note over Client : UI switches to lobby view
Client->>Socket : emit("room : join", payload)
Socket->>Server : ClientEvents.JOIN_ROOM
Server->>Room : joinRoom(roomCode, playerId, playerName)
Room-->>Server : Room | {error}
alt success
Server-->>Client : ServerEvents.ROOM_JOINED
Server-->>OtherClients : ServerEvents.PLAYER_LIST_UPDATE
else error
Server-->>Client : ServerEvents.ROOM_ERROR
end
Client->>Socket : emit("game : start", payload)
Socket->>Server : ClientEvents.START_GAME
Server->>Engine : startGame(io, room, startingPuzzleIndex?)
Engine-->>AllClients : ServerEvents.GAME_STARTED
Engine-->>AllClients : ServerEvents.TIMER_UPDATE
Engine-->>AllClients : ServerEvents.PHASE_CHANGE
```

**Diagram sources**
- [index.ts](file://src/server/index.ts#L89-L171)
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L154)
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [socket.ts](file://src/client/lib/socket.ts#L51-L65)
- [lobby.ts](file://src/client/screens/lobby.ts#L344-L434)

## Detailed Component Analysis

### Typed Events and Payloads
- ClientEvents and ServerEvents define all event names and payload interfaces in a single source of truth.
- This prevents magic strings and ensures compile-time safety for event names and payloads.

```mermaid
classDiagram
class ClientEvents {
+CREATE_ROOM
+JOIN_ROOM
+LEAVE_ROOM
+START_GAME
+PUZZLE_ACTION
+REQUEST_HINT
+PLAYER_READY
+INTRO_COMPLETE
+TOGGLE_DEBUG
+JUMP_TO_PUZZLE
+LEVEL_LIST_REQUEST
+LEVEL_SELECT
+LEADERBOARD_REQUEST
}
class ServerEvents {
+ROOM_CREATED
+ROOM_JOINED
+ROOM_LEFT
+PLAYER_LIST_UPDATE
+ROOM_ERROR
+GAME_STARTED
+PHASE_CHANGE
+BRIEFING
+PUZZLE_START
+PUZZLE_UPDATE
+PUZZLE_COMPLETED
+PUZZLE_TRANSITION
+PLAYER_READY_UPDATE
+ROLES_ASSIGNED
+GLITCH_UPDATE
+TIMER_UPDATE
+PLAYER_VIEW
+VICTORY
+DEFEAT
+DEBUG_UPDATE
+LEVEL_LIST
+LEVEL_SELECTED
+LEADERBOARD_LIST
}
class CreateRoomPayload {
+playerName : string
}
class JoinRoomPayload {
+roomCode : string
+playerName : string
}
class StartGamePayload {
+levelId : string
+startingPuzzleIndex? : number
}
class RoomCreatedPayload {
+roomCode : string
+player : Player
+gameState : GameState
}
ClientEvents --> CreateRoomPayload : "payload"
ClientEvents --> JoinRoomPayload : "payload"
ClientEvents --> StartGamePayload : "payload"
ServerEvents --> RoomCreatedPayload : "payload"
```

**Diagram sources**
- [events.ts](file://shared/events.ts#L28-L90)
- [events.ts](file://shared/events.ts#L94-L128)
- [events.ts](file://shared/events.ts#L124-L164)

**Section sources**
- [events.ts](file://shared/events.ts#L28-L90)
- [events.ts](file://shared/events.ts#L94-L164)

### Client Socket Wrapper
- Provides typed emit/on wrappers around Socket.io.
- Manages connection lifecycle, logging, and safe access to the socket instance.
- Exposes ClientEvents and ServerEvents for convenience.

```mermaid
flowchart TD
Start(["Call connect()"]) --> Init["Initialize Socket.io with options"]
Init --> OnConnect["Register 'connect' listener"]
Init --> OnDisconnect["Register 'disconnect' listener"]
Init --> OnError["Register 'connect_error' listener"]
OnConnect --> Ready["Socket ready"]
OnDisconnect --> LogWarn["Log disconnect reason"]
OnError --> LogErr["Log connection error"]
Ready --> Emit["emit(event, data)"]
Ready --> On["on(event, handler)"]
Ready --> Off["off(event, handler?)"]
```

**Diagram sources**
- [socket.ts](file://src/client/lib/socket.ts#L11-L41)
- [socket.ts](file://src/client/lib/socket.ts#L51-L73)

**Section sources**
- [socket.ts](file://src/client/lib/socket.ts#L11-L41)
- [socket.ts](file://src/client/lib/socket.ts#L51-L73)

### Server Entry and Event Wiring
- Initializes Socket.io server, Redis adapter, loads rooms and configs, and registers event handlers.
- Each handler follows a consistent try/catch pattern and logs errors.
- Uses typed events from shared/events.ts to avoid magic strings.

```mermaid
sequenceDiagram
participant IO as "Socket.IO Server"
participant RM as "Room Manager"
participant GE as "Game Engine"
participant CL as "Config Loader"
participant PS as "Puzzle Handlers"
IO->>IO : on("connection", socket)
IO->>RM : loadAllRooms()
IO->>CL : loadAllConfigs()
IO->>PS : registerPuzzleHandler(...)
IO->>IO : socket.on(ClientEvents.CREATE_ROOM, ...)
IO->>IO : socket.on(ClientEvents.JOIN_ROOM, ...)
IO->>IO : socket.on(ClientEvents.START_GAME, ...)
IO->>IO : socket.on(ClientEvents.PUZZLE_ACTION, ...)
IO->>IO : socket.on(ClientEvents.LEVEL_LIST_REQUEST, ...)
IO->>IO : socket.on(ClientEvents.LEVEL_SELECT, ...)
IO->>IO : socket.on(ClientEvents.LEAVE_ROOM, ...)
IO->>IO : socket.on(ClientEvents.PLAYER_READY, ...)
IO->>IO : socket.on(ClientEvents.INTRO_COMPLETE, ...)
IO->>IO : socket.on(ClientEvents.TOGGLE_DEBUG, ...)
IO->>IO : socket.on(ClientEvents.JUMP_TO_PUZZLE, ...)
IO->>IO : socket.on(ClientEvents.LEADERBOARD_REQUEST, ...)
IO->>IO : socket.on("disconnect", ...)
```

**Diagram sources**
- [index.ts](file://src/server/index.ts#L54-L61)
- [index.ts](file://src/server/index.ts#L86-L305)
- [register.ts](file://src/server/puzzles/register.ts#L1-L21)

**Section sources**
- [index.ts](file://src/server/index.ts#L54-L61)
- [index.ts](file://src/server/index.ts#L86-L305)

### Room Management and Persistence
- Creates rooms with unique codes and initial game state.
- Supports reconnection and host reassignment.
- Persists rooms to Redis and restores on startup.

```mermaid
flowchart TD
Create["createRoom(hostId, playerName)"] --> GenCode["Generate room code"]
GenCode --> BuildRoom["Build Room with initial GameState"]
BuildRoom --> SaveRedis["Save to Redis"]
SaveRedis --> ReturnRoom["Return Room"]
Join["joinRoom(roomCode, playerId, playerName)"] --> LoadMem["Load from memory or Redis"]
LoadMem --> Exists["Existing player with same name?"]
Exists --> |Yes & connected| Error["Return {error}"]
Exists --> |Yes & disconnected| Reclaim["Reclaim spot and update hostId"]
Exists --> |No| AddPlayer["Add player to room"]
AddPlayer --> SaveRedis2["Save to Redis"]
SaveRedis2 --> ReturnJoin["Return {room, player}"]
```

**Diagram sources**
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L87)
- [room-manager.ts](file://src/server/services/room-manager.ts#L89-L154)

**Section sources**
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L87)
- [room-manager.ts](file://src/server/services/room-manager.ts#L89-L154)

### Game Engine Lifecycle and State Machine
- Starts the game, initializes timers, and orchestrates phases: level_intro, briefing, playing, puzzle_transition, victory, defeat.
- Handles puzzle actions, applies glitch penalties, and broadcasts updates.
- Persists room state and cleans up timers on end conditions.

```mermaid
flowchart TD
StartGame["startGame(io, room, startingPuzzleIndex?)"] --> InitState["Initialize GameState"]
InitState --> Persist["persistRoom(room)"]
Persist --> BroadcastStart["Broadcast ServerEvents.GAME_STARTED"]
BroadcastStart --> Timer["Start GameTimer"]
Timer --> PhaseBriefing["startPuzzleBriefing(...)"]
PhaseBriefing --> Playing["startPuzzle(...)"]
Playing --> Action["handlePuzzleAction(...)"]
Action --> UpdateViews["Broadcast ServerEvents.PUZZLE_UPDATE"]
Action --> WinCheck{"checkWin(state)?"}
WinCheck --> |Yes| Complete["handlePuzzleComplete(...)"]
Complete --> Transition["Set phase to PUZZLE_TRANSITION"]
Transition --> NextPuzzle["Start next briefing or victory"]
NextPuzzle --> EndGame{"Timer reached zero or glitch max?"}
EndGame --> |Yes| Defeat["handleDefeat(...)"]
EndGame --> |No| Continue["Continue playing"]
```

**Diagram sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)
- [game-engine.ts](file://src/server/services/game-engine.ts#L388-L424)
- [game-engine.ts](file://src/server/services/game-engine.ts#L526-L550)

**Section sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)
- [game-engine.ts](file://src/server/services/game-engine.ts#L388-L424)
- [game-engine.ts](file://src/server/services/game-engine.ts#L526-L550)

### Puzzle Handlers and Data Transformation
- Each puzzle implements init, handleAction, checkWin, and getPlayerView.
- handleAction returns updated state and glitchDelta; getPlayerView computes role-specific views.
- The engine selects the handler by puzzle type and coordinates role assignments.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Server Entry"
participant Engine as "Game Engine"
participant Handler as "Puzzle Handler"
participant Room as "Room Manager"
Client->>Server : ClientEvents.PUZZLE_ACTION {action, data}
Server->>Engine : handlePuzzleAction(io, room, playerId, action, data)
Engine->>Handler : handleAction(state, playerId, action, data)
Handler-->>Engine : {state, glitchDelta}
Engine->>Room : persistRoom(room)
Engine-->>AllClients : ServerEvents.PUZZLE_UPDATE {playerView}
Engine->>Handler : checkWin(state)
alt success
Engine-->>AllClients : ServerEvents.PUZZLE_COMPLETED
Engine-->>AllClients : ServerEvents.PHASE_CHANGE
end
```

**Diagram sources**
- [index.ts](file://src/server/index.ts#L206-L217)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L21-L26)
- [register.ts](file://src/server/puzzles/register.ts#L14-L20)

**Section sources**
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L12-L44)
- [register.ts](file://src/server/puzzles/register.ts#L14-L20)
- [alphabet-wall.ts](file://src/server/puzzles/alphabet-wall.ts#L83-L143)
- [cipher-decode.ts](file://src/server/puzzles/cipher-decode.ts#L55-L89)

### Client-Side Data Flow Examples

#### Room Creation Flow
- Client emits room:create with playerName.
- Server creates room, joins socket to room, emits room:created and player list updates.
- Client renders lobby view and requests level list.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Socket as "Socket Wrapper"
participant Server as "Server Entry"
participant Room as "Room Manager"
Client->>Socket : emit("room : create", {playerName})
Socket->>Server : ClientEvents.CREATE_ROOM
Server->>Room : createRoom(socket.id, playerName)
Room-->>Server : Room
Server-->>Client : ServerEvents.ROOM_CREATED
Server-->>AllInRoom : ServerEvents.PLAYER_LIST_UPDATE
Client->>Socket : emit("level : list")
```

**Diagram sources**
- [lobby.ts](file://src/client/screens/lobby.ts#L263-L276)
- [index.ts](file://src/server/index.ts#L89-L110)
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L87)

**Section sources**
- [lobby.ts](file://src/client/screens/lobby.ts#L263-L276)
- [index.ts](file://src/server/index.ts#L89-L110)
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L87)

#### Puzzle Interaction Flow
- Client sends puzzle:action with action and data.
- Server delegates to puzzle handler, persists state, applies glitch if needed, and broadcasts puzzle:update.
- Client updates puzzle view with new playerView.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Socket as "Socket Wrapper"
participant Server as "Server Entry"
participant Engine as "Game Engine"
participant Handler as "Puzzle Handler"
Client->>Socket : emit("puzzle : action", {puzzleId, action, data})
Socket->>Server : ClientEvents.PUZZLE_ACTION
Server->>Engine : handlePuzzleAction(io, room, socket.id, action, data)
Engine->>Handler : handleAction(state, playerId, action, data)
Handler-->>Engine : {state, glitchDelta}
Engine-->>AllClients : ServerEvents.PUZZLE_UPDATE
Client->>Client : updatePuzzle(playerView)
```

**Diagram sources**
- [puzzle.ts](file://src/client/screens/puzzle.ts#L31-L34)
- [index.ts](file://src/server/index.ts#L206-L217)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)

**Section sources**
- [puzzle.ts](file://src/client/screens/puzzle.ts#L31-L34)
- [index.ts](file://src/server/index.ts#L206-L217)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)

#### Game Phase Transitions
- After level intro, clients receive game:started and timer updates.
- During briefing, clients can press ready; when all are ready, puzzle starts.
- During playing, clients receive roles:assigned and puzzle:start with player-specific views.

```mermaid
sequenceDiagram
participant Server as "Server Entry"
participant Engine as "Game Engine"
participant Clients as "All Clients"
Server-->>Clients : ServerEvents.GAME_STARTED
Engine-->>Clients : ServerEvents.TIMER_UPDATE
Engine-->>Clients : ServerEvents.PHASE_CHANGE {phase : "briefing"}
Engine-->>Clients : ServerEvents.BRIEFING
Engine-->>Clients : ServerEvents.ROLES_ASSIGNED
Engine-->>Clients : ServerEvents.PHASE_CHANGE {phase : "playing"}
Engine-->>Clients : ServerEvents.PUZZLE_START {playerView}
```

**Diagram sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L103-L115)
- [game-engine.ts](file://src/server/services/game-engine.ts#L169-L202)
- [game-engine.ts](file://src/server/services/game-engine.ts#L263-L319)

**Section sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L103-L115)
- [game-engine.ts](file://src/server/services/game-engine.ts#L169-L202)
- [game-engine.ts](file://src/server/services/game-engine.ts#L263-L319)

### Client Screens and HUD Updates
- Main boot connects socket, initializes screens, and wires HUD updates for timer and glitch.
- Lobby screen handles room creation/joining, player lists, level selection, and leaderboard.
- Puzzle screen renders and updates puzzle views based on puzzle type.

```mermaid
flowchart TD
Boot["boot()"] --> Connect["connect()"]
Connect --> InitScreens["initLobby(), initLevelIntro(), initBriefing(), initPuzzleScreen(), initResults()"]
InitScreens --> Listen["on(ServerEvents.*) handlers"]
Listen --> TimerHUD["Timer HUD updates"]
Listen --> GlitchHUD["Glitch HUD updates"]
Listen --> PhaseHUD["Phase HUD updates"]
Listen --> Music["Background music control"]
```

**Diagram sources**
- [main.ts](file://src/client/main.ts#L47-L262)
- [lobby.ts](file://src/client/screens/lobby.ts#L46-L82)
- [puzzle.ts](file://src/client/screens/puzzle.ts#L23-L34)

**Section sources**
- [main.ts](file://src/client/main.ts#L47-L262)
- [lobby.ts](file://src/client/screens/lobby.ts#L46-L82)
- [puzzle.ts](file://src/client/screens/puzzle.ts#L23-L34)

## Dependency Analysis
- Shared types and events are consumed by both client and server, ensuring type safety across boundaries.
- Server depends on Room Manager for state, Game Engine for orchestration, Config Loader for level definitions, and Puzzle Handlers for gameplay logic.
- Client depends on Socket Wrapper and screens for UI behavior.

```mermaid
graph LR
S_Types["shared/types.ts"] --> S_Game["server/game-engine.ts"]
S_Types --> S_Room["server/room-manager.ts"]
S_Types --> S_Puzzles["server/puzzles/*"]
S_Events["shared/events.ts"] --> C_Socket["client/socket.ts"]
S_Events --> S_Index["server/index.ts"]
C_Lobby["client/screens/lobby.ts"] --> C_Socket
C_Puzzle["client/screens/puzzle.ts"] --> C_Socket
S_Index --> S_Room
S_Index --> S_Game
S_Index --> S_Config["server/utils/config-loader.ts"]
S_Game --> S_Config
S_Game --> S_Puzzles
S_Room --> S_Config
```

**Diagram sources**
- [types.ts](file://shared/types.ts#L1-L187)
- [events.ts](file://shared/events.ts#L1-L228)
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [index.ts](file://src/server/index.ts#L1-L321)
- [game-engine.ts](file://src/server/services/game-engine.ts#L1-L711)
- [room-manager.ts](file://src/server/services/room-manager.ts#L1-L262)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L1-L135)

**Section sources**
- [types.ts](file://shared/types.ts#L1-L187)
- [events.ts](file://shared/events.ts#L1-L228)
- [index.ts](file://src/server/index.ts#L1-L321)

## Performance Considerations
- Redis Adapter: Socket.io uses Redis adapter for multi-instance synchronization, enabling horizontal scaling.
- Room Persistence: Rooms and timers are persisted to Redis to survive restarts and resume timers.
- Minimal Payloads: Events carry only necessary data; client-side screens update efficiently via targeted DOM updates.
- Config Hot Reload: YAML configs are watched and hot-reloaded without restarting the server.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Connection Issues: The client logs connect/disconnect reasons and errors; ensure server CORS allows the client origin.
- Room Errors: Server emits room:error with messages for invalid room codes, full rooms, or name conflicts.
- Validation: Room Manager enforces player limits and reconnection rules; Config Loader validates level configs.
- State Synchronization: On rejoin, the server syncs game state to late-arriving or reconnected players.

**Section sources**
- [socket.ts](file://src/client/lib/socket.ts#L24-L38)
- [index.ts](file://src/server/index.ts#L118-L122)
- [room-manager.ts](file://src/server/services/room-manager.ts#L133-L134)
- [config-loader.ts](file://src/server/utils/config-loader.ts#L25-L40)

## Conclusion
Project ODYSSEY’s real-time communication system is built on typed, event-driven Socket.io with a clear separation of concerns:
- Shared types and events ensure consistency.
- Server orchestrates rooms, game phases, and puzzle logic.
- Client screens react to server events and update UI efficiently.
- Robust error handling, validation, and state synchronization provide a reliable multiplayer experience.