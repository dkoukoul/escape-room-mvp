// Import your real computeColumns function
import { computeColumns } from "./collaborative-wiring.ts"; // adjust path
import { readFileSync } from "fs"
import { resolve } from "path"
import { parse as parseYAML } from "yaml"

interface Puzzle {
  id: string;
  type: string;
  data: {
    grid_size: number;
    switches_per_player: number;
    solution_matrices: boolean[][][];
  };
}

interface LevelFile {
  puzzles: Puzzle[];
}
/**
 * Apply a solution (switch indexes) to a matrix
 */
function applySolution(
  matrix: boolean[][],
  solutionSwitches: number[],
  gridSize: number
) {
  const switchStates = new Array(matrix.length).fill(false);

  for (const idx of solutionSwitches) {
    switchStates[idx] = true;
  }

  return computeColumns(switchStates, matrix, gridSize);
}

describe("Collaborative Wiring Matrices", () => {
  const filePath = resolve(process.cwd(), "config/level_01.yaml");
  const fileContent = readFileSync(filePath, "utf8");
  const levelData = parseYAML(fileContent) as LevelFile;
  // Test for each of the matrices for puzzle type collaborative_wiring
  // The solutions are hardcoded in the config file, so we can test for each of the matrices
  const solutions = [[1, 3, 5], [0, 1, 2], [0, 1], [2, 4, 5], [3, 4, 5, 6], [1, 4], [1, 5, 6]];
  const puzzle = levelData.puzzles.find((p) => p.type === "collaborative_wiring");
  if (!puzzle) {
    throw new Error("collaborative_wiring puzzle not found");
  }
  puzzle.data.solution_matrices.forEach((matrix, index) => {
    it(`Matrix ${index} is solvable with solution ${solutions[index]}`, () => {
      const columns = applySolution(matrix, solutions[index]!, puzzle.data.grid_size);

      // Assert all columns are lit
      const allLit = columns.every((c: boolean) => c === true);
      try {
        expect(allLit).toEqual(true);
      } catch (error) {
        console.error(`Matrix ${index} ${JSON.stringify(matrix)} is not solvable with solution ${solutions[index]}`);
        throw error
      }
    });
  });
});