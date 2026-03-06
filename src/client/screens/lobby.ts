// ============================================================
// Lobby Screen — Join/Create room, player roster
// ============================================================
//
// @ai-context
// ROLE: First screen. Handles room creation/joining, player list, level selection, and leaderboard.
// KEY FUNCTIONS: initLobby, renderJoinView, renderRoomView, setupSocketListeners
// DEPENDS ON: lib/dom (h, $, mount, clear), lib/socket (on, emit), shared/events, shared/types
// STATE: Module-level variables — currentRoom, myPlayer, players[], availableLevels[], leaderboard[]
// PATTERN: Two views — "join" (create/join room) and "room" (player list + start button).
//          Socket listeners update module state and re-render the active view.
// ============================================================

import { h, $, mount, clear } from "../lib/dom.ts";
import { emit, on, getPlayerId, ClientEvents, ServerEvents } from "../lib/socket.ts";
import { showScreen, showHUD } from "../lib/router.ts";
import type { Player } from "@shared/types.ts";
import type {
  RoomCreatedPayload,
  RoomJoinedPayload,
  PlayerListPayload,
  RoomErrorPayload,
  GameStartedPayload,
  StartGamePayload,
  LevelListPayload,
  LevelSelectedPayload,
  LeaderboardListPayload,
} from "@shared/events.ts";
import type { LevelSummary, LeaderboardEntry } from "@shared/types.ts";
import { logger } from "../logger.ts";

let currentRoomCode: string | null = null;
let isHost = false;
let players: Player[] = [];
let availableLevels: LevelSummary[] = [];
let selectedLevelId: string | null = null;
let selectedPuzzleIndex: number | null = null;
let leaderboard: LeaderboardEntry[] = [];

export function clearSavedSession() {
  localStorage.removeItem("odyssey_room_code");
  localStorage.removeItem("odyssey_player_name");
  localStorage.removeItem("odyssey_room_created_time");
}

export function initLobby(): void {
  const screen = $("#screen-lobby")!;
  renderJoinView(screen);
  setupSocketListeners();
  
  // Request leaderboard data
  emit(ClientEvents.LEADERBOARD_REQUEST);

  const savedRoomCreatedTime = localStorage.getItem("odyssey_room_created_time");
  // If room created time is further than 30 minutes in the past clear it
  if (savedRoomCreatedTime && Date.now() - parseInt(savedRoomCreatedTime) > 30 * 60 * 1000) {
    clearSavedSession();
  }
  // Auto-restore session from localStorage, only if it is in the last 30 minutes
  setTimeout(() => {
    const savedName = localStorage.getItem("odyssey_player_name");
    const savedRoom = localStorage.getItem("odyssey_room_code");
    
    const urlParams = new URLSearchParams(window.location.search);

    // Fill input fields if saved
    if (savedName) {
      const nameInput = $("#input-name") as HTMLInputElement;
      if (nameInput) nameInput.value = savedName;
    }
    if (savedRoom) {
      const roomInput = $("#input-room") as HTMLInputElement;
      if (roomInput) roomInput.value = savedRoom;
    }

    // Auto-join if we have both and NO query params (or if we want to support it with query params)
    if (savedName && savedRoom && !currentRoomCode) {
      logger.info(`[Lobby] Attempting auto-join: ${savedRoom}`);
      emit(ClientEvents.JOIN_ROOM, { roomCode: savedRoom, playerName: savedName });
    }
  }, 100);
}

