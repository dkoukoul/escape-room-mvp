import { readFileSync } from "fs"
import { resolve } from "path"
import { parse as parseYAML } from "yaml"

type CipherKey = Record<string, string>;

interface Sentence {
  encrypted: string;
  decoded: string;
}

interface Puzzle {
  id: string;
  data: {
    cipher_key: CipherKey;
    sentences: Sentence[];
  };
}

interface LevelFile {
  puzzles: Puzzle[];
}

function invertCipherKey(cipherKey: CipherKey): CipherKey {
  const inverted: CipherKey = {};

  for (const [plain, cipher] of Object.entries(cipherKey)) {
    inverted[cipher] = plain;
  }

  return inverted;
}

function decodeText(text: string, cipherKey: CipherKey): string {
  const invertedKey = invertCipherKey(cipherKey);

  return [...text]
    .map((char) => {
      if (char === " ") return " ";
      return invertedKey[char] ?? char;
    })
    .join("");
}

describe("philosopher_cipher integrity", () => {
  const filePath = resolve(process.cwd(), "config/level_01.yaml");
  const fileContent = readFileSync(filePath, "utf8");
  const levelData = parseYAML(fileContent) as LevelFile;

  const puzzle = levelData.puzzles.find(
    (p) => p.id === "philosopher_cipher"
  );

  if (!puzzle) {
    throw new Error("philosopher_cipher puzzle not found");
  }

  const { cipher_key, sentences } = puzzle.data;

  test("cipher key is bijective", () => {
    const values = Object.values(cipher_key);
    const uniqueValues = new Set(values);

    expect(uniqueValues.size).toBe(values.length);
  });

  test("all encrypted sentences decode correctly", () => {
    for (const sentence of sentences) {
      const actual = decodeText(sentence.encrypted, cipher_key);
      expect(actual).toBe(sentence.decoded);
    }
  });
});