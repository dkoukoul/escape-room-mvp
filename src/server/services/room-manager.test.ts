import type { Room } from "@shared/types.ts";
import { createRoom, joinRoom } from "./room-manager";
import { describe, expect, mock, test } from "bun:test"

mock.module("ioredis", () => {
  return {
    Redis: mock(() => ({
      connect: mock(),
      duplicate: mock(() => ({
        connect: mock()
      }))
    }))
  };
});

describe("createRoom", () => {
  test("should create a room with the given player", async () => {
    const socketId = "player123";
    const playerName = "Alice";

    const room = await createRoom(socketId, playerName);

    expect(room.code).toBeDefined();
    expect(room.players.has(socketId)).toBe(true);
    expect(room.players.get(socketId)?.name).toBe(playerName);
  });
});

describe("joinRoom", () => {
  test("should join a room with the given player", async () => {
    const socketId = "player123";
    const hostSocketId = "player456";
    const hostPlayerName = "Bob";
    const joinPlayerName = "Charlie";
    const room = await createRoom(hostSocketId, hostPlayerName);
    const result = await joinRoom(room.code, socketId, joinPlayerName);
    if ("error" in result) {
      throw new Error(result.error);
    }
    expect(result.player.connected).toBe(true);
    expect(result.room.players.has(socketId)).toBe(true);
    expect(result.room.players.get(socketId)?.name).toBe(joinPlayerName);
  });

  test("should return an error if the room does not exist", async () => {
    const socketId = "player456";
    const playerName = "Bob";
    const roomCode = "nonexistent";

    const result = await joinRoom(roomCode, socketId, playerName);
    if ("error" in result) {
      expect(result.error).toBe("Room not found");
    }
  });
});