function renderJoinView(container: HTMLElement): void {
  mount(
    container,
    h("div", { className: "panel flex-col items-center gap-md", style: "max-width: 440px; width: 100%;" },
      h("h1", { className: "title-xl glitch-text", "data-text": "ODYSSEY" }, "ODYSSEY"),
      h("p", { className: "subtitle mt-sm" }, "Cyber Protocol"),
      h("div", { className: "mt-xl flex-col gap-md items-center w-full" },
        h("input", {
          id: "input-name",
          className: "input w-full",
          type: "text",
          placeholder: "Your callsign",
          maxlength: "16",
          autocomplete: "off",
          style: "letter-spacing: 2px; text-transform: none;",
        }),
        h("input", {
          id: "input-room",
          className: "input w-full",
          type: "text",
          placeholder: "room code",
          maxlength: "8",
          autocomplete: "off",
        }),
        h("div", { className: "flex-row gap-sm mt-sm" },
          h("button", {
            id: "btn-join",
            className: "btn btn-primary",
            onClick: handleJoin,
          }, "Join"),
          h("button", {
            id: "btn-create",
            className: "btn",
            onClick: handleCreate,
          }, "Create Room"),
        ),
        h("p", { id: "lobby-error", className: "subtitle", style: "color: var(--neon-red); min-height: 1.4em;" }),
      ),
      renderLeaderboard(),
    ),
    renderFooter(),
  );
}

function renderLeaderboard(): HTMLElement {
  if (leaderboard.length === 0) return h("div", { className: "hidden" });

  return h("div", { className: "leaderboard-container flex-col items-center w-full mt-xl" },
    h("h3", { className: "title-sm mb-md", style: "color: var(--neon-gold); text-transform: uppercase; letter-spacing: 4px;" }, "🏆 HALL OF FAME 🏆"),
    h("table", { className: "leaderboard-table" },
      h("thead", {},
        h("tr", {},
          h("th", { className: "text-center" }, "#"),
          h("th", {}, "TEAM"),
          h("th", { className: "text-center" }, "SCORE"),
        )
      ),
      h("tbody", {},
        ...leaderboard.map((entry, idx) => 
          h("tr", {},
            h("td", { className: "leaderboard-rank text-center" }, String(idx + 1)),
            h("td", {}, 
              h("div", { className: "flex-col" },
                h("span", { style: "color: var(--neon-cyan); font-size: 0.9rem;" }, entry.userNames.join(", ")),
                h("span", { style: "font-size: 0.6rem; opacity: 0.5;" }, entry.roomName.toUpperCase())
              )
            ),
            h("td", { className: "leaderboard-score text-center" }, String(entry.score))
          )
        )
      )
    )
  );
}

