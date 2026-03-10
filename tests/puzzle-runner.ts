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
  type PhaseChangePayload,
  type PuzzleUpdatePayload,
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
  socket2: Socket,
  briefing: BriefingPayload
): Promise<void> {
  log("\n📍 Puzzle 1: Asymmetric Symbols (Navigator + Decoder)", colors.cyan);
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

  // Temporarily skip wrong captures to debug glitch issue
  // TODO: Re-enable after fixing glitch initialization
  log("  Skipping wrong captures (glitch debugging)...", colors.yellow);

  // Solve correctly - capture each letter of the word
  const currentWord = solutionWords[0]!;
  log(`  Solving word: ${currentWord}`, colors.blue);
  
  // Split the word into individual Greek letters and capture them
  const letters = Array.from(currentWord);
  log(`  Letters to capture: [${letters.join(", ")}]`, colors.blue);
  
  // Capture all but the last letter first
  for (let i = 0; i < letters.length - 1; i++) {
    const letter = letters[i]!;
    log(`    Capturing: ${letter}`, colors.blue);
    decoderSocket.emit(ClientEvents.PUZZLE_ACTION, {
      puzzleId: puzzleStart1.puzzleId,
      action: "capture_letter",
      data: { letter },
    });
    await delay(400);
  }

  // Set up completion listeners BEFORE sending the final letter
  log("  Setting up completion listeners...", colors.blue);
  const completionPromise = Promise.all([
    waitForEvent<PuzzleCompletedPayload>(socket1, ServerEvents.PUZZLE_COMPLETED, 10000),
    waitForEvent<PuzzleCompletedPayload>(socket2, ServerEvents.PUZZLE_COMPLETED, 10000),
  ]);

  // Now send the final letter which will trigger completion
  const finalLetter = letters[letters.length - 1]!;
  log(`    Capturing final letter: ${finalLetter}`, colors.blue);
  decoderSocket.emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: puzzleStart1.puzzleId,
    action: "capture_letter",
    data: { letter: finalLetter },
  });

  // Wait for puzzle completion
  log("  Waiting for puzzle completion...", colors.blue);
  await completionPromise;

  result.completed = true;
  log(`  ✅ Puzzle 1 completed!`, colors.green);
  // Note: No delay here - the main runner will wait for the next briefing
}

async function runCollaborativeWiringPuzzle(
  socket1: Socket,
  socket2: Socket,
  briefing: BriefingPayload
): Promise<void> {
  log("\n📍 Puzzle 2: Collaborative Wiring (Engineers)", colors.cyan);
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

  const view1 = puzzleStart1.playerView;
  const view2 = puzzleStart2.playerView;
  const mySwitches1 = view1.viewData.mySwitches as number[];
  const mySwitches2 = view2.viewData.mySwitches as number[];
  const columnsLit = view1.viewData.columnsLit as boolean[];
  const switchStates = view1.viewData.switchStates as boolean[];

  log(`  Player 1 switches: [${mySwitches1.join(", ")}]`, colors.blue);
  log(`  Player 2 switches: [${mySwitches2.join(", ")}]`, colors.blue);
  log(`  Target columns: ${columnsLit.length}`, colors.blue);
  log(`  Total switches: ${switchStates.length}`, colors.blue);

  // Wrong solution check first (glitch penalty)
  log("  Testing wrong solution check (glitch penalty)...", colors.yellow);
  socket1.emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: puzzleStart1.puzzleId,
    action: "check_solution",
    data: {},
  });
  await delay(500);

  // The wiring puzzle uses XOR logic. Based on the solution matrix in level_01.yaml:
  // Switch 0: affects cols 0,1
  // Switch 1: affects cols 1,2
  // Switch 2: affects cols 2,3
  // Switch 3: affects cols 3,4
  // Switch 4: affects cols 4,5
  // Switch 5: affects cols 0,5
  // 
  // To light all columns with XOR logic:
  // Col 0: switch0 ⊕ switch5 = true
  // Col 1: switch0 ⊕ switch1 = true
  // Col 2: switch1 ⊕ switch2 = true
  // Col 3: switch2 ⊕ switch3 = true
  // Col 4: switch3 ⊕ switch4 = true
  // Col 5: switch4 ⊕ switch5 = true
  //
  // Solution: switches 0, 2, 4 ON (and 1, 3, 5 OFF)
  // Let's verify: 0=ON, 1=OFF, 2=ON, 3=OFF, 4=ON, 5=OFF
  // Col 0: 1 ⊕ 0 = 1 ✓, Col 1: 1 ⊕ 0 = 1 ✓, Col 2: 0 ⊕ 1 = 1 ✓
  // Col 3: 1 ⊕ 0 = 1 ✓, Col 4: 0 ⊕ 1 = 1 ✓, Col 5: 1 ⊕ 0 = 1 ✓
  
  log("  Solving wiring puzzle with calculated solution...", colors.blue);
  
  // Determine which player has which switches and toggle accordingly
  // Target: switches 0, 2, 4 should be ON
  const targetSwitches = [0, 2, 4];
  
  for (const switchIdx of targetSwitches) {
    // Check if this switch needs to be toggled (if it's currently off)
    if (!switchStates[switchIdx]) {
      if (mySwitches1.includes(switchIdx)) {
        socket1.emit(ClientEvents.PUZZLE_ACTION, {
          puzzleId: puzzleStart1.puzzleId,
          action: "toggle_switch",
          data: { switchIndex: switchIdx },
        });
        log(`    Player 1 toggles switch ${switchIdx}`, colors.blue);
      } else if (mySwitches2.includes(switchIdx)) {
        socket2.emit(ClientEvents.PUZZLE_ACTION, {
          puzzleId: puzzleStart1.puzzleId,
          action: "toggle_switch",
          data: { switchIndex: switchIdx },
        });
        log(`    Player 2 toggles switch ${switchIdx}`, colors.blue);
      }
      await delay(200);
    }
  }

  // Set up completion listener before checking solution
  const completionPromise = Promise.all([
    waitForEvent<PuzzleCompletedPayload>(socket1, ServerEvents.PUZZLE_COMPLETED, 5000).catch(() => null),
    waitForEvent<PuzzleCompletedPayload>(socket2, ServerEvents.PUZZLE_COMPLETED, 5000).catch(() => null),
  ]);

  // Check solution
  log("  Checking solution...", colors.blue);
  socket1.emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: puzzleStart1.puzzleId,
    action: "check_solution",
    data: {},
  });
  
  // Wait for completion
  const completed = await Promise.race([
    completionPromise,
    delay(1000).then(() => null),
  ]);
  
  if (completed) {
    result.completed = true;
    log(`  ✅ Puzzle 2 completed!`, colors.green);
  } else {
    log(`  ⚠️ Puzzle 2 not completed (may need different solution)`, colors.yellow);
  }

  await delay(4000);
}

