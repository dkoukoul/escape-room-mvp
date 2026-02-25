// ============================================================
// Server Entry Point — Bun + Socket.io
// ============================================================

import { Server } from "socket.io";
import { loadAllConfigs, startConfigWatcher } from "./engine/config-loader.ts";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  selectLevel,
  getRoom,
  getPlayerRoom,
  getPlayersArray,
  setPlayerConnected,
  loadAllRooms,
} from "./engine/room-manager.ts";
import { getLevelSummaries } from "./engine/config-loader.ts";
import { startGame, handlePuzzleAction, getAllPlayerViews, jumpToPuzzle, handlePlayerReady, handleLevelIntroComplete, syncPlayer, resumeRoomTimers } from "./engine/game-engine.ts";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import {
  ClientEvents,
  ServerEvents,
  type CreateRoomPayload,
  type JoinRoomPayload,
  type StartGamePayload,
  type PuzzleActionPayload,
  type LevelSelectPayload,
} from "../../shared/events.ts";

// Register all puzzle handlers
import "./puzzles/register.ts";

// ---- Redis Setup for Multi-instance sync ----
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();

const PORT = parseInt(process.env.SERVER_PORT || "3000");

const io = new Server(PORT, {
  cors: {
    origin: `http://localhost:${process.env.CLIENT_PORT || "5173"}`,
    methods: ["GET", "POST"],
  },
});

io.adapter(createAdapter(pubClient, subClient));

import logger from "./logger.ts";

// ... (imports remain the same, just adding logger)

// ---- Load existing rooms and configs ----
try {
  await loadAllRooms();
  resumeRoomTimers(io);
  loadAllConfigs();
  startConfigWatcher();
} catch (error) {
  logger.error("Failed to initialize server state", { error });
  process.exit(1);
}

logger.info(`⚡ Project ODYSSEY Server running on port ${PORT}`);
logger.info(`   Waiting for Cyber-Hoplites...`);

