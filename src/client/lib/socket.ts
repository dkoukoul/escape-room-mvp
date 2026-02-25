// ============================================================
// Socket Client — Typed Socket.io wrapper
// ============================================================

import { io, type Socket } from "socket.io-client";
import { ClientEvents, ServerEvents } from "@shared/events";
import logger from "../logger.ts";

let socket: Socket | null = null;

export function connect(): Socket {
  if (socket?.connected) return socket;

  try {
    // In development, Vite proxies /socket.io to localhost:3000
    // In production, connect to same origin
    socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      logger.info(`[Socket] Connected: ${socket!.id}`);
    });

    socket.on("disconnect", (reason) => {
      logger.warn(`[Socket] Disconnected: ${reason}`);
    });

    socket.on("connect_error", (err) => {
      logger.error(`[Socket] Connection error: ${err.message}`, { err });
    });
  } catch (err) {
    logger.error("Failed to initialize Socket.io client", { err });
    throw err;
  }

  return socket;
}

export function getSocket(): Socket {
  if (!socket) {
    logger.error("Socket not initialized — call connect() first");
    throw new Error("Socket not initialized — call connect() first");
  }
  return socket;
}

export function emit(event: string, data?: unknown): void {
  try {
    getSocket().emit(event, data);
  } catch (err) {
    logger.error(`Failed to emit event: ${event}`, { err, data });
  }
}

export function on(event: string, handler: (...args: any[]) => void): void {
  try {
    getSocket().on(event, handler);
  } catch (err) {
    logger.error(`Failed to register event handler for: ${event}`, { err });
  }
}

export function off(event: string, handler?: (...args: any[]) => void): void {
  try {
    getSocket().off(event, handler);
  } catch (err) {
    logger.error(`Failed to unregister event handler for: ${event}`, { err });
  }
}

export function getPlayerId(): string {
  try {
    return getSocket().id ?? "";
  } catch (err) {
    return "";
  }
}

// Re-export event names for convenience
export { ClientEvents, ServerEvents };
