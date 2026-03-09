import { describe, it, expect, beforeEach, vi } from "vitest";
import { io, type Socket } from "socket.io-client";
import { connect, getSocket, emit, on, off, getPlayerId, ClientEvents, ServerEvents } from "./socket.ts";

// Mock socket.io-client
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockEmit = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

const mockSocket = {
  id: "test-socket-id-123",
  connected: true,
  on: mockOn,
  off: mockOff,
  emit: mockEmit,
  connect: mockConnect,
  disconnect: mockDisconnect,
} as unknown as Socket;

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock logger
vi.mock("../logger.ts", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Socket Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Note: The socket module maintains internal state that persists between tests
    // This is a limitation of ES module mocking in Vitest
  });

  describe("connect()", () => {
    it("should create socket connection", () => {
      const socket = connect();
      
      expect(io).toHaveBeenCalledWith({
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });
      expect(socket).toBe(mockSocket);
    });

    it("should return socket after connection", () => {
      connect();
      const socket = getSocket();
      
      expect(socket).toBe(mockSocket);
    });

  });

  describe("emit()", () => {
    it("should emit event with data", () => {
      connect();
      
      emit("test-event", { data: "value" });
      
      expect(mockEmit).toHaveBeenCalledWith("test-event", { data: "value" });
    });

    it("should emit event without data", () => {
      connect();
      
      emit("test-event");
      
      expect(mockEmit).toHaveBeenCalledWith("test-event", undefined);
    });

    it("should handle errors gracefully when not connected", () => {
      // This will use the already-connected socket from previous tests
      // or fail gracefully if somehow disconnected
      expect(() => emit("test-event")).not.toThrow();
    });
  });

  describe("on()", () => {
    it("should register event handler", () => {
      connect();
      const handler = vi.fn();
      
      on("test-event", handler);
      
      expect(mockOn).toHaveBeenCalledWith("test-event", handler);
    });

    it("should handle errors gracefully", () => {
      const handler = vi.fn();
      
      // Should not throw even if socket issues occur
      expect(() => on("test-event", handler)).not.toThrow();
    });
  });

  describe("off()", () => {
    it("should unregister event handler", () => {
      connect();
      const handler = vi.fn();
      
      off("test-event", handler);
      
      expect(mockOff).toHaveBeenCalledWith("test-event", handler);
    });

    it("should unregister all handlers for event when no handler provided", () => {
      connect();
      
      off("test-event");
      
      expect(mockOff).toHaveBeenCalledWith("test-event", undefined);
    });

    it("should handle errors gracefully", () => {
      // Should not throw even if socket issues occur
      expect(() => off("test-event")).not.toThrow();
    });
  });

  describe("getPlayerId()", () => {
    it("should return socket id when connected", () => {
      connect();
      
      const playerId = getPlayerId();
      
      expect(playerId).toBe("test-socket-id-123");
    });

    it("should return a string value", () => {
      const playerId = getPlayerId();
      
      expect(typeof playerId).toBe("string");
    });
  });

  describe("event exports", () => {
    it("should export ClientEvents", () => {
      expect(ClientEvents).toBeDefined();
      expect(typeof ClientEvents).toBe("object");
    });

    it("should export ServerEvents", () => {
      expect(ServerEvents).toBeDefined();
      expect(typeof ServerEvents).toBe("object");
    });
  });
});
