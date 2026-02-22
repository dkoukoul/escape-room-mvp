import fs from "fs";
import path from "path";
import type { LevelConfig } from "../../../shared/types.ts";

const BASE_DIR = path.join(process.cwd(), "src", "client");
const STYLES_DIR = path.join(BASE_DIR, "styles");
const AUDIO_DIR = path.join(BASE_DIR, "public", "assets", "audio");

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a level configuration object
 */
export function validateLevel(config: LevelConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Basic Structure
  if (!config.id) errors.push("Level ID is missing");
  if (!config.title) errors.push(`Level ${config.id || "unknown"}: Title is missing`);
  if (!config.puzzles || config.puzzles.length === 0) {
    errors.push(`Level ${config.id}: No puzzles defined`);
  }

  // 2. CSS File Checks
  if (config.theme_css) {
    for (const cssPath of config.theme_css) {
      const fullPath = path.join(STYLES_DIR, cssPath);
      if (!fs.existsSync(fullPath)) {
        errors.push(`Level ${config.id}: Theme CSS file not found: ${cssPath}`);
      }
    }
  } else {
    warnings.push(`Level ${config.id}: No theme_css defined, using default fallback`);
  }

  // 3. Audio File Checks
  if (config.audio_cues) {
    for (const [key, audioPath] of Object.entries(config.audio_cues)) {
      if (!audioPath) continue;
      
      const fullPath = path.join(AUDIO_DIR, audioPath);
      if (!fs.existsSync(fullPath)) {
        // Just a warning for now as audio might be optional or generated
        warnings.push(`Level ${config.id}: Audio cue '${key}' file not found: ${audioPath}`);
      }
    }
  }

  // 4. Puzzle Validation
  if (config.puzzles) {
    config.puzzles.forEach((p, idx) => {
      if (!p.id) errors.push(`Level ${config.id}: Puzzle at index ${idx} is missing an ID`);
      if (!p.type) errors.push(`Level ${config.id}: Puzzle ${p.id || idx} is missing a type`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run a full validation on all loaded levels and print results
 */
export function validateAll(levels: LevelConfig[]): boolean {
  let allValid = true;
  console.log("\n[Validator] Starting configuration health check...");

  for (const level of levels) {
    const result = validateLevel(level);
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(w => console.warn(`   [WARN] ${w}`));
    }
    
    if (!result.valid) {
      allValid = false;
      result.errors.forEach(e => console.error(`   [ERROR] ${e}`));
      console.error(`❌ Level '${level.id}' validation FAILED\n`);
    } else {
      console.log(`✅ Level '${level.id}' validation PASSED`);
    }
  }

  if (allValid) {
    console.log("[Validator] All configuration systems NOMINAL.\n");
  } else {
    console.error("[Validator] Configuration errors detected. System behavior may be unstable.\n");
  }

  return allValid;
}
