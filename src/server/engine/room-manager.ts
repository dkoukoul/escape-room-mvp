// ============================================================
// Room Manager — In-memory room storage
// ============================================================

import type { Room, Player, GameState, GlitchState, TimerState } from "../../../shared/types.ts";

// TODO: REDIS — move room storage to Redis for multi-instance deployment
const rooms = new Map<string, Room>();

// 4-char room codes using memorable words
const CODE_WORDS = [
  "zeus", "hera", "ares", "iris", "Apollo",
  "echo", "gaia", "nyx", "eos", "pan",
  "fury", "muse", "fate", "Dawn", "bolt",
  "myth", "lyre", "helm", "veil", "orb",
];

function generateRoomCode(): string {
  // Try random word first, then fallback to random 4-char
  for (let i = 0; i < 10; i++) {
    const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]!.toLowerCase();
    if (!rooms.has(word)) return word;
  }
  // Fallback: random 4-char alphanumeric
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function createInitialGameState(): GameState {
  return {
    phase: "lobby",
    levelId: "",
    currentPuzzleIndex: 0,
    totalPuzzles: 0,
    glitch: { value: 0, maxValue: 100, decayRate: 0 },
    timer: { totalSeconds: 0, remainingSeconds: 0, running: false },
    puzzleState: null,
    roleAssignments: [],
    startedAt: null,
    completedPuzzles: [],
    readyPlayers: [],
  };
}

export function createRoom(hostId: string, hostName: string): Room {
  const code = generateRoomCode();
  const host: Player = {
    id: hostId,
    name: hostName,
    roomCode: code,
    role: null,
    isHost: true,
    connected: true,
  };

  const room: Room = {
    code,
    hostId,
    players: new Map([[hostId, host]]),
    state: createInitialGameState(),
    createdAt: Date.now(),
  };

  // TODO: REDIS — persist room to Redis
  rooms.set(code, room);
  console.log(`[RoomManager] Room created: ${code} by ${hostName}`);
  return room;
}

export function joinRoom(
  roomCode: string,
  playerId: string,
  playerName: string
): { room: Room; player: Player } | { error: string } {
  const room = rooms.get(roomCode);
  if (!room) return { error: "Room not found" };
  if (room.state.phase !== "lobby") return { error: "Game already in progress" };
  if (room.players.size >= 6) return { error: "Room is full (max 6 players)" };

  const player: Player = {
    id: playerId,
    name: playerName,
    roomCode: roomCode,
    role: null,
    isHost: false,
    connected: true,
  };

  // TODO: REDIS — persist player join
  room.players.set(playerId, player);
  console.log(`[RoomManager] ${playerName} joined room ${roomCode}`);
  return { room, player };
}

export function leaveRoom(roomCode: string, playerId: string): Room | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players.delete(playerId);
  console.log(`[RoomManager] Player ${playerId} left room ${roomCode}`);

  // If room is empty, destroy it
  if (room.players.size === 0) {
    // TODO: REDIS — remove room from Redis
    rooms.delete(roomCode);
    console.log(`[RoomManager] Room ${roomCode} destroyed (empty)`);
    return null;
  }

  // If host left, reassign host
  if (room.hostId === playerId) {
    const newHost = room.players.values().next().value!;
    newHost.isHost = true;
    room.hostId = newHost.id;
    console.log(`[RoomManager] New host: ${newHost.name}`);
  }

  return room;
}

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

export function getPlayerRoom(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) return room;
  }
  return undefined;
}

export function getPlayersArray(room: Room): Player[] {
  return Array.from(room.players.values());
}

export function setPlayerConnected(roomCode: string, playerId: string, connected: boolean): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  const player = room.players.get(playerId);
  if (player) {
    player.connected = connected;
    // TODO: REDIS — update player connection status
  }
}
