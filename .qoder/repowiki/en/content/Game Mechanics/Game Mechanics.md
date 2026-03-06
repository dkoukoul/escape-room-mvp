# Game Mechanics

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [ARCHITECTURE.md](file://ARCHITECTURE.md)
- [types.ts](file://shared/types.ts)
- [events.ts](file://shared/events.ts)
- [game-engine.ts](file://src/server/services/game-engine.ts)
- [room-manager.ts](file://src/server/services/room-manager.ts)
- [role-assigner.ts](file://src/server/services/role-assigner.ts)
- [timer.ts](file://src/server/utils/timer.ts)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts)
- [register.ts](file://src/server/puzzles/register.ts)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts)
- [cipher-decode.ts](file://src/server/puzzles/cipher-decode.ts)
- [rhythm-tap.ts](file://src/server/puzzles/rhythm-tap.ts)
- [puzzle.ts](file://src/client/screens/puzzle.ts)
- [glitch.css](file://src/client/styles/glitch.css)
- [visual-fx.ts](file://src/client/lib/visual-fx.ts)
- [asymmetric-symbols.client.ts](file://src/client/puzzles/asymmetric-symbols.ts)
- [cipher-decode.client.ts](file://src/client/puzzles/cipher-decode.ts)
- [socket.ts](file://src/client/lib/socket.ts)
- [level_01.yaml](file://config/level_01.yaml)
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
10. [Appendices](#appendices)

## Introduction
Project ODYSSEY is a co-op escape room engine designed for 2 to 6 players to collaboratively solve asymmetric, logic-based puzzles under time pressure and environmental stress. The game emphasizes role-based information asymmetry, shared glitch mechanics that increase tension, and a no-registration entry system using short room codes. This document explains the core game mechanics, including the role randomization system, asymmetric puzzle views, glitch meter and its visual/audio effects, no-registration room entry, progressive difficulty and timer mechanics, victory/defeat conditions, and the balance between individual puzzle skills and team coordination.

## Project Structure
The project follows a clean architecture with a server (Bun + Socket.io) and a vanilla TypeScript/Vite client. Levels and puzzles are configured via YAML, enabling rapid iteration without changing core engine code. The server orchestrates game phases, timers, and puzzle logic; the client renders puzzle UIs and applies visual effects synchronized to shared game state.

```mermaid
graph TB
subgraph "Client"
A["Vite App<br/>screens/puzzle.ts"]
B["Puzzle Renderers<br/>asymmetric-symbols.client.ts<br/>cipher-decode.client.ts"]
C["Visual FX<br/>glitch.css<br/>visual-fx.ts"]
D["Socket Wrapper<br/>socket.ts"]
end
subgraph "Server"
E["Game Engine<br/>game-engine.ts"]
F["Room Manager<br/>room-manager.ts"]
G["Role Assigner<br/>role-assigner.ts"]
H["Puzzle Handlers<br/>asymmetric-symbols.ts<br/>cipher-decode.ts<br/>rhythm-tap.ts"]
I["Timer<br/>timer.ts"]
end
J["Shared Types & Events<br/>types.ts<br/>events.ts"]
A --> D
D --> E
E --> F
E --> G
E --> H
E --> I
H --> J
F --> J
G --> J
E --> J
A --> B
A --> C
B --> D
C --> D
```

**Diagram sources**
- [puzzle.ts](file://src/client/screens/puzzle.ts#L1-L101)
- [asymmetric-symbols.client.ts](file://src/client/puzzles/asymmetric-symbols.ts#L1-L221)
- [cipher-decode.client.ts](file://src/client/puzzles/cipher-decode.ts#L1-L152)
- [glitch.css](file://src/client/styles/glitch.css#L1-L421)
- [visual-fx.ts](file://src/client/lib/visual-fx.ts#L1-L112)
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [game-engine.ts](file://src/server/services/game-engine.ts#L1-L711)
- [room-manager.ts](file://src/server/services/room-manager.ts#L1-L262)
- [role-assigner.ts](file://src/server/services/role-assigner.ts#L1-L78)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L1-L156)
- [cipher-decode.ts](file://src/server/puzzles/cipher-decode.ts#L1-L142)
- [rhythm-tap.ts](file://src/server/puzzles/rhythm-tap.ts#L1-L134)
- [timer.ts](file://src/server/utils/timer.ts#L1-L81)
- [types.ts](file://shared/types.ts#L1-L187)
- [events.ts](file://shared/events.ts)

**Section sources**
- [README.md](file://README.md#L79-L101)
- [ARCHITECTURE.md](file://ARCHITECTURE.md#L35-L107)

## Core Components
- Role Randomization and Asymmetric Views
  - Roles are assigned per puzzle using a randomized layout definition. Different roles receive distinct PlayerView payloads, enabling asymmetric information. For example, one player may see the solution while others see interactive controls.
- Glitch Meter and Effects
  - A shared GlitchState tracks accumulated error penalties. Exceeding the maximum value triggers defeat. Visual and audio effects intensify with glitch intensity, including screen shake, chromatic aberration, scanlines, and VHS noise.
- No-Registration Room Entry
  - Rooms are identified by short, memorable 4-character codes. Players join by entering a code; names are not persisted across sessions.
- Progressive Difficulty and Timer
  - Levels define a global timer and per-puzzle glitch penalties. Puzzles expose glitch_penalty values; mistakes increment the shared meter. The mission concludes either by completing all puzzles or failing via timer or glitch thresholds.
- Victory/Defeat Conditions
  - Victory occurs when all puzzles are completed within time and glitch limits. Defeat occurs on timer expiration or reaching the glitch threshold.
- Collaborative Puzzle Solving and Communication
  - Many puzzles require role-specific knowledge and coordinated actions. Examples include guiding teammates (Navigator), decoding messages (Cryptographer), and synchronizing inputs (Rhythm Tap).

**Section sources**
- [README.md](file://README.md#L70-L76)
- [ARCHITECTURE.md](file://ARCHITECTURE.md#L111-L151)
- [types.ts](file://shared/types.ts#L51-L62)
- [glitch.css](file://src/client/styles/glitch.css#L1-L421)
- [visual-fx.ts](file://src/client/lib/visual-fx.ts#L1-L112)
- [room-manager.ts](file://src/server/services/room-manager.ts#L21-L42)
- [game-engine.ts](file://src/server/services/game-engine.ts#L429-L449)
- [level_01.yaml](file://config/level_01.yaml#L17-L24)

## Architecture Overview
The server maintains a GamePhase state machine and coordinates room lifecycle, role assignment, puzzle execution, and scoring. Clients subscribe to typed Socket events and render puzzle UIs tailored to each player’s role. Visual effects are applied client-side based on shared glitch state.

```mermaid
sequenceDiagram
participant U as "User"
participant CL as "Client (puzzle.ts)"
participant SO as "Socket (socket.ts)"
participant GE as "GameEngine (game-engine.ts)"
participant RM as "RoomManager (room-manager.ts)"
participant RA as "RoleAssigner (role-assigner.ts)"
participant PH as "PuzzleHandler (server)"
participant FX as "Visual FX (visual-fx.ts)"
U->>CL : "Join room / Ready"
CL->>SO : "CREATE_ROOM / JOIN_ROOM"
SO->>GE : "Room events"
GE->>RM : "Create/Load room"
GE->>GE : "startGame()"
GE->>SO : "GAME_STARTED"
GE->>SO : "TIMER_UPDATE"
GE->>GE : "startPuzzleBriefing()"
GE->>SO : "PHASE_CHANGE (briefing)"
GE->>SO : "BRIEFING"
GE->>GE : "handlePlayerReady()"
GE->>RA : "assignRoles(players, layout)"
GE->>SO : "ROLES_ASSIGNED"
GE->>PH : "init(players, config)"
GE->>SO : "PUZZLE_START (per player view)"
CL->>CL : "render/update puzzle UI"
U->>SO : "PUZZLE_ACTION"
SO->>GE : "handlePuzzleAction()"
GE->>PH : "handleAction(state, action)"
PH-->>GE : "{ state, glitchDelta }"
GE->>GE : "addGlitch() if delta > 0"
GE->>SO : "GLITCH_UPDATE"
GE->>SO : "PUZZLE_UPDATE (per player view)"
CL->>FX : "Apply glitch visuals"
alt Win Condition Met
GE->>SO : "PUZZLE_COMPLETED"
GE->>SO : "PHASE_CHANGE (transition)"
GE->>GE : "startPuzzleBriefing(next) or handleVictory()"
else Lose Condition
GE->>SO : "DEFEAT"
end
```

**Diagram sources**
- [puzzle.ts](file://src/client/screens/puzzle.ts#L23-L34)
- [socket.ts](file://src/client/lib/socket.ts#L51-L65)
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L87)
- [role-assigner.ts](file://src/server/services/role-assigner.ts#L24-L77)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L18-L52)
- [visual-fx.ts](file://src/client/lib/visual-fx.ts#L79-L90)

**Section sources**
- [ARCHITECTURE.md](file://ARCHITECTURE.md#L111-L151)
- [game-engine.ts](file://src/server/services/game-engine.ts#L169-L236)
- [room-manager.ts](file://src/server/services/room-manager.ts#L89-L154)

## Detailed Component Analysis

### Role Randomization and Asymmetric Views
- Role Assignment
  - Players are shuffled and assigned roles according to the puzzle’s layout definition. Roles can specify exact counts or “remaining” slots. Single-player scenarios are supported for debugging.
- Asymmetric Views
  - Each puzzle handler implements getPlayerView to return role-specific viewData. For example, the Navigator sees solution words and progress, while Decoders see flying letters and capture state. Similarly, the Cryptographer sees the cipher key, while Scribes see encrypted text and hints.

```mermaid
classDiagram
class RoleAssigner {
+assignRoles(players, puzzleConfig) RoleAssignment[]
}
class PuzzleHandler {
<<interface>>
+init(players, config) PuzzleState
+handleAction(state, playerId, action, data) Result
+checkWin(state) boolean
+getPlayerView(state, playerId, role, config) PlayerView
}
class AsymmetricSymbolsHandler {
+init(...)
+handleAction(...)
+checkWin(...)
+getPlayerView(...)
}
class CipherDecodeHandler {
+init(...)
+handleAction(...)
+checkWin(...)
+getPlayerView(...)
}
class RhythmTapHandler {
+init(...)
+handleAction(...)
+checkWin(...)
+getPlayerView(...)
}
RoleAssigner --> PuzzleHandler : "roles per puzzle"
AsymmetricSymbolsHandler ..|> PuzzleHandler
CipherDecodeHandler ..|> PuzzleHandler
RhythmTapHandler ..|> PuzzleHandler
```

**Diagram sources**
- [role-assigner.ts](file://src/server/services/role-assigner.ts#L24-L77)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L18-L156)
- [cipher-decode.ts](file://src/server/puzzles/cipher-decode.ts#L18-L142)
- [rhythm-tap.ts](file://src/server/puzzles/rhythm-tap.ts#L19-L134)

**Section sources**
- [role-assigner.ts](file://src/server/services/role-assigner.ts#L24-L77)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L103-L154)
- [cipher-decode.ts](file://src/server/puzzles/cipher-decode.ts#L96-L140)
- [level_01.yaml](file://config/level_01.yaml#L40-L61)

### Glitch Meter and Visual Effects
- Glitch State
  - GlitchState includes current value, maximum threshold, and optional decay rate. The server increments the value on incorrect actions and broadcasts updates to clients.
- Client Effects
  - Visual FX apply CSS animations and filters based on glitch intensity. Effects include screen shake, chromatic aberration, scanlines, VHS noise, and matrix glitches. Audio cues accompany glitch hits.

```mermaid
flowchart TD
Start(["Action Received"]) --> Check["Is result.glitchDelta > 0?"]
Check --> |No| Broadcast["Broadcast PUZZLE_UPDATE"]
Check --> |Yes| Inc["Add to Glitch.value (clamped to Max)"]
Inc --> Persist["Persist Room"]
Persist --> Emit["Emit GLITCH_UPDATE"]
Emit --> ApplyFX["Apply Visual FX (shake, hue, noise)"]
ApplyFX --> CheckDefeat{"Glitch.value >= Max?"}
CheckDefeat --> |Yes| Defeat["handleDefeat('glitch')"]
CheckDefeat --> |No| Broadcast
Broadcast --> End(["Done"])
Defeat --> End
```

**Diagram sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)
- [game-engine.ts](file://src/server/services/game-engine.ts#L429-L449)
- [glitch.css](file://src/client/styles/glitch.css#L6-L210)
- [visual-fx.ts](file://src/client/lib/visual-fx.ts#L79-L111)

**Section sources**
- [types.ts](file://shared/types.ts#L51-L56)
- [game-engine.ts](file://src/server/services/game-engine.ts#L429-L449)
- [glitch.css](file://src/client/styles/glitch.css#L1-L421)
- [visual-fx.ts](file://src/client/lib/visual-fx.ts#L1-L112)

### No-Registration Player Entry and Room Management
- Room Codes
  - Room codes are generated from memorable words or random 4-character strings. Players join by entering a code; names are not persisted across sessions.
- Room Lifecycle
  - Rooms support creation, joining, leaving, and host reassignment. Redis persists room state; on restart, rooms are reloaded.

```mermaid
sequenceDiagram
participant U as "User"
participant RM as "RoomManager"
participant SO as "Socket"
participant GE as "GameEngine"
U->>SO : "JOIN_ROOM(code, name)"
SO->>RM : "joinRoom(code, id, name)"
alt Found
RM-->>SO : "{ room, player }"
SO->>GE : "syncPlayer() on connect"
else Not Found
RM-->>SO : "{ error : 'Room not found' }"
end
```

**Diagram sources**
- [room-manager.ts](file://src/server/services/room-manager.ts#L89-L154)
- [room-manager.ts](file://src/server/services/room-manager.ts#L21-L42)

**Section sources**
- [room-manager.ts](file://src/server/services/room-manager.ts#L21-L42)
- [room-manager.ts](file://src/server/services/room-manager.ts#L89-L154)

### Progressive Difficulty, Timer Mechanics, and Scoring
- Level Configuration
  - Levels define timer_seconds and global glitch parameters. Puzzles define glitch_penalty values that contribute to the shared meter.
- Timer
  - A server-side GameTimer decrements every second and triggers defeat on expiration. Timers resume after server restarts.
- Scoring
  - Final score considers elapsed time and final glitch value, encouraging speed and precision.

```mermaid
flowchart TD
Init(["startGame()"]) --> Load["Load Level Config"]
Load --> StartTimer["Create GameTimer(total, tick, expire)"]
StartTimer --> Tick["OnTick: TIMER_UPDATE"]
StartTimer --> Expire{"remaining <= 0?"}
Expire --> |Yes| Defeat["handleDefeat('timer')"]
Expire --> |No| Continue["Continue Playing"]
Continue --> Actions["handlePuzzleAction() adds glitch"]
Actions --> Win{"checkWin()?"}
Win --> |Yes| Next["startPuzzleBriefing(next)"]
Win --> |No| Continue
Next --> Complete{"All puzzles done?"}
Complete --> |Yes| Victory["handleVictory()"]
Complete --> |No| Init
```

**Diagram sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [timer.ts](file://src/server/utils/timer.ts#L30-L42)
- [game-engine.ts](file://src/server/services/game-engine.ts#L124-L127)
- [game-engine.ts](file://src/server/services/game-engine.ts#L488-L521)
- [level_01.yaml](file://config/level_01.yaml#L19-L24)

**Section sources**
- [level_01.yaml](file://config/level_01.yaml#L17-L24)
- [timer.ts](file://src/server/utils/timer.ts#L1-L81)
- [game-engine.ts](file://src/server/services/game-engine.ts#L451-L456)

### Asymmetric Puzzle Views in Practice
- Asymmetric Symbols
  - One player (Navigator) sees target words and progress; others (Decoders) see flying letters and capture state. Navigators guide Decoders to capture correct letters.
- Cipher Decode
  - Cryptographer sees the substitution key and current encrypted sentence; Scribes submit decoded text using the key.
- Rhythm Tap
  - All players tap colors in sync to a sequence; success advances rounds.

```mermaid
sequenceDiagram
participant Nav as "Navigator"
participant Dec as "Decoder"
participant PH as "PuzzleHandler"
participant GE as "GameEngine"
participant CL as "Client"
GE->>PH : "getPlayerView(state, navId, 'Navigator', config)"
PH-->>GE : "PlayerView { viewData : solutionWords... }"
GE->>Nav : "PUZZLE_START with solution view"
GE->>PH : "getPlayerView(state, decId, 'Decoder', config)"
PH-->>GE : "PlayerView { viewData : flying letters... }"
GE->>Dec : "PUZZLE_START with decoder view"
Nav->>GE : "Navigate Decoders"
Dec->>GE : "capture_letter(letter)"
GE->>PH : "handleAction(...)"
PH-->>GE : "{ state, glitchDelta }"
GE->>GE : "addGlitch()"
GE->>CL : "GLITCH_UPDATE"
GE->>Nav : "PUZZLE_UPDATE"
GE->>Dec : "PUZZLE_UPDATE"
```

**Diagram sources**
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L103-L154)
- [asymmetric-symbols.client.ts](file://src/client/puzzles/asymmetric-symbols.ts#L28-L105)
- [cipher-decode.ts](file://src/server/puzzles/cipher-decode.ts#L96-L140)
- [cipher-decode.client.ts](file://src/client/puzzles/cipher-decode.ts#L10-L20)
- [rhythm-tap.ts](file://src/server/puzzles/rhythm-tap.ts#L107-L132)

**Section sources**
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L103-L154)
- [cipher-decode.ts](file://src/server/puzzles/cipher-decode.ts#L96-L140)
- [rhythm-tap.ts](file://src/server/puzzles/rhythm-tap.ts#L107-L132)
- [asymmetric-symbols.client.ts](file://src/client/puzzles/asymmetric-symbols.ts#L28-L105)
- [cipher-decode.client.ts](file://src/client/puzzles/cipher-decode.ts#L10-L20)

### Gameplay Flow: From Room Creation to Results
- Room Creation and Entry
  - Host creates a room; guests join via 4-character code. The lobby allows level selection and readiness.
- Mission Start
  - After readiness, the level intro plays, followed by puzzle briefings and transitions.
- Puzzle Loop
  - Each puzzle begins with role assignment and a role-specific view. Players submit actions; correct actions advance, mistakes increase glitch.
- Completion and Results
  - Completing all puzzles leads to victory; otherwise, defeat via timer or glitch. Scores are recorded post-victory.

```mermaid
stateDiagram-v2
[*] --> Lobby
Lobby --> Level_Intro : "Start Mission"
Level_Intro --> Briefing : "Intro complete"
Briefing --> Playing : "All ready"
Playing --> Puzzle_Complete : "Win condition met"
Playing --> Glitch_Update : "Mistake"
Glitch_Update --> Playing : "Continue"
Glitch_Update --> Defeat : "Glitch max reached"
Puzzle_Complete --> Briefing : "Next puzzle"
Briefing --> Victory : "All puzzles done"
Briefing --> Defeat : "Timer expired"
Victory --> [*]
Defeat --> [*]
```

**Diagram sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L169-L236)
- [game-engine.ts](file://src/server/services/game-engine.ts#L388-L424)
- [game-engine.ts](file://src/server/services/game-engine.ts#L488-L550)

**Section sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L57-L139)
- [room-manager.ts](file://src/server/services/room-manager.ts#L60-L87)

## Dependency Analysis
- Server Services
  - GameEngine depends on RoomManager, RoleAssigner, puzzle handlers, and timer utilities. It emits typed events consumed by clients.
- Client Screens and Puzzles
  - The puzzle screen dynamically renders the appropriate client-side renderer based on puzzle type. Visual FX depend on CSS classes and event-driven triggers.
- Shared Contracts
  - Types and events define the canonical interfaces for state, roles, puzzle configurations, and Socket payloads.

```mermaid
graph LR
GE["GameEngine"] --> RM["RoomManager"]
GE --> RA["RoleAssigner"]
GE --> PH["PuzzleHandlers"]
GE --> TM["GameTimer"]
GE --> EV["ServerEvents (types.ts)"]
CL["Client Screens/Puzzles"] --> EV
CL --> FX["Visual FX (glitch.css)"]
```

**Diagram sources**
- [game-engine.ts](file://src/server/services/game-engine.ts#L14-L48)
- [types.ts](file://shared/types.ts#L1-L187)
- [puzzle.ts](file://src/client/screens/puzzle.ts#L11-L19)
- [glitch.css](file://src/client/styles/glitch.css#L1-L421)

**Section sources**
- [types.ts](file://shared/types.ts#L1-L187)
- [events.ts](file://shared/events.ts)

## Performance Considerations
- Client-Side Rendering
  - Minimal DOM updates via targeted selectors and incremental DOM patches reduce overhead.
- Visual Effects
  - CSS animations and transforms are GPU-friendly; avoid excessive concurrent effects to maintain smoothness.
- Network Efficiency
  - Server emits compact payloads (PlayerView, TimerState, GlitchState). Client updates only affected DOM nodes.
- Timer Precision
  - Server-authoritative timers prevent drift; clients rely on periodic updates.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Room Join Failures
  - Verify the room exists and is not full. Check Redis connectivity if rooms fail to persist.
- Stuck in Briefing
  - Ensure all players press “Ready”; readiness requires all players in the current phase.
- Glitch Not Increasing
  - Confirm puzzle actions produce errors; verify glitch_penalty values in level config.
- Visual FX Not Triggering
  - Check CSS class toggling and that effects are registered in the FX registry.
- Timer Not Counting Down
  - Inspect server logs for timer start/resume and ensure no lingering intervals.

**Section sources**
- [room-manager.ts](file://src/server/services/room-manager.ts#L89-L154)
- [game-engine.ts](file://src/server/services/game-engine.ts#L169-L236)
- [game-engine.ts](file://src/server/services/game-engine.ts#L429-L449)
- [visual-fx.ts](file://src/client/lib/visual-fx.ts#L1-L112)
- [timer.ts](file://src/server/utils/timer.ts#L30-L42)

## Conclusion
Project ODYSSEY blends asymmetric role mechanics, shared environmental stress via the glitch meter, and tight collaboration to deliver a compelling co-op escape room experience. The config-first design enables rapid iteration on puzzles and levels, while the clean separation of concerns ensures maintainability. Success hinges on balancing individual puzzle skills with team communication and coordination.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices
- Example Level Configuration
  - See the first mission’s YAML for puzzle definitions, roles, and glitch parameters.
- Adding a New Puzzle
  - Implement a server handler, register it, add client renderer and dispatch, extend the type union, and configure in YAML.

**Section sources**
- [level_01.yaml](file://config/level_01.yaml#L1-L226)
- [ARCHITECTURE.md](file://ARCHITECTURE.md#L154-L178)