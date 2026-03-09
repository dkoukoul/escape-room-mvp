#!/usr/bin/env bun
// ============================================================
// Standalone Headless Puzzle Test Runner
// ============================================================
// Run this directly with: bun run e2e/puzzle-runner.ts
// Requires the server to be running on localhost:3000
// ============================================================

import { io, type Socket } from "socket.io-client";
import {
  ClientEvents,
  ServerEvents,
  type RoomCreatedPayload,
  type RoomJoinedPayload,
  type GameStartedPayload,
  type BriefingPayload,
  type PuzzleStartPayload,
  type PuzzleCompletedPayload,
  type GlitchUpdatePayload,
  type VictoryPayload,
  type PlayerListPayload,
} from "../shared/events.ts";

const SERVER_URL = `http://localhost:${process.env.SERVER_PORT || 3000}`;
const TIMEOUT = 30000;

const PLAYER_1 = { name: "TestPlayer_Alpha" };
const PLAYER_2 = { name: "TestPlayer_Beta" };

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function createSocket(): Socket {
  return io(SERVER_URL, {
    transports: ["websocket"],
    reconnection: false,
  });
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeoutMs);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Test Results Tracking
// ============================================================
interface PuzzleResult {
  puzzleId: string;
  puzzleType: string;
  completed: boolean;
  glitchesAdded: number;
  error?: string;
}

const results: {
  roomCode: string;
  puzzles: PuzzleResult[];
  totalGlitchPenalties: number;
  finalGlitchValue: number;
  victory: boolean;
  score: number;
} = {
  roomCode: "",
  puzzles: [],
  totalGlitchPenalties: 0,
  finalGlitchValue: 0,
  victory: false,
  score: 0,
};

// ============================================================
// Puzzle Test Functions
// ============================================================

async function runAsymmetricSymbolsPuzzle(
  socket1: Socket,
  socket2: Socket
): Promise<void> {
  log("\n📍 Puzzle 1: Asymmetric Symbols (Navigator + Decoder)", colors.cyan);

  const briefing = await waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
  await waitForEvent<BriefingPayload>(socket2, ServerEvents.BRIEFING);

  log(`  Briefing: ${briefing.puzzleTitle}`, colors.blue);

  // Both players ready up
  socket1.emit(ClientEvents.PLAYER_READY);
  socket2.emit(ClientEvents.PLAYER_READY);

  const puzzleStart1 = await waitForEvent<PuzzleStartPayload>(socket1, ServerEvents.PUZZLE_START);
  const puzzleStart2 = await waitForEvent<PuzzleStartPayload>(socket2, ServerEvents.PUZZLE_START);

  const result: PuzzleResult = {
    puzzleId: puzzleStart1.puzzleId,
    puzzleType: puzzleStart1.puzzleType,
    completed: false,
    glitchesAdded: 0,
  };
  results.puzzles.push(result);

  // Identify roles
  const role1 = puzzleStart1.playerView.role;
  const decoderSocket = role1 === "Decoder" ? socket1 : socket2;
  const navigatorView = role1 === "Navigator" ? puzzleStart1.playerView : puzzleStart2.playerView;

  const solutionWords = navigatorView.viewData.solutionWords as string[];
  log(`  Solution words: ${solutionWords.join(", ")}`, colors.blue);

  // Make a wrong capture first
  log("  Testing wrong capture (glitch penalty)...", colors.yellow);
  decoderSocket.emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: puzzleStart1.puzzleId,
    action: "capture_letter",
    data: { letter: "X" },
  });
  await delay(500);

  // Solve correctly
  const currentWord = solutionWords[0]!;
  log(`  Solving word: ${currentWord}`, colors.blue);
  for (const letter of currentWord) {
    decoderSocket.emit(ClientEvents.PUZZLE_ACTION, {
      puzzleId: puzzleStart1.puzzleId,
      action: "capture_letter",
      data: { letter },
    });
    await delay(200);
  }

  const completed = await waitForEvent<PuzzleCompletedPayload>(socket1, ServerEvents.PUZZLE_COMPLETED);
  await waitForEvent<PuzzleCompletedPayload>(socket2, ServerEvents.PUZZLE_COMPLETED);

  result.completed = true;
  log(`  ✅ Puzzle 1 completed!`, colors.green);
  await delay(3500);
}

