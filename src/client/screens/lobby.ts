// ============================================================
// Lobby Screen — Join/Create room, player roster
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
} from "@shared/events.ts";
import type { LevelSummary } from "@shared/types.ts";

let currentRoomCode: string | null = null;
let isHost = false;
let players: Player[] = [];
let availableLevels: LevelSummary[] = [];
let selectedLevelId: string | null = null;

export function initLobby(): void {
  const screen = $("#screen-lobby")!;
  renderJoinView(screen);
  setupSocketListeners();
}

function renderJoinView(container: HTMLElement): void {
  mount(
    container,
    h("div", { className: "panel flex-col items-center gap-md", style: "max-width: 440px; width: 100%;" },
      h("h1", { className: "title-xl glitch-text", "data-text": "ODYSSEY" }, "ODYSSEY"),
      h("p", { className: "subtitle mt-sm" }, "Cyber-Hoplite Protocol"),
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
    ),
  );
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
              h("option", { value: "" }, "-- Select a Mission --"),
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
        h("p", { className: "subtitle", style: "opacity: 0.7; font-size: 0.8rem; line-height: 1.4;" }, selectedLevel.story)
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
  );
}

function handleCreate(): void {
  const name = ($("#input-name") as HTMLInputElement)?.value.trim();
  if (!name) {
    showError("Enter your callsign, Hoplite.");
    return;
  }
  emit(ClientEvents.CREATE_ROOM, { playerName: name });
}

function handleJoin(): void {
  const name = ($("#input-name") as HTMLInputElement)?.value.trim();
  const code = ($("#input-room") as HTMLInputElement)?.value.trim().toLowerCase();
  if (!name) {
    showError("Enter your callsign, Hoplite.");
    return;
  }
  if (!code) {
    showError("Enter a room code.");
    return;
  }
  emit(ClientEvents.JOIN_ROOM, { roomCode: code, playerName: name });
}

function handleLevelSelect(levelId: string): void {
  if (!levelId) return;
  emit(ClientEvents.LEVEL_SELECT, { levelId });
}

function handleStart(): void {
  if (!selectedLevelId) return;
  emit(ClientEvents.START_GAME, { levelId: selectedLevelId } as StartGamePayload);
}

function handleLeave(): void {
  emit(ClientEvents.LEAVE_ROOM);
  currentRoomCode = null;
  isHost = false;
  players = [];
  availableLevels = [];
  selectedLevelId = null;
  const screen = $("#screen-lobby")!;
  renderJoinView(screen);
}

function showError(msg: string): void {
  const el = $("#lobby-error");
  if (el) el.textContent = msg;
}

function setupSocketListeners(): void {
  on(ServerEvents.ROOM_CREATED, (data: RoomCreatedPayload) => {
    currentRoomCode = data.roomCode;
    isHost = true;
    players = [data.player];
    emit(ClientEvents.LEVEL_LIST_REQUEST);
    const screen = $("#screen-lobby")!;
    renderRoomView(screen);
  });

  on(ServerEvents.ROOM_JOINED, (data: RoomJoinedPayload) => {
    currentRoomCode = data.roomCode;
    isHost = data.player.isHost;
    players = data.players;
    emit(ClientEvents.LEVEL_LIST_REQUEST);
    const screen = $("#screen-lobby")!;
    renderRoomView(screen);
  });

  on(ServerEvents.PLAYER_LIST_UPDATE, (data: PlayerListPayload) => {
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
    availableLevels = data.levels;
    if (currentRoomCode) {
      const screen = $("#screen-lobby")!;
      renderRoomView(screen);
    }
  });

  on(ServerEvents.LEVEL_SELECTED, (data: LevelSelectedPayload) => {
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
}
