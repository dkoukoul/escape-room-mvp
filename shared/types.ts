// ============================================================
// Project ODYSSEY — Shared Types (Source of Truth)
// ============================================================

// ---- Player & Room ----

export interface Player {
  id: string;
  name: string;
  roomCode: string;
  role: string | null; // Assigned per-puzzle (e.g., "Navigator", "Decoder")
  isHost: boolean;
  connected: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  state: GameState;
  createdAt: number;
}

// ---- Game State ----

export enum GamePhase {
  LOBBY = "lobby",
  LEVEL_INTRO = "level_intro",
  BRIEFING = "briefing",
  PLAYING = "playing",
  PUZZLE_TRANSITION = "puzzle_transition",
  VICTORY = "victory",
  DEFEAT = "defeat",
}

export interface GameState {
  phase: GamePhase;
  levelId: string;
  currentPuzzleIndex: number;
  totalPuzzles: number;
  glitch: GlitchState;
  timer: TimerState;
  puzzleState: PuzzleState | null;
  roleAssignments: RoleAssignment[];
  startedAt: number | null;
  completedPuzzles: string[];
  readyPlayers: string[]; // Players who pressed "Ready"
  // TODO: REDIS — persist GameState for crash recovery
}

export interface GlitchState {
  name: string;
  value: number; // 0–100
  maxValue: number; // Default 100 — game over if reached
  decayRate: number; // Points per second of natural decay (0 = no decay)
}

export interface TimerState {
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
}

export interface RoleAssignment {
  playerId: string;
  playerName: string;
  role: string;
}

// ---- Puzzle ----

export interface PuzzleState {
  puzzleId: string;
  type: PuzzleType;
  status: PuzzleStatus;
  data: Record<string, unknown>; // Puzzle-type-specific state
}

export enum PuzzleStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed"
}

export enum PuzzleType {
  ASYMMETRIC_SYMBOLS = "asymmetric_symbols",
  RHYTHM_TAP = "rhythm_tap",
  COLLABORATIVE_WIRING = "collaborative_wiring",
  CIPHER_DECODE = "cipher_decode",
  COLLABORATIVE_ASSEMBLY = "collaborative_assembly",
}

// ---- Level Configuration (parsed from YAML) ----
export interface LevelConfig {
  id: string;
  title: string;
  story: string;
  min_players: number;
  max_players: number;
  timer_seconds: number;
  glitch: GlitchState;
  theme_css: string[]; // List of CSS files to load (relative to src/client/styles/)

  puzzles: PuzzleConfig[];

  audio_cues: {
    intro?: string;
    glitch_warning?: string;
    victory?: string;
    defeat?: string;
    [key: string]: string | undefined;
  };
}

export interface LevelSummary {
  id: string;
  title: string;
  story: string;
  min_players: number;
  max_players: number;
  puzzle_count: number;
  theme_css: string[];
  estimated_duration_minutes: number;
  puzzles: { id: string; title: string }[];
}

export interface PuzzleConfig {
  id: string;
  type: PuzzleType;
  title: string;
  briefing: string; // Story text shown before the puzzle
  layout: PuzzleLayout;
  data: Record<string, unknown>;
  glitch_penalty: number; // How much glitch per mistake
  audio_cues?: {
    start?: string;
    success?: string;
    fail?: string;
    [key: string]: string | undefined;
  };
}

export interface PuzzleLayout {
  roles: PuzzleRoleDefinition[];
}

export interface PuzzleRoleDefinition {
  name: string; // e.g., "Navigator", "Decoder"
  count: number | "remaining"; // Exact count or "remaining" for all unassigned players
  description: string;
}

// ---- Player View (what the client receives) ----

export interface PlayerView {
  playerId: string;
  role: string;
  puzzleId: string;
  puzzleType: PuzzleType;
  puzzleTitle: string;
  viewData: Record<string, unknown>; // Role-specific data
}

// ---- Debug Mode ----

export interface DebugState {
  enabled: boolean;
  allViews: PlayerView[]; // All role views when debug is on
}
// ---- Leaderboard ----

export interface LeaderboardEntry {
  id: string;
  roomName: string;
  userNames: string[];
  score: number;
  timeRemaining: number;
  glitches: number;
  playedAt: string; // ISO date
}