async function runCollaborativeWiringPuzzle(
  socket1: Socket,
  socket2: Socket
): Promise<void> {
  log("\n📍 Puzzle 2: Collaborative Wiring (Engineers)", colors.cyan);

  const briefing = await waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
  await waitForEvent<BriefingPayload>(socket2, ServerEvents.BRIEFING);

  log(`  Briefing: ${briefing.puzzleTitle}`, colors.blue);

  socket1.emit(ClientEvents.PLAYER_READY);
  socket2.emit(ClientEvents.PLAYER_READY);

  const puzzleStart1 = await waitForEvent<PuzzleStartPayload>(socket1, ServerEvents.PUZZLE_START);
  await waitForEvent<PuzzleStartPayload>(socket2, ServerEvents.PUZZLE_START);

  const result: PuzzleResult = {
    puzzleId: puzzleStart1.puzzleId,
    puzzleType: puzzleStart1.puzzleType,
    completed: false,
    glitchesAdded: 0,
  };
  results.puzzles.push(result);

  const view1 = puzzleStart1.playerView;
  const mySwitches1 = view1.viewData.mySwitches as number[];

  log(`  Player 1 switches: [${mySwitches1.join(", ")}]`, colors.blue);

  // Wrong solution check first
  log("  Testing wrong solution check (glitch penalty)...", colors.yellow);
  socket1.emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: puzzleStart1.puzzleId,
    action: "check_solution",
    data: {},
  });
  await delay(500);

  // Toggle all switches
  log("  Toggling all switches...", colors.blue);
  for (const switchIdx of mySwitches1) {
    socket1.emit(ClientEvents.PUZZLE_ACTION, {
      puzzleId: puzzleStart1.puzzleId,
      action: "toggle_switch",
      data: { switchIndex: switchIdx },
    });
    await delay(100);
  }

  // Try to solve (may need multiple attempts)
  let solved = false;
  for (let i = 0; i < 5 && !solved; i++) {
    socket1.emit(ClientEvents.PUZZLE_ACTION, {
      puzzleId: puzzleStart1.puzzleId,
      action: "check_solution",
      data: {},
    });
    try {
      await waitForEvent<PuzzleCompletedPayload>(socket1, ServerEvents.PUZZLE_COMPLETED, 1000);
      solved = true;
    } catch {
      // Continue trying
    }
  }

  if (solved) {
    result.completed = true;
    log(`  ✅ Puzzle 2 completed!`, colors.green);
  } else {
    log(`  ⚠️ Puzzle 2 not completed (expected in test environment)`, colors.yellow);
  }

  await delay(3500);
}

async function runRhythmTapPuzzle(
  socket1: Socket,
  socket2: Socket
): Promise<void> {
  log("\n📍 Puzzle 3: Rhythm Tap (Oracle + Hoplite)", colors.cyan);

  const briefing = await waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
  await waitForEvent<BriefingPayload>(socket2, ServerEvents.BRIEFING);

  log(`  Briefing: ${briefing.puzzleTitle}`, colors.blue);

  socket1.emit(ClientEvents.PLAYER_READY);
  socket2.emit(ClientEvents.PLAYER_READY);

  const puzzleStart1 = await waitForEvent<PuzzleStartPayload>(socket1, ServerEvents.PUZZLE_START);
  const puzzleStart2 = await waitForEvent<PuzzleStartPayload>(socket2, ServerEvents.PUZZLE_START);

  const result: PuzzleResult = {
    puzzleId: puzzleStart1.puzzleId,
    puzzleType: puzzleStart1.puzzleType,
    completed: false,
    glitchesAdded: 0,
  };
  results.puzzles.push(result);

  const role1 = puzzleStart1.playerView.role;
  const hopliteSocket = role1 === "Hoplite" ? socket1 : socket2;
  const hopliteView = role1 === "Hoplite" ? puzzleStart1.playerView : puzzleStart2.playerView;

  const currentSequence = hopliteView.viewData.currentSequence as string[];
  log(`  Sequence: [${currentSequence.join(", ")}]`, colors.blue);

  // Wrong sequence first
  log("  Testing wrong sequence (glitch penalty)...", colors.yellow);
  hopliteSocket.emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: puzzleStart1.puzzleId,
    action: "submit_sequence",
    data: { taps: ["red", "green", "blue"] },
  });
  await delay(500);

  // Correct sequence
  log("  Submitting correct sequence...", colors.blue);
  hopliteSocket.emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: puzzleStart1.puzzleId,
    action: "submit_sequence",
    data: { taps: currentSequence },
  });

  try {
    await waitForEvent<PuzzleCompletedPayload>(socket1, ServerEvents.PUZZLE_COMPLETED, 5000);
    await waitForEvent<PuzzleCompletedPayload>(socket2, ServerEvents.PUZZLE_COMPLETED, 5000);
    result.completed = true;
    log(`  ✅ Puzzle 3 completed!`, colors.green);
  } catch {
    log(`  ⚠️ Puzzle 3 not completed`, colors.yellow);
  }

  await delay(3500);
}

