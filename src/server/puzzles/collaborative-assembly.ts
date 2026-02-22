// ============================================================
// Puzzle: Collaborative Assembly — The Parthenon Reconstruction
// ============================================================
// Each player has unique pieces to drag-drop onto a grid.

import type { PuzzleHandler } from "./puzzle-handler.ts";
import type { Player, PuzzleConfig, PuzzleState, PlayerView } from "../../../shared/types.ts";

interface PieceState {
  id: number;
  ownerId: string;
  correctCol: number;
  correctRow: number;
  placedCol: number | null;
  placedRow: number | null;
  isPlaced: boolean;
}

interface AssemblyData {
  gridCols: number;
  gridRows: number;
  pieces: PieceState[];
  totalPieces: number;
  placedCorrectly: number;
  wrongPlacements: number;
}

export const collaborativeAssemblyHandler: PuzzleHandler = {
  init(players: Player[], config: PuzzleConfig): PuzzleState {
    const data = config.data as {
      grid_cols: number;
      grid_rows: number;
      total_pieces: number;
    };

    const totalPieces = data.total_pieces;
    const pieces: PieceState[] = [];

    // Generate pieces and distribute among players
    let pieceId = 0;
    for (let row = 0; row < data.grid_rows; row++) {
      for (let col = 0; col < data.grid_cols; col++) {
        if (pieceId >= totalPieces) break;
        const ownerIndex = pieceId % players.length;
        pieces.push({
          id: pieceId,
          ownerId: players[ownerIndex]!.id,
          correctCol: col,
          correctRow: row,
          placedCol: null,
          placedRow: null,
          isPlaced: false,
        });
        pieceId++;
      }
    }

    const puzzleData: AssemblyData = {
      gridCols: data.grid_cols,
      gridRows: data.grid_rows,
      pieces,
      totalPieces,
      placedCorrectly: 0,
      wrongPlacements: 0,
    };

    return {
      puzzleId: config.id,
      type: "collaborative_assembly",
      status: "active",
      data: puzzleData as unknown as Record<string, unknown>,
    };
  },

  handleAction(
    state: PuzzleState,
    playerId: string,
    action: string,
    data: Record<string, unknown>
  ): { state: PuzzleState; glitchDelta: number } {
    const puzzleData = state.data as unknown as AssemblyData;
    let glitchDelta = 0;

    if (action === "place_piece") {
      const pieceId = data.pieceId as number;
      const col = data.col as number;
      const row = data.row as number;

      const piece = puzzleData.pieces.find((p) => p.id === pieceId);
      if (!piece) return { state, glitchDelta: 0 };

      // Only the owner can place their piece
      if (piece.ownerId !== playerId) return { state, glitchDelta: 0 };

      if (col === piece.correctCol && row === piece.correctRow) {
        // Correct placement!
        piece.isPlaced = true;
        piece.placedCol = col;
        piece.placedRow = row;
        puzzleData.placedCorrectly = puzzleData.pieces.filter((p) => p.isPlaced).length;
      } else {
        // Wrong placement
        puzzleData.wrongPlacements++;
        glitchDelta = 2;
      }
    } else if (action === "remove_piece") {
      const pieceId = data.pieceId as number;
      const piece = puzzleData.pieces.find((p) => p.id === pieceId);
      if (!piece || piece.ownerId !== playerId) return { state, glitchDelta: 0 };

      piece.isPlaced = false;
      piece.placedCol = null;
      piece.placedRow = null;
      puzzleData.placedCorrectly = puzzleData.pieces.filter((p) => p.isPlaced).length;
    }

    return { state: { ...state, data: puzzleData as unknown as Record<string, unknown> }, glitchDelta };
  },

  checkWin(state: PuzzleState): boolean {
    const data = state.data as unknown as AssemblyData;
    return data.placedCorrectly === data.totalPieces;
  },

  getPlayerView(
    state: PuzzleState,
    playerId: string,
    playerRole: string,
    config: PuzzleConfig
  ): PlayerView {
    const data = state.data as unknown as AssemblyData;

    // Each player sees only their own unplaced pieces, but all placed pieces
    const myPieces = data.pieces
      .filter((p) => p.ownerId === playerId && !p.isPlaced)
      .map((p) => ({ id: p.id, label: `Fragment ${p.id + 1}` }));

    const placedPieces = data.pieces
      .filter((p) => p.isPlaced)
      .map((p) => ({ id: p.id, col: p.placedCol, row: p.placedRow }));

    return {
      playerId,
      role: playerRole,
      puzzleId: state.puzzleId,
      puzzleType: state.type,
      puzzleTitle: config.title,
      viewData: {
        gridCols: data.gridCols,
        gridRows: data.gridRows,
        myPieces,
        placedPieces,
        totalPieces: data.totalPieces,
        placedCorrectly: data.placedCorrectly,
      },
    };
  },
};
