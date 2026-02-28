import { PrismaClient } from "@prisma/client";

export interface CreateGameScoreDTO {
  roomName: string;
  userNames: string[];
  timeRemaining: number;
  glitches: number;
  score: number;
  playedAt?: Date;
}

const prisma = new PrismaClient();

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