async function runCipherDecodePuzzle(
  socket1: Socket,
  socket2: Socket
): Promise<void> {
  log("\n📍 Puzzle 4: Cipher Decode (Cryptographer + Scribe)", colors.cyan);

  const briefing = await waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
  await waitForEvent<BriefingPayload>(socket2, ServerEvents.BRIEFING);

  log(`  Briefing: ${briefing.puzzleTitle}`, colors.blue);

  socket1.emit(ClientEvents.PLAYER_READY);
  socket2.emit(ClientEvents.PLAYER_READY);

  const puzzleStart1 = await waitForEvent<PuzzleStartPayload>(socket1, ServerEvents.PUZZLE_START);
  const puzzleStart2 = await waitForEvent<PuzzleStartPayload>(socket2, ServerEvents.PUZZLE_START);

  const result: PuzzleResult = {
    puzzleId: puzzleStart1.puzzleId,
    puzzleType: puzzleStart1.puzzleType,
    completed: false,
    glitchesAdded: 0,
  };
  results.puzzles.push(result);

  const role1 = puzzleStart1.playerView.role;
  const scribeSocket = role1 === "Scribe" ? socket1 : socket2;
  const cryptoView = role1 === "Cryptographer" ? puzzleStart1.playerView : puzzleStart2.playerView;

  const cipherKey = cryptoView.viewData.cipherKey as Record<string, string>;
  const currentEncrypted = cryptoView.viewData.currentEncrypted as string;

  log(`  Encrypted: ${currentEncrypted}`, colors.blue);

  // Decode using cipher key
  const decoded = currentEncrypted
    .split("")
    .map((char) => cipherKey[char] || char)
    .join("");

  log(`  Decoded: ${decoded}`, colors.blue);

  // Wrong decode first
  log("  Testing wrong decode (glitch penalty)...", colors.yellow);
  scribeSocket.emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: puzzleStart1.puzzleId,
    action: "submit_decode",
    data: { text: "WRONG" },
  });
  await delay(500);

  // Correct decode
  log("  Submitting correct decode...", colors.blue);
  scribeSocket.emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: puzzleStart1.puzzleId,
    action: "submit_decode",
    data: { text: decoded },
  });

  try {
    await waitForEvent<PuzzleCompletedPayload>(socket1, ServerEvents.PUZZLE_COMPLETED, 5000);
    await waitForEvent<PuzzleCompletedPayload>(socket2, ServerEvents.PUZZLE_COMPLETED, 5000);
    result.completed = true;
    log(`  ✅ Puzzle 4 completed!`, colors.green);
  } catch {
    log(`  ⚠️ Puzzle 4 not completed`, colors.yellow);
  }

  await delay(3500);
}

