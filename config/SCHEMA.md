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
- `"labyrinth_navigate"` — Cartographer sees maze map; Runners navigate with local vision
- `"echo_relay"` — Scribe sees garbled text; Tuners adjust frequency dials to decode
- `"star_alignment"` — Players place stars of different colors to form a constellation

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

### `labyrinth_navigate`

| Field               | Type       | Description                                                       |
| ------------------- | ---------- | ----------------------------------------------------------------- |
| `rows`              | number     | Maze grid height                                                  |
| `cols`              | number     | Maze grid width                                                   |
| `grid`              | number[][] | 2D array: 0=floor, 1=wall, 2=trap, 3=exit, 4=landmark            |
| `start_position`    | number[]   | `[row, col]` starting position for Runners                       |
| `exit_position`     | number[]   | `[row, col]` exit position (win target)                           |
| `landmarks`         | object[]   | Each has `row`, `col`, and `label` (name visible on map)          |
| `traps`             | number[][] | Array of `[row, col]` trap positions (cause glitch when stepped)  |
| `ping_delay_ms`     | number     | Delay (ms) before Runner's ping appears on Cartographer's map     |
| `visibility_radius` | number     | How many tiles around the Runner are visible (1 or 2)             |

### `echo_relay`

| Field               | Type     | Description                                                          |
| ------------------- | -------- | -------------------------------------------------------------------- |
| `original_text`     | string   | The fully decoded target text                                        |
| `dials`             | object[] | Frequency dials (see below)                                          |
| `garble_characters` | string   | Pool of characters used for garbling (e.g., Greek alphabet)          |

Each dial in `dials[]`:

| Field                | Type     | Description                                          |
| -------------------- | -------- | ---------------------------------------------------- |
| `id`                 | string   | Unique dial identifier                               |
| `label`              | string   | Display label (e.g., "Συχνότητα Α")                  |
| `correct_value`      | number   | The value that correctly decodes affected characters  |
| `min_value`          | number   | Slider minimum                                       |
| `max_value`          | number   | Slider maximum                                       |
| `step`               | number   | Slider step increment                                |
| `affected_positions` | number[] | Character indices this dial controls (can overlap)   |

### `star_alignment`

| Field         | Type     | Description                                                  |
| ------------- | -------- | ------------------------------------------------------------ |
| `grid_rows`   | number   | Sky grid height                                              |
| `grid_cols`   | number   | Sky grid width                                               |
| `stars`       | object[] | Star definitions (see below)                                 |
| `guide_lines` | object[] | Lines connecting target positions (constellation shape)      |

Each star in `stars[]`:

| Field        | Type               | Description                        |
| ------------ | ------------------ | ---------------------------------- |
| `id`         | string             | Unique star identifier             |
| `color`      | `"gold"` \| `"blue"` | Determines which role can move it |
| `start_row`  | number             | Initial row position               |
| `start_col`  | number             | Initial column position            |
| `target_row` | number             | Correct row position               |
| `target_col` | number             | Correct column position            |

Each guide line in `guide_lines[]`:

| Field  | Type     | Description                          |
| ------ | -------- | ------------------------------------ |
| `from` | number[] | `[row, col]` start of line segment   |
| `to`   | number[] | `[row, col]` end of line segment     |