// ---- Socket.io Connection Handler ----
io.on("connection", (socket) => {
  logger.info(`[Socket] Connected: ${socket.id}`);

  // ---- Create Room ----
  socket.on(ClientEvents.CREATE_ROOM, async (payload: CreateRoomPayload) => {
    try {
      const room = await createRoom(socket.id, payload.playerName);
      socket.join(room.code);

      const player = room.players.get(socket.id)!;
      socket.emit(ServerEvents.ROOM_CREATED, {
        roomCode: room.code,
        player,
        gameState: room.state,
      });

      socket.emit(ServerEvents.PLAYER_LIST_UPDATE, {
        players: getPlayersArray(room),
      });
    } catch (error) {
      logger.error("Error creating room", { error, socketId: socket.id, payload });
      socket.emit(ServerEvents.ROOM_ERROR, { message: "Internal server error while creating room" });
    }
  });

  // ---- Join Room ----
  socket.on(ClientEvents.JOIN_ROOM, async (payload: JoinRoomPayload) => {
    try {
      const result = await joinRoom(payload.roomCode.toLowerCase(), socket.id, payload.playerName);

      if ("error" in result) {
        socket.emit(ServerEvents.ROOM_ERROR, { message: result.error });
        return;
      }

      socket.join(result.room.code);

      socket.emit(ServerEvents.ROOM_JOINED, {
        roomCode: result.room.code,
        player: result.player,
        players: getPlayersArray(result.room),
        gameState: result.room.state,
      });

      // Sync player if game already in progress
      if (result.room.state.phase !== "lobby") {
        syncPlayer(io, result.room, socket);
      }

      // Notify all other players
      io.to(result.room.code).emit(ServerEvents.PLAYER_LIST_UPDATE, {
        players: getPlayersArray(result.room),
      });
    } catch (error) {
      logger.error("Error joining room", { error, socketId: socket.id, payload });
      socket.emit(ServerEvents.ROOM_ERROR, { message: "Internal server error while joining room" });
    }
  });

  // ---- Leave Room ----
  socket.on(ClientEvents.LEAVE_ROOM, () => {
    handleDisconnect(socket).catch(err => logger.error("Disconnect error", { err }));
  });

  // ---- Start Game ----
  socket.on(ClientEvents.START_GAME, (payload?: StartGamePayload) => {
    try {
      const room = getPlayerRoom(socket.id);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player?.isHost) {
        socket.emit(ServerEvents.ROOM_ERROR, { message: "Only the host can start the game" });
        return;
      }

      startGame(io, room, payload?.startingPuzzleIndex);
    } catch (error) {
      logger.error("Error starting game", { error, socketId: socket.id });
    }
  });

  // ---- Level List (Lobby) ----
  socket.on(ClientEvents.LEVEL_LIST_REQUEST, () => {
    try {
      socket.emit(ServerEvents.LEVEL_LIST, {
        levels: getLevelSummaries(),
      });
    } catch (error) {
      logger.error("Error providing level list", { error, socketId: socket.id });
    }
  });

  // ---- Level Selection (Host) ----
  socket.on(ClientEvents.LEVEL_SELECT, async (payload: LevelSelectPayload) => {
    try {
      const room = getPlayerRoom(socket.id);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player?.isHost) return;

      const result = await selectLevel(room.code, payload.levelId);
      if (result.success) {
        io.to(room.code).emit(ServerEvents.LEVEL_SELECTED, {
          levelId: payload.levelId,
        });
      }
    } catch (error) {
      logger.error("Error selecting level", { error, socketId: socket.id, payload });
    }
  });

  // ---- Puzzle Action ----
  socket.on(ClientEvents.PUZZLE_ACTION, (payload: PuzzleActionPayload) => {
    try {
      const room = getPlayerRoom(socket.id);
      if (!room) return;

      handlePuzzleAction(io, room, socket.id, payload.action, payload.data);
    } catch (error) {
      logger.error("Error handling puzzle action", { error, socketId: socket.id, payload });
    }
  });

  // ---- Player Ready ----
  socket.on(ClientEvents.PLAYER_READY, () => {
    try {
      const room = getPlayerRoom(socket.id);
      if (!room) return;
      
      handlePlayerReady(io, room, socket.id);
    } catch (error) {
      logger.error("Error handling player ready", { error, socketId: socket.id });
    }
  });

  // ---- Level Intro Complete ----
  socket.on(ClientEvents.INTRO_COMPLETE, () => {
    try {
      const room = getPlayerRoom(socket.id);
      if (!room) return;

      handleLevelIntroComplete(io, room, socket.id);
    } catch (error) {
      logger.error("Error handling intro complete", { error, socketId: socket.id });
    }
  });

  // ---- Debug Mode Toggle ----
  socket.on(ClientEvents.TOGGLE_DEBUG, () => {
    try {
      const room = getPlayerRoom(socket.id);
      if (!room) return;

      const allViews = getAllPlayerViews(room);
      socket.emit(ServerEvents.DEBUG_UPDATE, {
        enabled: true,
        allViews,
      });
    } catch (error) {
      logger.error("Error toggling debug", { error, socketId: socket.id });
    }
  });

  // ---- Jump To Puzzle ----
  socket.on(ClientEvents.JUMP_TO_PUZZLE, (payload: any) => {
    try {
      const room = getPlayerRoom(socket.id);
      if (!room) return;

      jumpToPuzzle(io, room, payload.puzzleIndex);
    } catch (error) {
      logger.error("Error jumping to puzzle", { error, socketId: socket.id, payload });
    }
  });

  // ---- Disconnect ----
  socket.on("disconnect", async () => {
    try {
      await handleDisconnect(socket);
    } catch (error) {
      logger.error("Error on disconnect handler", { error, socketId: socket.id });
    }
  });
});

async function handleDisconnect(socket: any): Promise<void> {
  const room = getPlayerRoom(socket.id);
  if (!room) return;

  await setPlayerConnected(room.code, socket.id, false);

  // Notify others that someone dropped (but stay in the room list for a while)
  io.to(room.code).emit(ServerEvents.PLAYER_LIST_UPDATE, {
    players: getPlayersArray(room),
  });

  logger.info(`[Socket] Disconnected (marked inactive): ${socket.id}`);
}

