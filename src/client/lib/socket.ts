// ============================================================
// Socket Client — Typed Socket.io wrapper
// ============================================================

import { io, type Socket } from "socket.io-client";
import { ClientEvents, ServerEvents } from "@shared/events";

let socket: Socket | null = null;

export function connect(): Socket {
  if (socket?.connected) return socket;

  // In development, Vite proxies /socket.io to localhost:3000
  // In production, connect to same origin
  socket = io({
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket!.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  return socket;
}

export function getSocket(): Socket {
  if (!socket) throw new Error("Socket not initialized — call connect() first");
  return socket;
}

export function emit(event: string, data?: unknown): void {
  getSocket().emit(event, data);
}

export function on(event: string, handler: (...args: any[]) => void): void {
  getSocket().on(event, handler);
}

export function off(event: string, handler?: (...args: any[]) => void): void {
  getSocket().off(event, handler);
}

export function getPlayerId(): string {
  return getSocket().id ?? "";
}

// Re-export event names for convenience
export { ClientEvents, ServerEvents };
