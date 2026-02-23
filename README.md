# ⚡ Project ODYSSEY: A platform for online co-op escape rooms

**Project ODYSSEY** is an open-source, high-performance co-op escape room engine built for the web. It is designed for **2 to 6 players** to solve asymmetric, logic-based puzzles in a high-stakes, "glitching" environment.

The first mission: **The Akropolis Defragmentation.**

Try it out at: [odyssey.kpopgenerator.cloud](https://odyssey.kpopgenerator.cloud)

---

## 🏛️ The Story (Mission 01)
The year is 2084. Global history is stored in a supercomputer beneath Athens. A group known as *The Erasers* has uploaded the **Chronos Virus**. Ancient Greece is pixelating. You and your squad are **Cyber-Hoplites**—digital soldiers sent into the simulation to repair the "Glitch" before the Parthenon (and democracy) is deleted forever.

---

## 🛠️ Tech Stack
* **Runtime:** [Bun](https://bun.sh/) (Fastest TS/JS runtime)
* **Language:** TypeScript
* **Communication:** Socket.io (Real-time state synchronization)
* **Frontend:** Vite + React (with TailwindCSS for "Neon-Cyberpunk" UI) (Use CSS for objects and graphics)
* **Configuration:** YAML (For levels, puzzles, and role definitions)
* **Audio:** ElevenLabs AI (Greek Voiceover) + Web Audio API (Glitch SFX)
* **REDIS:** For caching and real-time state synchronization
* **Files:** For keeping game data: levels, puzzles, roles, etc.
---

## ⚙️ Config-First Architecture
The architecture must follow the clean architecture principles.
The game is entirely data-driven. To create a new puzzle or level, you don't need to touch the core engine—you simply edit the `levels/` directory.

### Example Level Configuration (`level_01.yaml`)
```yaml
id: "akropolis_gate"
title: "The Neon Propylaea"
min_players: 2
max_players: 6
timer_seconds: 600
glitch_intensity: 0.2

puzzles:
  - id: "doric_code_01"
    type: "asymmetric_symbols"
    layout: 
      navigators: 1 # Sees the solution
      decoders: 5   # Must click the flying letters
    data:
      solution_words: ["ΦΙΛΟΣΟΦΙΑ", "ΔΗΜΟΚΡΑΤΙΑ", "ΗΡΩΣ"]
      glitch_speed: "fast"
    
  - id: "power_sync"
    type: "rhythm_tap"
    layout:
      all_players: true
    data:
      sequence: ["blue", "red", "green", "yellow"]
      tolerance_ms: 500

audio_cues:
  intro: "athena_welcome_01.mp3"
  glitch_warning: "athena_system_failure.mp3"
```

---

## 🕹️ Game Mechanics
* **Role Randomization:** Every time a game starts, players are assigned roles (e.g., *The Strategos*, *The Tech-Oracle*, *The Engineer*).
* **Asymmetric Views:** If `player.role === 'Navigator'`, they see the map. Everyone else sees static. They *must* talk to survive.
* **The Glitch Meter:** A shared global state. If someone makes a mistake, the `glitch_value` increases, causing the screen to shake and colors to distort for **everyone**.
* **No Registration:** Players enter a room using a 4-character code (e.g., `zeus`).

---

## 📁 Project Structure
```text
/odyssey
├── /assets           # MP3s (Greek TTS) and SVG/Sprite assets
├── /config           # YAML files for all levels and puzzles
├── /src
│   ├── /client       # React + Tailwind frontend
│   └── /server       # Bun + Socket.io backend
│       ├── /engine   # Logic for syncing state and processing YAML
│       └── /puzzles  # Puzzle logic handlers (Mapped to YAML types)
├── /shared           # TypeScript Interfaces (The "Source of Truth")
├── bun.lockb
└── package.json
```

---

## 🚀 Development

### To start the server:
```bash
bun install
bun run dev:server
```

### To create a new puzzle:
1.  Define the puzzle logic in `src/server/puzzles/[type].ts`.
2.  Add a new entry in your `.yaml` level file.
3.  The Engine will automatically map the `type` to the logic and assign players to roles.
