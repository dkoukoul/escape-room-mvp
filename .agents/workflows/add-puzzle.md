---
description: How to add a new puzzle type to the game
---

# Add a New Puzzle Type

This workflow covers adding a new server-side puzzle handler, client-side renderer, and YAML config entry.

## Steps

### 1. Add the puzzle type to the shared type union

In `shared/types.ts`, add your new type to the `PuzzleType` union:

```typescript
export type PuzzleType =
  | "asymmetric_symbols"
  | "rhythm_tap"
  | "collaborative_wiring"
  | "cipher_decode"
  | "collaborative_assembly"
  | "my_new_puzzle"; // ← add here
```

### 2. Create the server-side puzzle handler

Create `src/server/puzzles/my-new-puzzle.ts` implementing the `PuzzleHandler` interface:

```typescript
import type { PuzzleHandler } from "./puzzle-handler.ts";
import type {
  Player,
  PuzzleConfig,
  PuzzleState,
  PlayerView,
} from "../../../shared/types.ts";

export const myNewPuzzleHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    // Initialize puzzle state from config.data and players
    return {
      puzzleId: config.id,
      type: config.type,
      status: "active",
      data: {
        /* puzzle-specific state */
      },
    };
  },

  handleAction(state, playerId, action, data) {
    // Process player input, return updated state and glitch penalty
    return { state, glitchDelta: 0 };
  },

  checkWin(state) {
    // Return true when the puzzle is solved
    return false;
  },

  getPlayerView(state, playerId, playerRole, config) {
    // Return role-specific view data for this player
    return {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
      viewData: {
        /* what this player sees based on their role */
      },
    };
  },
};
```

### 3. Register the handler

In `src/server/puzzles/register.ts`, import and register:

```typescript
import { myNewPuzzleHandler } from "./my-new-puzzle.ts";
registerPuzzleHandler("my_new_puzzle", myNewPuzzleHandler);
```

### 4. Create the client-side renderer

Create `src/client/puzzles/my-new-puzzle.ts` exporting `render` and `update` functions:

```typescript
import type { PlayerView, RoleAssignment } from "@shared/types.ts";
import { h, mount } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";

export function renderMyNewPuzzle(
  container: HTMLElement,
  view: PlayerView,
): void {
  // Build the DOM for this puzzle using h() helper
  // Use emit(ClientEvents.PUZZLE_ACTION, { puzzleId, action, data }) for player inputs
}

export function updateMyNewPuzzle(view: PlayerView): void {
  // Update the DOM when server sends new state via PUZZLE_UPDATE
}
```

### 5. Wire it into the puzzle screen dispatcher

In `src/client/screens/puzzle.ts`, add cases to both `renderPuzzle()` and `updatePuzzle()`:

```typescript
case "my_new_puzzle":
  renderMyNewPuzzle(container, data.playerView);
  break;
```

```typescript
case "my_new_puzzle":
  updateMyNewPuzzle(view);
  break;
```

Don't forget to import the render/update functions at the top of the file.

### 6. Add puzzle-specific CSS

Add styles in `src/client/styles/puzzles.css` under a comment block:

```css
/* ---- My New Puzzle ---- */
```

### 7. Add a puzzle entry to a YAML level config

In `config/level_01.yaml` (or a new level file), add under `puzzles:`:

```yaml
- id: "my_puzzle_01"
  type: "my_new_puzzle"
  title: "My New Puzzle"
  briefing: "Story text shown to players before the puzzle starts."
  glitch_penalty: 5
  layout:
    roles:
      - name: "RoleA"
        count: 1
        description: "What RoleA sees and does"
      - name: "RoleB"
        count: "remaining"
        description: "What RoleB sees and does"
  data:
    # Puzzle-specific configuration
    key: "value"
```

### 8. Verify

// turbo

```bash
bun run typecheck
```

// turbo

```bash
bun test
```

Then manually test by starting the dev server (`bun run dev`) and playing through the puzzle.
