// ============================================================
// Server Entry Point — Bun + Socket.io
// ============================================================

import { Server } from "socket.io";
import { loadAllConfigs, startConfigWatcher } from "./engine/config-loader.ts";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getPlayerRoom,
  getPlayersArray,
  setPlayerConnected,
} from "./engine/room-manager.ts";
import { startGame, handlePuzzleAction, getAllPlayerViews, jumpToPuzzle, handlePlayerReady, handleLevelIntroComplete } from "./engine/game-engine.ts";
import {
  ClientEvents,
  ServerEvents,
  type CreateRoomPayload,
  type JoinRoomPayload,
  type StartGamePayload,
  type PuzzleActionPayload,
} from "../../shared/events.ts";

// Register all puzzle handlers
import "./puzzles/register.ts";

// ---- Load configs ----
loadAllConfigs();
startConfigWatcher();

// ---- Create HTTP server + Socket.io ----
const PORT = parseInt(process.env.PORT || "3000");

const io = new Server(PORT, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
  // TODO: REDIS — add Redis adapter for multi-instance:
  // import { createAdapter } from "@socket.io/redis-adapter";
  // io.adapter(createAdapter(pubClient, subClient));
});

console.log(`\n⚡ Project ODYSSEY Server running on port ${PORT}`);
console.log(`   Waiting for Cyber-Hoplites...\n`);

// ---- Socket.io Connection Handler ----
io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ---- Create Room ----
  socket.on(ClientEvents.CREATE_ROOM, (payload: CreateRoomPayload) => {
    const room = createRoom(socket.id, payload.playerName);
    socket.join(room.code);

    const player = room.players.get(socket.id)!;
    socket.emit(ServerEvents.ROOM_CREATED, {
      roomCode: room.code,
      player,
    });

    socket.emit(ServerEvents.PLAYER_LIST_UPDATE, {
      players: getPlayersArray(room),
    });
  });

  // ---- Join Room ----
  socket.on(ClientEvents.JOIN_ROOM, (payload: JoinRoomPayload) => {
    const result = joinRoom(payload.roomCode.toLowerCase(), socket.id, payload.playerName);

    if ("error" in result) {
      socket.emit(ServerEvents.ROOM_ERROR, { message: result.error });
      return;
    }

    socket.join(result.room.code);

    socket.emit(ServerEvents.ROOM_JOINED, {
      roomCode: result.room.code,
      player: result.player,
      players: getPlayersArray(result.room),
    });

    // Notify all other players
    io.to(result.room.code).emit(ServerEvents.PLAYER_LIST_UPDATE, {
      players: getPlayersArray(result.room),
    });
  });

  // ---- Leave Room ----
  socket.on(ClientEvents.LEAVE_ROOM, () => {
    handleDisconnect(socket);
  });

  // ---- Start Game ----
  socket.on(ClientEvents.START_GAME, (payload?: StartGamePayload) => {
    const room = getPlayerRoom(socket.id);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player?.isHost) {
      socket.emit(ServerEvents.ROOM_ERROR, { message: "Only the host can start the game" });
      return;
    }

    startGame(io, room, payload?.startingPuzzleIndex);
  });

  // ---- Puzzle Action ----
  socket.on(ClientEvents.PUZZLE_ACTION, (payload: PuzzleActionPayload) => {
    const room = getPlayerRoom(socket.id);
    if (!room) return;

    handlePuzzleAction(io, room, socket.id, payload.action, payload.data);
  });

  // ---- Player Ready ----
  socket.on(ClientEvents.PLAYER_READY, () => {
    const room = getPlayerRoom(socket.id);
    if (!room) return;
    
    handlePlayerReady(io, room, socket.id);
  });

  // ---- Level Intro Complete ----
  socket.on(ClientEvents.INTRO_COMPLETE, () => {
    const room = getPlayerRoom(socket.id);
    if (!room) return;

    handleLevelIntroComplete(io, room, socket.id);
  });

  // ---- Debug Mode Toggle ----
  socket.on(ClientEvents.TOGGLE_DEBUG, () => {
    const room = getPlayerRoom(socket.id);
    if (!room) return;

    const allViews = getAllPlayerViews(room);
    socket.emit(ServerEvents.DEBUG_UPDATE, {
      enabled: true,
      allViews,
    });
  });

  // ---- Jump To Puzzle ----
  socket.on(ClientEvents.JUMP_TO_PUZZLE, (payload: any) => {
    const room = getPlayerRoom(socket.id);
    if (!room) return;

    jumpToPuzzle(io, room, payload.puzzleIndex);
  });

  // ---- Disconnect ----
  socket.on("disconnect", () => {
    handleDisconnect(socket);
  });
});

function handleDisconnect(socket: any): void {
  const room = getPlayerRoom(socket.id);
  if (!room) return;

  socket.leave(room.code);
  const updatedRoom = leaveRoom(room.code, socket.id);

  if (updatedRoom) {
    io.to(updatedRoom.code).emit(ServerEvents.PLAYER_LIST_UPDATE, {
      players: getPlayersArray(updatedRoom),
    });
  }

  console.log(`[Socket] Disconnected: ${socket.id}`);
}
