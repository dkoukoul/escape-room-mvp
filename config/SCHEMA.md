# YAML Level Config Schema

This documents every field in a level YAML config file. Maps to `LevelConfig` and `PuzzleConfig` in `shared/types.ts`.

## Top-Level Fields

| Field               | Type           | Required | Description                                                                                     |
| ------------------- | -------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `id`                | string         | ✅       | Unique level identifier (e.g., `"akropolis_defrag"`)                                            |
| `title`             | string         | ✅       | Display title                                                                                   |
| `story`             | string         | ✅       | Story text shown during level intro                                                             |
| `min_players`       | number         | ✅       | Minimum players required                                                                        |
| `max_players`       | number         | ✅       | Maximum players allowed                                                                         |
| `timer_seconds`     | number         | ✅       | Total game time in seconds                                                                      |
| `glitch_max`        | number         | ✅       | Game over threshold for glitch meter (default: 100)                                             |
| `glitch_decay_rate` | number         | ✅       | Natural decay per second (0 = no decay)                                                         |
| `theme_css`         | string[]       | ❌       | CSS files to load (relative to `src/client/styles/`). Default: `["themes/cyberpunk-greek.css"]` |
| `puzzles`           | PuzzleConfig[] | ✅       | Array of puzzle definitions (see below)                                                         |
| `audio_cues`        | object         | ❌       | Global audio cues for the level                                                                 |

### `audio_cues` (top-level)

| Field            | Type   | Required | Description                      |
| ---------------- | ------ | -------- | -------------------------------- |
| `intro`          | string | ❌       | Audio file for level intro       |
| `background`     | string | ❌       | Background music during gameplay |
| `glitch_warning` | string | ❌       | Played when glitch meter is high |
| `victory`        | string | ❌       | Played on victory                |
| `defeat`         | string | ❌       | Played on defeat                 |

---

## Puzzle Config (`puzzles[]`)

| Field            | Type       | Required | Description                                                  |
| ---------------- | ---------- | -------- | ------------------------------------------------------------ |
| `id`             | string     | ✅       | Unique puzzle identifier within the level                    |
| `type`           | PuzzleType | ✅       | Must match a registered puzzle handler (see below)           |
| `title`          | string     | ✅       | Display title                                                |
| `briefing`       | string     | ✅       | Story text shown before puzzle starts                        |
| `glitch_penalty` | number     | ✅       | Glitch meter increase per mistake                            |
| `layout`         | object     | ✅       | Role definitions (see below)                                 |
| `data`           | object     | ✅       | Puzzle-type-specific configuration (see per-type docs below) |
| `audio_cues`     | object     | ❌       | Puzzle-specific audio (start, success, fail, background)     |

### Valid `type` Values (PuzzleType)

- `"asymmetric_symbols"` — One player sees the solution, others catch letters
- `"rhythm_tap"` — Players tap colors in the correct sequence
- `"collaborative_wiring"` — Players toggle switches to power all columns
- `"cipher_decode"` — Decode cipher text using a key visible only to one role
- `"collaborative_assembly"` — Place fragments on a grid

### `layout`

```yaml
layout:
  roles:
    - name: "RoleName" # Display name (e.g., "Navigator", "Decoder")
      count: 1 # Exact number of players, OR "remaining" for all unassigned
      description: "What this role does"
```

Roles are assigned by `role-assigner.ts`. Use `count: "remaining"` for the last role to capture all unassigned players.

---

## Per-Puzzle-Type `data` Fields

### `asymmetric_symbols`

| Field                | Type                               | Description                          |
| -------------------- | ---------------------------------- | ------------------------------------ |
| `solution_words`     | string[]                           | Pool of words to choose from         |
| `rounds_to_play`     | number                             | Number of words to solve             |
| `glitch_speed`       | `"slow"` \| `"medium"` \| `"fast"` | Letter animation speed               |
| `letter_lifetime_ms` | number                             | How long each letter stays visible   |
| `spawn_interval_ms`  | number                             | Time between letter spawns           |
| `decoy_ratio`        | number                             | Ratio of decoy (wrong) letters (0-1) |

### `rhythm_tap`

| Field               | Type       | Description                                                 |
| ------------------- | ---------- | ----------------------------------------------------------- |
| `sequences`         | string[][] | Array of color sequences (e.g., `["blue", "red", "green"]`) |
| `tolerance_ms`      | number     | Allowed timing error in milliseconds                        |
| `playback_speed_ms` | number     | Time per color during demo playback                         |
| `rounds_to_play`    | number     | Total rounds                                                |
| `rounds_to_win`     | number     | Required successful rounds                                  |

### `collaborative_wiring`

| Field                 | Type          | Description                                            |
| --------------------- | ------------- | ------------------------------------------------------ |
| `grid_size`           | number        | Number of columns to power                             |
| `switches_per_player` | number        | Switches each player controls                          |
| `rounds_to_play`      | number        | Number of rounds                                       |
| `solution_matrices`   | boolean[][][] | Array of solution matrices (picked randomly per round) |
| `max_attempts`        | number        | Maximum wrong attempts before glitch penalty           |

### `cipher_decode`

| Field            | Type                   | Description                                        |
| ---------------- | ---------------------- | -------------------------------------------------- |
| `cipher_key`     | Record<string, string> | Letter substitution map                            |
| `sentences`      | object[]               | Each has `encrypted`, `decoded`, and `hint` fields |
| `rounds_to_play` | number                 | Number of sentences to decode                      |

### `collaborative_assembly`

| Field               | Type   | Description               |
| ------------------- | ------ | ------------------------- |
| `grid_cols`         | number | Grid width                |
| `grid_rows`         | number | Grid height               |
| `total_pieces`      | number | Number of pieces to place |
| `snap_tolerance_px` | number | Snap distance in pixels   |
