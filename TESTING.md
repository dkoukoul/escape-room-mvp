# Testing — Project ODYSSEY

## Test Runner

This project uses **Bun's built-in test runner**.

```bash
bun test                    # Run all tests
bun test --watch            # Watch mode
bun test src/server/puzzles # Run tests in a specific directory
```

## Type Checking

```bash
bun run typecheck           # Runs: bunx tsc --noEmit
```

## Existing Test Files

| File                                              | What it covers                                     |
| ------------------------------------------------- | -------------------------------------------------- |
| `src/server/puzzles/cipher-decode.test.ts`        | Cipher decode puzzle logic (encryption/decryption) |
| `src/server/puzzles/collaborative-wiring.test.ts` | Wiring puzzle switch interaction logic             |
| `src/server/services/room-manager.test.ts`        | Room creation, joining, and leaving                |

## Writing a New Test

Test files use the `.test.ts` extension and are colocated with the source files they test.

```typescript
// src/server/puzzles/my-puzzle.test.ts
import { describe, test, expect } from "bun:test";
import { myPuzzleHandler } from "./my-puzzle.ts";
import type { Player, PuzzleConfig } from "../../../shared/types.ts";

describe("My Puzzle", () => {
  const mockPlayers: Player[] = [
    {
      id: "p1",
      name: "Alice",
      roomCode: "test",
      role: "RoleA",
      isHost: true,
      connected: true,
    },
    {
      id: "p2",
      name: "Bob",
      roomCode: "test",
      role: "RoleB",
      isHost: false,
      connected: true,
    },
  ];

  const mockConfig: PuzzleConfig = {
    id: "test_puzzle",
    type: "my_puzzle",
    title: "Test Puzzle",
    briefing: "Test briefing",
    glitch_penalty: 5,
    layout: {
      roles: [
        { name: "RoleA", count: 1, description: "" },
        { name: "RoleB", count: "remaining", description: "" },
      ],
    },
    data: {
      /* puzzle-specific config */
    },
  };

  test("init creates valid state", () => {
    const state = myPuzzleHandler.init(mockPlayers, mockConfig);
    expect(state.status).toBe("active");
    expect(state.puzzleId).toBe("test_puzzle");
  });

  test("handleAction processes input correctly", () => {
    const state = myPuzzleHandler.init(mockPlayers, mockConfig);
    const result = myPuzzleHandler.handleAction(state, "p1", "some_action", {
      key: "value",
    });
    expect(result.glitchDelta).toBe(0);
  });

  test("checkWin detects completion", () => {
    const state = myPuzzleHandler.init(mockPlayers, mockConfig);
    expect(myPuzzleHandler.checkWin(state)).toBe(false);
    // ... modify state to winning condition ...
  });
});
```

## Manual Testing

1. Start the dev environment: `bun run dev`
2. Open `http://localhost:5173` in multiple browser tabs
3. Create a room in one tab, join with others using the room code
4. Verify puzzle behavior with different roles
