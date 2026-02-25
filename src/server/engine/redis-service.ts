import Redis from "ioredis";
import type { Room, Player } from "../../../shared/types.ts";

import logger from "../logger.ts";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(REDIS_URL);

redis.on("error", (err) => {
  logger.error("[Redis] Error:", { message: err.message });
});

redis.on("connect", () => {
  logger.info("[Redis] Connected to Redis server");
});

/**
 * Serialize a Room for Redis (Maps -> Objects)
 */
function serializeRoom(room: Room): string {
  const serializableRoom = {
    ...room,
    players: Object.fromEntries(room.players),
  };
  return JSON.stringify(serializableRoom);
}

/**
 * Deserialize a Room from Redis (Objects -> Maps)
 */
function deserializeRoom(data: string): Room {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    players: new Map(Object.entries(parsed.players)),
  } as Room;
}

export const RedisService = {
  async saveRoom(room: Room): Promise<void> {
    const key = `room:${room.code}`;
    await redis.set(key, serializeRoom(room), "EX", 86400); // 24h TTL
    logger.debug(`[Redis] Saved room: ${room.code}`);
  },

  async getRoom(roomCode: string): Promise<Room | undefined> {
    const data = await redis.get(`room:${roomCode}`);
    if (!data) return undefined;
    return deserializeRoom(data);
  },

  async deleteRoom(roomCode: string): Promise<void> {
    await redis.del(`room:${roomCode}`);
    logger.info(`[Redis] Deleted room: ${roomCode}`);
  },

  async getAllRoomCodes(): Promise<string[]> {
    const keys = await redis.keys("room:*");
    return keys.map((key) => key.split(":")[1]).filter((code): code is string => !!code);
  },
};
