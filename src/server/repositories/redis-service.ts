import Redis from "ioredis";
import type { Room, Player } from "../../../shared/types.ts";

import logger from "../utils/logger.ts";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Redis reconnection options: retry every 10 seconds, max 10 retries
const redisOptions = {
  retryStrategy: (times: number) => {
    if (times > 10) {
      logger.error("❌ [Redis] Max reconnection attempts reached");
      return null; // Stop retrying
    }
    return Math.min(times * 1000, 10000); // Max 10 seconds between retries
  },
  maxRetriesPerRequest: 3,
};

const redis = new Redis(REDIS_URL, redisOptions);

// Track last error time to prevent spam (shared with other Redis clients)
let lastRedisErrorTime = 0;
const REDIS_ERROR_COOLDOWN = 30000; // 30 seconds between logged errors

redis.on("error", (err) => {
  const now = Date.now();
  if (now - lastRedisErrorTime > REDIS_ERROR_COOLDOWN) {
    logger.error("❌ [Redis] Service error", { error: err.message });
    lastRedisErrorTime = now;
  }
});

redis.on("connect", () => {
  logger.info("✅ [Redis] Connected to Redis server");
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
    await redis.set(key, serializeRoom(room), "EX", 3600); // 1h TTL
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

  async saveScore(score: number): Promise<void> {
    const key = `score:${score}`;
    await redis.set(key, score, "EX", 86400); // 24h TTL
    logger.debug(`[Redis] Saved score: ${score}`);
  },
};