async function runCollaborativeAssemblyPuzzle(
  socket1: Socket,
  socket2: Socket
): Promise<void> {
  log("\n📍 Puzzle 5: Collaborative Assembly (Architect + Builder)", colors.cyan);

  const briefing = await waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
  await waitForEvent<BriefingPayload>(socket2, ServerEvents.BRIEFING);

  log(`  Briefing: ${briefing.puzzleTitle}`, colors.blue);

  socket1.emit(ClientEvents.PLAYER_READY);
  socket2.emit(ClientEvents.PLAYER_READY);

  const puzzleStart1 = await waitForEvent<PuzzleStartPayload>(socket1, ServerEvents.PUZZLE_START);
  const puzzleStart2 = await waitForEvent<PuzzleStartPayload>(socket2, ServerEvents.PUZZLE_START);

  const result: PuzzleResult = {
    puzzleId: puzzleStart1.puzzleId,
    puzzleType: puzzleStart1.puzzleType,
    completed: false,
    glitchesAdded: 0,
  };
  results.puzzles.push(result);

  const role1 = puzzleStart1.playerView.role;
  const builderSocket = role1 === "Builder" ? socket1 : socket2;
  const builderView = role1 === "Builder" ? puzzleStart1.playerView : puzzleStart2.playerView;
  const architectView = role1 === "Architect" ? puzzleStart1.playerView : puzzleStart2.playerView;

  const myPieces = builderView.viewData.myPieces as Array<{ id: number; label: string; rotation: number }>;
  const blueprint = architectView.viewData.blueprint as Array<{ id: number; col: number; row: number; rotation: number }>;

  log(`  Builder has ${myPieces.length} pieces`, colors.blue);

  if (myPieces.length > 0) {
    const firstPiece = myPieces[0]!;

    // Wrong placement first
    log("  Testing wrong placement (glitch penalty)...", colors.yellow);
    builderSocket.emit(ClientEvents.PUZZLE_ACTION, {
      puzzleId: puzzleStart1.puzzleId,
      action: "place_piece",
      data: { pieceId: firstPiece.id, col: 99, row: 99 },
    });
    await delay(500);

    // Rotate if needed
    const blueprintPiece = blueprint.find((p) => p.id === firstPiece.id);
    if (blueprintPiece && blueprintPiece.rotation !== firstPiece.rotation) {
      builderSocket.emit(ClientEvents.PUZZLE_ACTION, {
        puzzleId: puzzleStart1.puzzleId,
        action: "rotate_piece",
        data: { pieceId: firstPiece.id },
      });
      await delay(200);
    }

    // Correct placement
    if (blueprintPiece) {
      log("  Placing piece correctly...", colors.blue);
      builderSocket.emit(ClientEvents.PUZZLE_ACTION, {
        puzzleId: puzzleStart1.puzzleId,
        action: "place_piece",
        data: { pieceId: firstPiece.id, col: blueprintPiece.col, row: blueprintPiece.row },
      });
    }
  }

  // Note: Assembly puzzle won't complete with just one piece placed
  log(`  ⚠️ Puzzle 5 partially tested (placed 1 piece)`, colors.yellow);

  await delay(3500);
}

// ============================================================
// Main Test Runner
// ============================================================

