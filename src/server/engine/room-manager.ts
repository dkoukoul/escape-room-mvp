// ============================================================
// Room Manager — In-memory room storage
// ============================================================

import type { Room, Player, GameState, GlitchState, TimerState } from "../../../shared/types.ts";
import { RedisService } from "./redis-service.ts";

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

export async function createRoom(hostId: string, hostName: string): Promise<Room> {
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

  rooms.set(code, room);
  await RedisService.saveRoom(room);
  console.log(`[RoomManager] Room created: ${code} by ${hostName}`);
  return room;
}

export async function joinRoom(
  roomCode: string,
  playerId: string,
  playerName: string
): Promise<{ room: Room; player: Player } | { error: string }> {
  let room = rooms.get(roomCode);
  
  // If not in memory, try loading from Redis
  if (!room) {
    room = await RedisService.getRoom(roomCode);
    if (room) {
      rooms.set(roomCode, room);
      console.log(`[RoomManager] Restored room ${roomCode} from Redis`);
    }
  }

  if (!room) return { error: "Room not found" };
  
  // Reconnection logic: check if someone with this name is already in the room but disconnected
  const existing = Array.from(room.players.values()).find(p => p.name === playerName);
  if (existing) {
    if (existing.connected) {
      return { error: "Name already taken in this room" };
    }
    // Reclaim the spot
    room.players.delete(existing.id);
    existing.id = playerId;
    existing.connected = true;
    room.players.set(playerId, existing);
    if (existing.isHost) room.hostId = playerId;
    
    console.log(`[RoomManager] ${playerName} reconnected to ${roomCode}`);
    await RedisService.saveRoom(room);
    return { room, player: existing };
  }

  if (room.players.size >= 6) return { error: "Room is full (max 6 players)" };

  const player: Player = {
    id: playerId,
    name: playerName,
    roomCode: roomCode,
    role: null,
    isHost: room.players.size === 0, // Fallback if host left
    connected: true,
  };

  room.players.set(playerId, player);
  if (player.isHost) room.hostId = playerId;
  
  await RedisService.saveRoom(room);
  console.log(`[RoomManager] ${playerName} joined room ${roomCode}`);
  return { room, player };
}

export async function leaveRoom(roomCode: string, playerId: string): Promise<Room | null> {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players.delete(playerId);
  console.log(`[RoomManager] Player ${playerId} left room ${roomCode}`);

  // If room is empty, destroy it
  if (room.players.size === 0) {
    rooms.delete(roomCode);
    await RedisService.deleteRoom(roomCode);
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

  await RedisService.saveRoom(room);
  return room;
}

export async function selectLevel(roomCode: string, levelId: string): Promise<{ success: boolean; error?: string }> {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: "Room not found" };
  if (room.state.phase !== "lobby") return { success: false, error: "Cannot change level now" };

  room.state.levelId = levelId;
  await RedisService.saveRoom(room);
  console.log(`[RoomManager] Room ${roomCode} selected level: ${levelId}`);
  return { success: true };
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

export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

export async function setPlayerConnected(roomCode: string, playerId: string, connected: boolean): Promise<void> {
  const room = rooms.get(roomCode);
  if (!room) return;
  const player = room.players.get(playerId);
  if (player) {
    player.connected = connected;
    await RedisService.saveRoom(room);
  }
}

export async function persistRoom(room: Room): Promise<void> {
  await RedisService.saveRoom(room);
}

export async function loadAllRooms(): Promise<void> {
  const codes = await RedisService.getAllRoomCodes();
  for (const code of codes) {
    const room = await RedisService.getRoom(code);
    if (room) {
      rooms.set(code, room);
    }
  }
  console.log(`[RoomManager] Loaded ${rooms.size} rooms from Redis`);
}