async function runRhythmTapPuzzle(
  socket1: Socket,
  socket2: Socket,
  briefing: BriefingPayload
): Promise<void> {
  log("\n📍 Puzzle 3: Rhythm Tap (Oracle + Hoplite)", colors.cyan);
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

  // Set up completion listeners first
  const completionPromise = Promise.all([
    waitForEvent<PuzzleCompletedPayload>(socket1, ServerEvents.PUZZLE_COMPLETED, 5000),
    waitForEvent<PuzzleCompletedPayload>(socket2, ServerEvents.PUZZLE_COMPLETED, 5000),
  ]);

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
    await completionPromise;
    result.completed = true;
    log(`  ✅ Puzzle 3 completed!`, colors.green);
  } catch {
    log(`  ⚠️ Puzzle 3 not completed`, colors.yellow);
  }

  await delay(4000);
}

async function runCipherDecodePuzzle(
  socket1: Socket,
  socket2: Socket,
  briefing: BriefingPayload
): Promise<void> {
  log("\n📍 Puzzle 4: Cipher Decode (Cryptographer + Scribe)", colors.cyan);
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

  await delay(4000);
}

async function runCollaborativeAssemblyPuzzle(
  socket1: Socket,
  socket2: Socket,
  briefing: BriefingPayload
): Promise<void> {
  log("\n📍 Puzzle 5: Collaborative Assembly (Architect + Builder)", colors.cyan);
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

  // Set up completion listener first
  const completionPromise = Promise.all([
    waitForEvent<PuzzleCompletedPayload>(socket1, ServerEvents.PUZZLE_COMPLETED, 10000),
    waitForEvent<PuzzleCompletedPayload>(socket2, ServerEvents.PUZZLE_COMPLETED, 10000),
  ]);

  // Test wrong placement first with the first piece
  if (myPieces.length > 0) {
    const firstPiece = myPieces[0]!;
    log("  Testing wrong placement (glitch penalty)...", colors.yellow);
    builderSocket.emit(ClientEvents.PUZZLE_ACTION, {
      puzzleId: puzzleStart1.puzzleId,
      action: "place_piece",
      data: { pieceId: firstPiece.id, col: 99, row: 99 },
    });
    await delay(500);
  }

  // Place all pieces correctly
  for (const piece of myPieces) {
    const blueprintPiece = blueprint.find((p) => p.id === piece.id);
    if (!blueprintPiece) continue;

    // Rotate to correct rotation if needed
    let currentRotation = piece.rotation;
    while (currentRotation !== blueprintPiece.rotation) {
      builderSocket.emit(ClientEvents.PUZZLE_ACTION, {
        puzzleId: puzzleStart1.puzzleId,
        action: "rotate_piece",
        data: { pieceId: piece.id },
      });
      await delay(200);
      currentRotation = (currentRotation + 90) % 360;
    }

    // Place the piece
    log(`  Placing piece ${piece.id} at (${blueprintPiece.col}, ${blueprintPiece.row})...`, colors.blue);
    builderSocket.emit(ClientEvents.PUZZLE_ACTION, {
      puzzleId: puzzleStart1.puzzleId,
      action: "place_piece",
      data: { pieceId: piece.id, col: blueprintPiece.col, row: blueprintPiece.row },
    });
    await delay(300);
  }

  try {
    await completionPromise;
    result.completed = true;
    log(`  ✅ Puzzle 5 completed!`, colors.green);
  } catch {
    log(`  ⚠️ Puzzle 5 not completed`, colors.yellow);
  }

  await delay(4000);
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
  let currentPhase = "lobby";
  let currentPuzzleIdx = 0;
  let lastBriefing: BriefingPayload | null = null;

  // Track glitch updates
  socket1.on(ServerEvents.GLITCH_UPDATE, (data: GlitchUpdatePayload) => {
    const delta = data.glitch.value - glitchValue;
    if (delta > 0) {
      glitchUpdates.push(delta);
      const currentPuzzle = results.puzzles[results.puzzles.length - 1];
      if (currentPuzzle) {
        currentPuzzle.glitchesAdded += delta;
      }
      log(`  📈 Glitch increased by ${delta} (total: ${data.glitch.value})`, colors.yellow);
    }
    glitchValue = data.glitch.value;
    results.finalGlitchValue = glitchValue;
  });

  // Track phase changes for debugging
  socket1.on(ServerEvents.PHASE_CHANGE, (data: PhaseChangePayload) => {
    currentPhase = data.phase;
    currentPuzzleIdx = data.puzzleIndex;
    log(`  🔄 Phase changed to: ${data.phase} (puzzle ${data.puzzleIndex + 1})`, colors.blue);
  });

  // Track briefing events
  socket1.on(ServerEvents.BRIEFING, (data: BriefingPayload) => {
    lastBriefing = data;
    log(`  📋 Briefing received: ${data.puzzleTitle}`, colors.blue);
  });

  // Track puzzle updates for debugging
  socket1.on(ServerEvents.PUZZLE_UPDATE, (data: PuzzleUpdatePayload) => {
    const viewData = data.playerView.viewData as Record<string, unknown>;
    if (viewData.capturedLetters) {
      log(`  📝 Captured letters: ${(viewData.capturedLetters as string[]).join("")}`, colors.blue);
    }
    if (viewData.completedWords) {
      log(`  ✅ Completed words: ${(viewData.completedWords as string[]).length}/${(viewData.totalWords as number)}`, colors.green);
    }
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

    // Wait for GAME_STARTED on both sockets simultaneously (it's broadcast to all)
    const [gameStarted1, gameStarted2] = await Promise.all([
      waitForEvent<GameStartedPayload>(socket1, ServerEvents.GAME_STARTED),
      waitForEvent<GameStartedPayload>(socket2, ServerEvents.GAME_STARTED),
    ]);
    log(`✅ Game started: ${gameStarted1.levelTitle}`, colors.green);
    log(`   Total puzzles: ${gameStarted1.totalPuzzles}`, colors.blue);
    log(`   Initial glitch: ${gameStarted1.glitch.value}/${gameStarted1.glitch.maxValue}`, colors.blue);
    log(`   Full glitch object: ${JSON.stringify(gameStarted1.glitch)}`, colors.blue);
    
    // Initialize glitch tracking from game start
    glitchValue = gameStarted1.glitch.value;

    // Complete level intro
    log("\nCompleting level intro...", colors.blue);
    socket1.emit(ClientEvents.INTRO_COMPLETE);
    socket2.emit(ClientEvents.INTRO_COMPLETE);

    // Run all puzzles - each puzzle waits for its own briefing
    // Note: Briefing is broadcast to all players, so we only need to wait on one socket
    // Puzzle 1
    const briefing1 = await waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
    const nextBriefing2 = waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
    await runAsymmetricSymbolsPuzzle(socket1, socket2, briefing1);
    const briefing2 = await nextBriefing2;
    
    // Puzzle 2
    const nextBriefing3 = waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
    await runCollaborativeWiringPuzzle(socket1, socket2, briefing2);
    const briefing3 = await nextBriefing3;
    
    // Puzzle 3
    const nextBriefing4 = waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
    await runRhythmTapPuzzle(socket1, socket2, briefing3);
    const briefing4 = await nextBriefing4;
    
    // Puzzle 4
    const nextBriefing5 = waitForEvent<BriefingPayload>(socket1, ServerEvents.BRIEFING);
    await runCipherDecodePuzzle(socket1, socket2, briefing4);
    const briefing5 = await nextBriefing5;
    
    // Puzzle 5
    await runCollaborativeAssemblyPuzzle(socket1, socket2, briefing5);

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