async function runTests(): Promise<void> {
  log("\n" + "=".repeat(60), colors.bright);
  log("  HEADLESS PUZZLE TEST RUNNER", colors.bright + colors.cyan);
  log("=".repeat(60), colors.bright);
  log(`\nServer URL: ${SERVER_URL}\n`, colors.blue);

  const socket1 = createSocket();
  const socket2 = createSocket();

  let glitchValue = 0;
  const glitchUpdates: number[] = [];

  // Track glitch updates
  socket1.on(ServerEvents.GLITCH_UPDATE, (data: GlitchUpdatePayload) => {
    const delta = data.glitch.value - glitchValue;
    if (delta > 0) {
      glitchUpdates.push(delta);
      const currentPuzzle = results.puzzles[results.puzzles.length - 1];
      if (currentPuzzle) {
        currentPuzzle.glitchesAdded += delta;
      }
    }
    glitchValue = data.glitch.value;
    results.finalGlitchValue = glitchValue;
  });

  try {
    // Connect both players
    log("Connecting players...", colors.blue);
    await Promise.all([
      new Promise<void>((resolve) => socket1.once("connect", resolve)),
      new Promise<void>((resolve) => socket2.once("connect", resolve)),
    ]);
    log("✅ Both players connected", colors.green);

    // Create room
    log("\nCreating room...", colors.blue);
    socket1.emit(ClientEvents.CREATE_ROOM, { playerName: PLAYER_1.name });
    const roomCreated = await waitForEvent<RoomCreatedPayload>(socket1, ServerEvents.ROOM_CREATED);
    results.roomCode = roomCreated.roomCode;
    log(`✅ Room created: ${results.roomCode}`, colors.green);

    // Join room
    log("Joining room...", colors.blue);
    socket2.emit(ClientEvents.JOIN_ROOM, {
      roomCode: results.roomCode,
      playerName: PLAYER_2.name,
    });

    await Promise.all([
      waitForEvent<RoomJoinedPayload>(socket2, ServerEvents.ROOM_JOINED),
      waitForEvent<PlayerListPayload>(socket1, ServerEvents.PLAYER_LIST_UPDATE),
    ]);
    log("✅ Player 2 joined", colors.green);

    // Select level and start game
    log("\nStarting game...", colors.blue);
    socket1.emit(ClientEvents.LEVEL_SELECT, { levelId: "akropolis_defrag" });
    await delay(500);

    socket1.emit(ClientEvents.START_GAME, { levelId: "akropolis_defrag" });

    const gameStarted = await waitForEvent<GameStartedPayload>(socket1, ServerEvents.GAME_STARTED);
    log(`✅ Game started: ${gameStarted.levelTitle}`, colors.green);
    log(`   Total puzzles: ${gameStarted.totalPuzzles}`, colors.blue);

    await waitForEvent<GameStartedPayload>(socket2, ServerEvents.GAME_STARTED);

    // Complete level intro
    log("\nCompleting level intro...", colors.blue);
    socket1.emit(ClientEvents.INTRO_COMPLETE);
    socket2.emit(ClientEvents.INTRO_COMPLETE);

    // Run all puzzles
    await runAsymmetricSymbolsPuzzle(socket1, socket2);
    await runCollaborativeWiringPuzzle(socket1, socket2);
    await runRhythmTapPuzzle(socket1, socket2);
    await runCipherDecodePuzzle(socket1, socket2);
    await runCollaborativeAssemblyPuzzle(socket1, socket2);

    // Wait for victory
    log("\nWaiting for victory...", colors.blue);
    const victory = await waitForEvent<VictoryPayload>(socket1, ServerEvents.VICTORY, 10000);
    await waitForEvent<VictoryPayload>(socket2, ServerEvents.VICTORY, 10000);

    results.victory = true;
    results.score = victory.score;
    results.totalGlitchPenalties = glitchUpdates.length;

    log("\n" + "=".repeat(60), colors.bright);
    log("  VICTORY!", colors.bright + colors.green);
    log("=".repeat(60), colors.bright);

  } catch (error) {
    log(`\n❌ Test failed: ${(error as Error).message}`, colors.red);
    throw error;
  } finally {
    socket1.disconnect();
    socket2.disconnect();
  }
}

// ============================================================
// Print Results
// ============================================================

function printResults(): void {
  log("\n" + "=".repeat(60), colors.bright);
  log("  TEST RESULTS", colors.bright);
  log("=".repeat(60), colors.bright);

  log(`\nRoom Code: ${results.roomCode}`, colors.blue);
  log(`Victory: ${results.victory ? "✅ YES" : "❌ NO"}`, results.victory ? colors.green : colors.red);
  log(`Final Score: ${results.score}`, colors.blue);

  log("\n--- Puzzle Results ---", colors.bright);
  results.puzzles.forEach((puzzle, idx) => {
    const status = puzzle.completed ? "✅" : "⚠️";
    log(`\n${status} Puzzle ${idx + 1}: ${puzzle.puzzleId}`, colors.bright);
    log(`   Type: ${puzzle.puzzleType}`, colors.blue);
    log(`   Completed: ${puzzle.completed ? "Yes" : "No"}`, puzzle.completed ? colors.green : colors.yellow);
    log(`   Glitches from mistakes: ${puzzle.glitchesAdded}`, colors.blue);
  });

  log("\n--- Glitch Tracking ---", colors.bright);
  log(`Total glitch penalties: ${results.totalGlitchPenalties}`, colors.blue);
  log(`Final glitch value: ${results.finalGlitchValue}`, colors.blue);

  if (results.totalGlitchPenalties > 0) {
    log("\n✅ Glitch/mistake tracking verified!", colors.green);
  } else {
    log("\n⚠️ No glitch penalties recorded", colors.yellow);
  }

  log("\n" + "=".repeat(60), colors.bright);
}

// ============================================================
// Run
// ============================================================

runTests()
  .then(() => {
    printResults();
    process.exit(0);
  })
  .catch((error) => {
    printResults();
    console.error(error);
    process.exit(1);
  });
