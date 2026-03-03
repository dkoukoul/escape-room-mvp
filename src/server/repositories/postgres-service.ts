import { PrismaClient } from "../../../prisma/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

export interface CreateGameScoreDTO {
  roomName: string;
  userNames: string[];
  timeRemaining: number;
  glitches: number;
  score: number;
  playedAt?: Date;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({
  adapter,
})

export class PostgresService {
  // -----------------------------
  // CREATE
  // -----------------------------
  async createGameScore(data: CreateGameScoreDTO) {
    return prisma.gameScore.create({
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
    return prisma.gameScore.findMany({
      orderBy: { playedAt: "desc" },
    });
  }

  async getScoresByRoom(roomName: string) {
    return prisma.gameScore.findMany({
      where: { roomName },
      orderBy: { score: "desc" },
    });
  }

  async getTopScores(limit = 10) {
    return prisma.gameScore.findMany({
      orderBy: { score: "desc" },
      take: limit,
    });
  }

  // DELETE
  async deleteScore(id: string) {
    return prisma.gameScore.delete({ where: { id } });
  }
}