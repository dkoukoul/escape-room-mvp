# Asymmetric Symbols Puzzle

<cite>
**Referenced Files in This Document**
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts)
- [register.ts](file://src/server/puzzles/register.ts)
- [game-engine.ts](file://src/server/services/game-engine.ts)
- [events.ts](file://shared/events.ts)
- [types.ts](file://shared/types.ts)
- [socket.ts](file://src/client/lib/socket.ts)
- [dom.ts](file://src/client/lib/dom.ts)
- [puzzle.ts](file://src/client/screens/puzzle.ts)
- [puzzles.css](file://src/client/styles/puzzles.css)
- [audio-manager.ts](file://src/client/audio/audio-manager.ts)
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
The Asymmetric Symbols puzzle is a collaborative, role-based challenge where players must arrange symbols into asymmetric patterns. The puzzle enforces asymmetric information: one player (Navigator) sees the target words and guides the team, while other players (Decoders) see flying letters and must capture the correct symbols in order. The implementation spans client-side rendering with animated flying letters, dragless interaction via clicks, and server-side validation ensuring correct symbol placement and scoring.

## Project Structure
The puzzle integrates across client and server layers:
- Client-side puzzle renderer and DOM helpers
- Socket event orchestration and screen routing
- Server-side puzzle handler implementing game logic and role-based visibility
- Shared types and events for typed communication
- Audio feedback and CSS animations for immersive UX

```mermaid
graph TB
subgraph "Client"
A["asymmetric-symbols.ts<br/>Renderer & Interactions"]
B["puzzle.ts<br/>Screen Router"]
C["socket.ts<br/>Typed Events"]
D["dom.ts<br/>DOM Helpers"]
E["puzzles.css<br/>Animations & Styles"]
F["audio-manager.ts<br/>Feedback Sounds"]
end
subgraph "Server"
G["asymmetric-symbols.ts<br/>Puzzle Handler"]
H["puzzle-handler.ts<br/>Interface & Registry"]
I["register.ts<br/>Handler Registration"]
J["game-engine.ts<br/>Lifecycle & Updates"]
K["events.ts<br/>Shared Event Types"]
L["types.ts<br/>Shared Types"]
end
A --> B
B --> C
C --> J
J --> G
G --> H
H --> I
A --> D
A --> E
A --> F
J --> K
G --> L
C --> K
```

**Diagram sources**
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L1-L221)
- [puzzle.ts](file://src/client/screens/puzzle.ts#L1-L101)
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [dom.ts](file://src/client/lib/dom.ts#L1-L73)
- [puzzles.css](file://src/client/styles/puzzles.css#L1-L155)
- [audio-manager.ts](file://src/client/audio/audio-manager.ts#L1-L164)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L1-L156)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L1-L57)
- [register.ts](file://src/server/puzzles/register.ts#L1-L21)
- [game-engine.ts](file://src/server/services/game-engine.ts#L1-L711)
- [events.ts](file://shared/events.ts#L1-L228)
- [types.ts](file://shared/types.ts#L1-L187)

**Section sources**
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L1-L221)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L1-L156)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L1-L57)
- [register.ts](file://src/server/puzzles/register.ts#L1-L21)
- [game-engine.ts](file://src/server/services/game-engine.ts#L1-L711)
- [events.ts](file://shared/events.ts#L1-L228)
- [types.ts](file://shared/types.ts#L1-L187)
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [dom.ts](file://src/client/lib/dom.ts#L1-L73)
- [puzzle.ts](file://src/client/screens/puzzle.ts#L1-L101)
- [puzzles.css](file://src/client/styles/puzzles.css#L1-L155)
- [audio-manager.ts](file://src/client/audio/audio-manager.ts#L1-L164)

## Core Components
- Client Renderer: Creates the UI for both Navigator and Decoder views, spawns animated flying letters, handles click interactions, and updates HUD displays.
- Server Handler: Manages puzzle initialization, validates captures, tracks progress, and computes win conditions.
- Game Engine: Coordinates puzzle lifecycle, role assignment, broadcasting updates, and applying penalties.
- Shared Contracts: Strongly typed events and data structures ensure reliable client-server communication.

Key responsibilities:
- Asymmetric Information: Navigator sees target words and progress; Decoders see flying letters and capture state.
- Symbol Positioning: Flying letters spawn at random positions with deterministic seeding for synchronization.
- Validation: Correct letters fill blanks in word order; wrong captures increment glitch.
- Scoring: Derived from elapsed time and final glitch value.

**Section sources**
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L28-L221)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L18-L156)
- [game-engine.ts](file://src/server/services/game-engine.ts#L263-L383)
- [events.ts](file://shared/events.ts#L112-L197)
- [types.ts](file://shared/types.ts#L157-L164)

## Architecture Overview
The puzzle follows a clear separation of concerns:
- Client renders the puzzle and sends actions via typed events.
- Server validates actions, updates state, and broadcasts view updates.
- Game engine orchestrates lifecycle transitions and scoring.

```mermaid
sequenceDiagram
participant Client as "Client Renderer"
participant Socket as "Socket Client"
participant Engine as "Game Engine"
participant Handler as "Puzzle Handler"
participant Server as "Server"
Client->>Socket : Emit PUZZLE_ACTION {action : "capture_letter", data : {letter}}
Socket->>Engine : Forward action
Engine->>Handler : handleAction(state, playerId, action, data)
Handler-->>Engine : Updated state + glitchDelta
Engine->>Engine : Persist room state
Engine->>Socket : Broadcast PUZZLE_UPDATE with PlayerView
Socket->>Client : Deliver update
Client->>Client : Update HUD and animations
```

**Diagram sources**
- [socket.ts](file://src/client/lib/socket.ts#L51-L57)
- [events.ts](file://shared/events.ts#L36-L37)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L54-L96)

**Section sources**
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)
- [events.ts](file://shared/events.ts#L28-L90)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L54-L96)

## Detailed Component Analysis

### Client: Asymmetric Symbols Renderer
Responsibilities:
- Render Navigator vs Decoder views with role badges and contextual instructions.
- Spawn flying letters at randomized positions with synchronized PRNG.
- Handle click interactions and provide immediate visual feedback.
- Update HUD counters and progress displays.
- Manage cleanup of intervals and DOM nodes.

Rendering logic:
- Navigator view shows target word, captured letters, and progress.
- Decoder view shows current word length, captured letters, and completion status.
- Arena areas are populated with animated letter elements.

Interaction model:
- Clicking a letter emits a capture action to the server.
- Visual feedback includes scaling, glow, and removal animations.

```mermaid
flowchart TD
Start(["Render Entry"]) --> CheckRole{"Role == Navigator?"}
CheckRole --> |Yes| NavView["Render Navigator View<br/>- Target word<br/>- Captured letters<br/>- Progress HUD"]
CheckRole --> |No| DecView["Render Decoder View<br/>- Word length<br/>- Captured count<br/>- Completion status"]
NavView --> SpawnNav["Start Spawner<br/>Read-only arena"]
DecView --> SpawnDec["Start Spawner<br/>Interactable arena"]
SpawnNav --> LoopNav["Interval: Spawn Letter<br/>PRNG position + lifetime"]
SpawnDec --> LoopDec["Interval: Spawn Letter<br/>PRNG position + lifetime"]
LoopDec --> Click["onClick: Emit PUZZLE_ACTION"]
Click --> Feedback["Add 'captured' class<br/>Remove after short delay"]
Feedback --> UpdateHUD["Update HUD text"]
```

**Diagram sources**
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L28-L160)
- [dom.ts](file://src/client/lib/dom.ts#L11-L44)
- [puzzles.css](file://src/client/styles/puzzles.css#L77-L154)

**Section sources**
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L28-L221)
- [dom.ts](file://src/client/lib/dom.ts#L1-L73)
- [puzzles.css](file://src/client/styles/puzzles.css#L66-L154)
- [audio-manager.ts](file://src/client/audio/audio-manager.ts#L142-L164)

### Server: Asymmetric Symbols Handler
Responsibilities:
- Initialize puzzle with shuffled solution words and round limits.
- Validate capture actions and update captured letters in order.
- Track completed words and move to the next word when complete.
- Compute win condition when all selected words are completed.
- Provide role-specific views with asymmetric data.

Validation logic:
- Find the first unfilled position matching the captured letter in the current word.
- On match, mark the position and record who captured it.
- On miss, increment wrong captures and apply glitch penalty.

```mermaid
flowchart TD
Init(["init(players, config)"]) --> Shuffle["Shuffle solution_words"]
Shuffle --> Select["Select rounds_to_play or all"]
Select --> State["Initialize puzzleData:<br/>- solutionWords<br/>- currentWordIndex=0<br/>- capturedLetters=[_]*len(word)<br/>- capturedBy{}<br/>- wrongCaptures=0<br/>- completedWords=[]"]
Action(["handleAction(action='capture_letter')"]) --> HasWord{"Has current word?"}
HasWord --> |No| ReturnState["Return state unchanged"]
HasWord --> |Yes| FindPos["Scan current word for matching letter<br/>at unfilled position"]
FindPos --> Found{"Found match?"}
Found --> |Yes| Mark["Fill position<br/>Record capturedBy[id]=playerId"]
Mark --> CheckComplete{"All positions filled?"}
CheckComplete --> |Yes| NextWord["Add to completedWords<br/>Advance currentWordIndex<br/>Reset capturedLetters for next word"]
CheckComplete --> |No| KeepGoing["Continue"]
Found --> |No| Miss["Increment wrongCaptures<br/>Set glitchDelta=penalty"]
Miss --> ReturnUpdated["Return updated state"]
NextWord --> ReturnUpdated
KeepGoing --> ReturnUpdated
ReturnState --> End(["End"])
ReturnUpdated --> End
```

**Diagram sources**
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L18-L101)

**Section sources**
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L18-L156)
- [types.ts](file://shared/types.ts#L72-L83)

### Role-Based Visibility System
The server constructs distinct PlayerView payloads per role:
- Navigator: Receives full solution words, current index, captured letters, completed words, and timing parameters.
- Decoder: Receives current word length, captured letters, captured count, completed words, and timing parameters.

This ensures asymmetric information and prevents Decoders from seeing the target words directly.

```mermaid
classDiagram
class PlayerView {
+string playerId
+string role
+string puzzleId
+PuzzleType puzzleType
+string puzzleTitle
+Record~string,unknown~ viewData
}
class SymbolsData {
+string[] solutionWords
+number currentWordIndex
+string[] capturedLetters
+Record~string,string~ capturedBy
+number wrongCaptures
+string[] completedWords
}
class NavigatorView {
+string[] solutionWords
+number currentWordIndex
+string[] capturedLetters
+string[] completedWords
+number totalWords
+number spawnIntervalMs
+number letterLifetimeMs
+number decoyRatio
+string glitchSpeed
}
class DecoderView {
+number currentWordLength
+string[] capturedLetters
+number capturedCount
+number completedWords
+number totalWords
+number spawnIntervalMs
+number letterLifetimeMs
+number decoyRatio
+string glitchSpeed
}
PlayerView --> SymbolsData : "contains"
PlayerView --> NavigatorView : "Navigator viewData"
PlayerView --> DecoderView : "Decoder viewData"
```

**Diagram sources**
- [types.ts](file://shared/types.ts#L157-L164)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L103-L154)

**Section sources**
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L103-L154)
- [types.ts](file://shared/types.ts#L157-L164)

### Client-Server Communication Patterns
- Client emits typed actions using the shared event namespace.
- Server responds with PUZZLE_UPDATE containing the updated PlayerView for all clients.
- The game engine persists state and applies glitch penalties when mistakes occur.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Events as "Shared Events"
participant Engine as "Game Engine"
participant Handler as "Puzzle Handler"
Client->>Events : Emit ClientEvents.PUZZLE_ACTION
Events-->>Engine : ServerEvents.PUZZLE_ACTION
Engine->>Handler : handleAction(state, playerId, action, data)
Handler-->>Engine : {state, glitchDelta}
Engine->>Engine : Persist room state
Engine->>Events : Broadcast ServerEvents.PUZZLE_UPDATE
Events-->>Client : Receive PUZZLE_UPDATE
Client->>Client : updateAsymmetricSymbols(view)
```

**Diagram sources**
- [events.ts](file://shared/events.ts#L28-L90)
- [socket.ts](file://src/client/lib/socket.ts#L51-L57)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L54-L96)

**Section sources**
- [events.ts](file://shared/events.ts#L112-L197)
- [socket.ts](file://src/client/lib/socket.ts#L51-L57)
- [game-engine.ts](file://src/server/services/game-engine.ts#L324-L383)

### Visual Feedback and Animations
- CSS keyframes define floating, capture, and miss animations for flying letters.
- Navigator HUD highlights captured letters and progress.
- Decoder HUD shows captured count and word completion.
- Audio feedback plays upon successful captures.

```mermaid
flowchart TD
Click["User clicks letter"] --> Emit["Emit PUZZLE_ACTION"]
Emit --> Server["Server validates"]
Server --> |Correct| Animate["Add 'captured' class<br/>Scale + fade out"]
Server --> |Incorrect| MissAnim["Add 'missed' class<br/>Shake + scale down"]
Animate --> Update["Broadcast PUZZLE_UPDATE"]
MissAnim --> Update
Update --> HUD["Update HUD text"]
Animate --> Sound["playSuccess()"]
MissAnim --> Sound2["playGlitchHit()"]
```

**Diagram sources**
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L148-L160)
- [puzzles.css](file://src/client/styles/puzzles.css#L111-L154)
- [audio-manager.ts](file://src/client/audio/audio-manager.ts#L118-L164)

**Section sources**
- [puzzles.css](file://src/client/styles/puzzles.css#L77-L154)
- [audio-manager.ts](file://src/client/audio/audio-manager.ts#L118-L164)
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L148-L160)

## Dependency Analysis
- Handler registration binds puzzle type to its implementation.
- Game engine depends on the handler registry and role assignments.
- Client depends on shared events and types for reliable communication.
- CSS and audio enhance UX without changing core logic.

```mermaid
graph LR
Reg["register.ts"] --> PH["puzzle-handler.ts"]
PH --> ASH["asymmetric-symbols.ts (server)"]
GE["game-engine.ts"] --> ASH
GE --> Events["events.ts"]
ASH --> Types["types.ts"]
AC["asymmetric-symbols.ts (client)"] --> Dom["dom.ts"]
AC --> Css["puzzles.css"]
AC --> Audio["audio-manager.ts"]
AC --> Events
AC --> Socket["socket.ts"]
```

**Diagram sources**
- [register.ts](file://src/server/puzzles/register.ts#L14-L20)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L46-L56)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L1-L156)
- [game-engine.ts](file://src/server/services/game-engine.ts#L263-L319)
- [events.ts](file://shared/events.ts#L1-L228)
- [types.ts](file://shared/types.ts#L1-L187)
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L1-L221)
- [dom.ts](file://src/client/lib/dom.ts#L1-L73)
- [puzzles.css](file://src/client/styles/puzzles.css#L1-L155)
- [audio-manager.ts](file://src/client/audio/audio-manager.ts#L1-L164)
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)

**Section sources**
- [register.ts](file://src/server/puzzles/register.ts#L1-L21)
- [puzzle-handler.ts](file://src/server/puzzles/puzzle-handler.ts#L1-L57)
- [asymmetric-symbols.ts](file://src/server/puzzles/asymmetric-symbols.ts#L1-L156)
- [game-engine.ts](file://src/server/services/game-engine.ts#L263-L319)
- [events.ts](file://shared/events.ts#L1-L228)
- [types.ts](file://shared/types.ts#L1-L187)
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L1-L221)
- [dom.ts](file://src/client/lib/dom.ts#L1-L73)
- [puzzles.css](file://src/client/styles/puzzles.css#L1-L155)
- [audio-manager.ts](file://src/client/audio/audio-manager.ts#L1-L164)
- [socket.ts](file://src/client/lib/socket.ts#L1-L85)

## Performance Considerations
- Deterministic PRNG ensures synchronized letter generation across clients without excessive network traffic.
- CSS animations minimize JavaScript overhead for smooth visuals.
- Interval-based spawning avoids continuous polling; intervals are cleared on unmount.
- Server-side validation is O(n) per action, where n is the current word length—efficient for typical word sizes.

## Troubleshooting Guide
Common issues and resolutions:
- No letters spawning: Verify spawn interval and lifetime parameters are present in view data; ensure the arena element exists.
- Clicks not registering: Confirm interactive mode is enabled for Decoders and that event listeners are attached.
- HUD not updating: Check that PUZZLE_UPDATE messages are received and update functions are invoked.
- Glitch not increasing: Ensure wrong captures are being counted and glitch deltas are applied by the engine.
- Audio not playing: Resume audio context on user gesture and verify buffers are decoded before playback.

**Section sources**
- [asymmetric-symbols.ts](file://src/client/puzzles/asymmetric-symbols.ts#L107-L160)
- [game-engine.ts](file://src/server/services/game-engine.ts#L349-L352)
- [audio-manager.ts](file://src/client/audio/audio-manager.ts#L33-L54)

## Conclusion
The Asymmetric Symbols puzzle demonstrates a clean separation of concerns with robust role-based visibility, efficient client-server communication, and immersive visual feedback. The server enforces precise validation and scoring, while the client delivers responsive interactions and animations. Together, these components create a cohesive collaborative experience tailored for escape room gameplay.