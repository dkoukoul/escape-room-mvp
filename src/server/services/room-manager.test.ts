import { createRoom, joinRoom } from "./room-manager";

jest.mock("ioredis", () => {
  return {
    Redis: jest.fn(() => ({
      connect: jest.fn(),
      duplicate: jest.fn(() => ({
        connect: jest.fn()
      }))
    }))
  };
});

describe("createRoom", () => {
  it("should create a room with the given player", async () => {
    const socketId = "player123";
    const playerName = "Alice";

    const room = await createRoom(socketId, playerName);

    expect(room.code).toBeDefined();
    expect(room.players.has(socketId)).toBe(true);
    expect(room.players.get(socketId)?.name).toBe(playerName);
  });
});

describe("joinRoom", () => {
  it("should join a room with the given player", async () => {
    const socketId = "player456";
    const playerName = "Bob";
    const roomCode = "fate";

    await createRoom(socketId, playerName);
    const result = await joinRoom(roomCode, socketId, playerName);

    expect(result.success).toBe(true);
    expect(result.room.players.has(socketId)).toBe(true);
    expect(result.room.players.get(socketId)?.name).toBe(playerName);
  });

  it("should return an error if the room does not exist", async () => {
    const socketId = "player456";
    const playerName = "Bob";
    const roomCode = "nonexistent";

    const result = await joinRoom(roomCode, socketId, playerName);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