function renderFooter(): HTMLElement {
  const footer = h("footer", { className: "lobby-footer" },
    h("a", {
      href: "https://github.com/dkoukoul/escape-room-mvp",
      target: "_blank",
      className: "github-link",
      rel: "noopener noreferrer"
    },
      h("span", { 
        className: "github-logo",
        style: "display: inline-flex; align-items: center;"
      }),
      "Odyssey is an open source escape room platform — GitHub Repo"
    )
  );

  // Inject SVG logo
  const logoContainer = footer.querySelector(".github-logo") as HTMLElement;
  if (logoContainer) {
    logoContainer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`;
  }

  return footer;
}

function renderRoomView(container: HTMLElement): void {
  const selectedLevel = availableLevels.find(l => l.id === selectedLevelId);

  mount(
    container,
    h("div", { className: "panel flex-col items-center gap-md", style: "max-width: 500px; width: 100%;" },
      h("p", { className: "subtitle" }, "ROOM CODE"),
      h("h2", { className: "title-xl", style: "font-size: 3rem; letter-spacing: 8px;" }, currentRoomCode ?? ""),
      
      // Level Selection Section
      h("div", { className: "w-full mt-lg pt-lg", style: "border-top: 1px solid rgba(0, 240, 255, 0.1);" },
        h("p", { className: "subtitle mb-sm" }, "SELECTED MISSION"),
        isHost
          ? h("select", {
              id: "select-level",
              className: "input w-full",
              onChange: (e: any) => handleLevelSelect(e.target.value),
            },
              h("option", { value: "", selected: selectedLevelId === null }, "select mission"),
              ...availableLevels.map(l => 
                h("option", { value: l.id, selected: l.id === selectedLevelId }, l.title)
              )
            )
          : h("div", { className: "title-sm", style: "color: var(--neon-cyan); min-height: 1.2em;" }, 
              selectedLevel?.title ?? "Waiting for selection..."
            )
      ),

      // Mission Details (if level selected)
      selectedLevel ? h("div", { className: "w-full mt-md flex-col gap-xs" },
        h("p", { className: "subtitle", style: "font-size: 0.7rem;" }, 
          `${selectedLevel.puzzle_count} PUZZLES | ${selectedLevel.min_players}-${selectedLevel.max_players} PLAYERS`
        ),
        h("p", { className: "subtitle", style: "opacity: 0.7; font-size: 0.8rem; line-height: 1.4;" }, selectedLevel.story),
        
        // Puzzle Selection for Host (Dev Mode)
        isHost ? h("div", { className: "mt-sm pt-sm", style: "border-top: 1px dashed rgba(0, 240, 255, 0.2);" },
          h("p", { className: "subtitle mb-xs", style: "font-size: 0.7rem; color: var(--neon-cyan);" }, "START AT PUZZLE (DEV ONLY)"),
          h("select", {
            className: "input w-full",
            style: "font-size: 0.8rem; height: 2rem; padding: 0 0.5rem;",
            onChange: (e: any) => { 
              const val = e.target.value;
              selectedPuzzleIndex = val === "" ? null : parseInt(val); 
            }
          },
            h("option", { value: "", selected: selectedPuzzleIndex === null }, "Normal Start (With Intro)"),
            ...selectedLevel.puzzles.map((p, idx) => 
               h("option", { value: String(idx), selected: idx === selectedPuzzleIndex }, `Jump to ${idx + 1}. ${p.title}`)
            )
          )
        ) : ""
      ) : "",

      h("p", { className: "subtitle mt-xl" }, `${players.length} HOPLITE${players.length !== 1 ? "S" : ""} CONNECTED`),
      h("ul", { id: "player-list", className: "player-list mt-sm" },
        ...players.map((p) =>
          h("li", { className: `player-tag ${p.isHost ? "host" : ""}` }, p.name)
        ),
      ),
      h("div", { className: "flex-row gap-sm mt-xl" },
        isHost
          ? h("button", {
                id: "btn-start",
                className: "btn btn-primary",
                onClick: handleStart,
                disabled: players.length < (selectedLevel?.min_players || 1) || !selectedLevelId,
              }, "⚡ Start Mission")
          : h("p", { className: "subtitle pulse" }, "Waiting for host to start..."),
        h("button", {
          className: "btn btn-danger",
          onClick: handleLeave,
        }, "Leave"),
      ),
    ),
    renderFooter(),
  );
}

function handleCreate(): void {
  try {
    const name = ($("#input-name") as HTMLInputElement)?.value.trim();
    if (!name) {
      showError("Enter your callsign.");
      return;
    }
    localStorage.setItem("odyssey_player_name", name);
    localStorage.setItem("odyssey_room_created_time", Date.now().toString());
    emit(ClientEvents.CREATE_ROOM, { playerName: name });
  } catch (err) {
    logger.error("Error creating room", { err });
  }
}

function handleJoin(): void {
  try {
    const name = ($("#input-name") as HTMLInputElement)?.value.trim();
    const code = ($("#input-room") as HTMLInputElement)?.value.trim().toLowerCase();
    if (!name) {
      showError("Enter your callsign.");
      return;
    }
    if (!code) {
      showError("Enter a room code.");
      return;
    }
    localStorage.setItem("odyssey_player_name", name);
    localStorage.setItem("odyssey_room_code", code);
    localStorage.setItem("odyssey_room_created_time", Date.now().toString());
    logger.info("[Lobby] Joining room", { roomCode: code, playerName: name });
    emit(ClientEvents.JOIN_ROOM, { roomCode: code, playerName: name });
  } catch (err) {
    logger.error("Error joining room", { err });
  }
}

function handleLevelSelect(levelId: string): void {
  if (!levelId) return;
  selectedPuzzleIndex = null;
  emit(ClientEvents.LEVEL_SELECT, { levelId });
}

function handleStart(): void {
  try {
    if (!selectedLevelId) return;
    const payload: StartGamePayload = { 
      levelId: selectedLevelId 
    };
    if (selectedPuzzleIndex !== null) {
      payload.startingPuzzleIndex = selectedPuzzleIndex;
    }
    emit(ClientEvents.START_GAME, payload);
  } catch (err) {
    logger.error("Error starting game", { err });
  }
}

function handleLeave(): void {
  try {
    emit(ClientEvents.LEAVE_ROOM);
    currentRoomCode = null;
    isHost = false;
    players = [];
    availableLevels = [];
    selectedLevelId = null;
    localStorage.removeItem("odyssey_room_code");
    const screen = $("#screen-lobby")!;
    renderJoinView(screen);
  } catch (err) {
    logger.error("Error leaving room", { err });
  }
}

function showError(msg: string): void {
  const el = $("#lobby-error");
  if (el) el.textContent = msg;
}

function setupSocketListeners(): void {
  try {
    on(ServerEvents.ROOM_CREATED, (data: RoomCreatedPayload) => {
      currentRoomCode = data.roomCode;
      localStorage.setItem("odyssey_room_code", data.roomCode);
      isHost = true;
      players = [data.player];
      emit(ClientEvents.LEVEL_LIST_REQUEST);
      const screen = $("#screen-lobby")!;
      renderRoomView(screen);
    });

    // Re-join on socket reconnection
    on("connect", () => {
      try {
        const savedRoomCreatedTime = localStorage.getItem("odyssey_room_created_time");
        // If room created time is further than 30 minutes in the past clear it
        if (savedRoomCreatedTime && Date.now() - parseInt(savedRoomCreatedTime) > 30 * 60 * 1000) {
          clearSavedSession();
          return
        }
        const savedName = localStorage.getItem("odyssey_player_name");
        const savedRoom = localStorage.getItem("odyssey_room_code");
        if (savedName && savedRoom) {
          logger.info(`[Lobby] Socket reconnected, re-joining room: ${savedRoom}`);
          emit(ClientEvents.JOIN_ROOM, { roomCode: savedRoom, playerName: savedName });
        }
      } catch (err) {
        logger.warn("Failed to re-join after reconnect", { err });
      }
    });

    on(ServerEvents.ROOM_JOINED, (data: RoomJoinedPayload) => {
      logger.debug("Room joined", { data });
      currentRoomCode = data.roomCode;
      isHost = data.player.isHost;
      players = data.players;
      emit(ClientEvents.LEVEL_LIST_REQUEST);
      const screen = $("#screen-lobby")!;
      renderRoomView(screen);
    });

    on(ServerEvents.PLAYER_LIST_UPDATE, (data: PlayerListPayload) => {
      logger.debug("Player list updated", { data });
      players = data.players;
      const myId = getPlayerId();
      const me = players.find((p) => p.id === myId);
      if (me) isHost = me.isHost;
      if (currentRoomCode) {
        const screen = $("#screen-lobby")!;
        renderRoomView(screen);
      }
    });

    on(ServerEvents.ROOM_ERROR, (data: RoomErrorPayload) => {
      showError(data.message);
    });

    on(ServerEvents.LEVEL_LIST, (data: LevelListPayload) => {
      logger.debug("Level list received", { data });
      availableLevels = data.levels;
      if (currentRoomCode) {
        const screen = $("#screen-lobby")!;
        renderRoomView(screen);
      }
    });

    on(ServerEvents.LEVEL_SELECTED, (data: LevelSelectedPayload) => {
      logger.debug("Level selected", { data });
      selectedLevelId = data.levelId;
      if (currentRoomCode) {
        const screen = $("#screen-lobby")!;
        renderRoomView(screen);
      }
    });

    on(ServerEvents.GAME_STARTED, (_data: GameStartedPayload) => {
      showHUD(true);
      // Level intro screen will be shown by level-intro.ts
    });

    on(ServerEvents.LEADERBOARD_LIST, (data: LeaderboardListPayload) => {
      logger.debug("Leaderboard received", { data });
      leaderboard = data.entries;
      if (!currentRoomCode) {
        const screen = $("#screen-lobby")!;
        renderJoinView(screen);
      }
    });
  } catch (err) {
    logger.error("Error setting up socket listeners in lobby", { err });
  }
}
