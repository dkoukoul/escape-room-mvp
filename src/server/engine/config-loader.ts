// ============================================================
// Config Loader — Reads YAML level files with hot-reload
// ============================================================

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { parse as parseYAML } from "yaml";
import { watch } from "chokidar";
import { validateAll } from "./config-validator.ts";
import type { LevelConfig, LevelSummary } from "../../../shared/types.ts";

const CONFIG_DIR = resolve(import.meta.dir, "../../../config");

// In-memory config store
// TODO: REDIS — cache parsed configs in Redis for multi-instance consistency
const levels = new Map<string, LevelConfig>();

let watcherReady = false;

/**
 * Load all YAML files from the config directory
 */
export function loadAllConfigs(): void {
  const files = readdirSync(CONFIG_DIR).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml")
  );

  for (const file of files) {
    loadConfigFile(join(CONFIG_DIR, file));
  }

  console.log(`[ConfigLoader] Loaded ${levels.size} level(s)`);
  validateAll(Array.from(levels.values()));
}

/**
 * Parse and store a single YAML config file
 */
function loadConfigFile(filePath: string): void {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const config = parseYAML(raw) as LevelConfig;

    if (!config.id) {
      console.warn(`[ConfigLoader] Skipping ${filePath} — missing 'id' field`);
      return;
    }

    levels.set(config.id, config);
    console.log(`[ConfigLoader] Loaded level: ${config.id} (${config.title})`);
  } catch (err) {
    console.error(`[ConfigLoader] Failed to parse ${filePath}:`, err);
  }
}

/**
 * Start watching the config directory for changes (hot-reload)
 */
export function startConfigWatcher(): void {
  if (watcherReady) return;

  const watcher = watch(CONFIG_DIR, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300 },
  });

  watcher.on("change", (filePath) => {
    console.log(`[ConfigLoader] Config changed: ${filePath}`);
    loadConfigFile(filePath);
    validateAll(Array.from(levels.values()));
  });

  watcher.on("add", (filePath) => {
    console.log(`[ConfigLoader] New config detected: ${filePath}`);
    loadConfigFile(filePath);
    validateAll(Array.from(levels.values()));
  });

  watcherReady = true;
  console.log(`[ConfigLoader] Watching ${CONFIG_DIR} for changes`);
}

/**
 * Get a level config by ID
 */
export function getLevel(levelId: string): LevelConfig | undefined {
  return levels.get(levelId);
}

/**
 * Get the first available level (for MVP with single level)
 */
export function getDefaultLevel(): LevelConfig | undefined {
  const first = levels.values().next();
  return first.done ? undefined : first.value;
}

/**
 * Get all loaded level IDs
 */
export function getAllLevelIds(): string[] {
  return Array.from(levels.keys());
}

/**
 * Get lightweight summaries of all levels for the lobby
 */
export function getLevelSummaries(): LevelSummary[] {
  return Array.from(levels.values()).map((l) => ({
    id: l.id,
    title: l.title,
    story: l.story,
    min_players: l.min_players,
    max_players: l.max_players,
    puzzle_count: l.puzzles.length,
    theme_css: l.theme_css || ["themes/cyberpunk-greek.css"], // Fallback for old configs
    estimated_duration_minutes: Math.ceil((l.timer_seconds || 600) / 60), // Simple estimate
    puzzles: l.puzzles.map(p => ({ id: p.id, title: p.title })),
  }));
}
