
import { PrismaClient } from "../../../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg";
import logger from "../utils/logger.ts"

export interface CreateGameScoreDTO {
  roomName: string;
  userNames: string[];
  timeRemaining: number;
  glitches: number;
  score: number;
  playedAt?: Date;
}

// Lazy initialization to avoid errors during module load
let prisma: PrismaClient;

function getPrisma(): PrismaClient {
  if (!prisma) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      logger.warn("[Postgres] DATABASE_URL not set - score storage will be disabled");
      throw new Error("DATABASE_URL not configured");
    }
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter });

    logger.info("[Postgres] Prisma client initialized");
  }
  return prisma;
}

export class PostgresService {
  // -----------------------------
  // CREATE
  // -----------------------------
  async createGameScore(data: CreateGameScoreDTO) {
    const client = getPrisma();
    return client.gameScore.create({
      data: {
        roomName: data.roomName,
        userNames: data.userNames,
        timeRemaining: data.timeRemaining,
        glitches: data.glitches,
        score: data.score,
        playedAt: data.playedAt ?? new Date(),
      },
    });
  }

  // -----------------------------
  // READ
  // -----------------------------
  async getAllScores() {
    return getPrisma().gameScore.findMany({
      orderBy: { playedAt: "desc" },
    });
  }

  async getScoresByRoom(roomName: string) {
    return getPrisma().gameScore.findMany({
      where: { roomName },
      orderBy: { score: "desc" },
    });
  }

  async getTopScores(limit = 10) {
    return getPrisma().gameScore.findMany({
      orderBy: { score: "desc" },
      take: limit,
    });
  }

  // DELETE
  async deleteScore(id: string) {
    return getPrisma().gameScore.delete({ where: { id } });
  }
}