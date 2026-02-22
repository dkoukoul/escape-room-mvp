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
} from "@shared/events.ts";

let currentRoomCode: string | null = null;
let isHost = false;
let players: Player[] = [];

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
  mount(
    container,
    h("div", { className: "panel flex-col items-center gap-md", style: "max-width: 500px; width: 100%;" },
      h("p", { className: "subtitle" }, "ROOM CODE"),
      h("h2", { className: "title-xl", style: "font-size: 3rem; letter-spacing: 8px;" }, currentRoomCode ?? ""),
      h("p", { className: "subtitle mt-md" }, `${players.length} HOPLITE${players.length !== 1 ? "S" : ""} CONNECTED`),
      h("ul", { id: "player-list", className: "player-list mt-sm" },
        ...players.map((p) =>
          h("li", { className: `player-tag ${p.isHost ? "host" : ""}` }, p.name)
        ),
      ),
      h("div", { className: "flex-row gap-sm mt-xl" },
        isHost
          ? h("div", { className: "flex-col gap-sm" },
              import.meta.env.DEV ? h("select", { id: "select-puzzle", className: "input" },
                h("option", { value: "0" }, "Puzzle 1: The Neon Propylaea"),
                h("option", { value: "1" }, "Puzzle 2: The Oracle's Frequency"),
                h("option", { value: "2" }, "Puzzle 3: The Columns of Logic"),
                h("option", { value: "3" }, "Puzzle 4: The Philosopher's Cipher"),
                h("option", { value: "4" }, "Puzzle 5: The Parthenon Reconstruction"),
              ) : "",
              h("button", {
                id: "btn-start",
                className: "btn btn-primary",
                onClick: handleStart,
                disabled: players.length < 1, // Debug: allow 1 player
              }, "⚡ Start Mission")
            )
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

function handleStart(): void {
  const selectEl = $("#select-puzzle") as HTMLSelectElement | null;
  const startingPuzzleIndex = selectEl ? parseInt(selectEl.value, 10) : 0;
  
  emit(ClientEvents.START_GAME, { startingPuzzleIndex } as StartGamePayload);
}

function handleLeave(): void {
  emit(ClientEvents.LEAVE_ROOM);
  currentRoomCode = null;
  isHost = false;
  players = [];
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
    const screen = $("#screen-lobby")!;
    renderRoomView(screen);
  });

  on(ServerEvents.ROOM_JOINED, (data: RoomJoinedPayload) => {
    currentRoomCode = data.roomCode;
    isHost = data.player.isHost;
    players = data.players;
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

  on(ServerEvents.GAME_STARTED, (_data: GameStartedPayload) => {
    showHUD(true);
    // Briefing screen will be shown by briefing.ts
  });
}
