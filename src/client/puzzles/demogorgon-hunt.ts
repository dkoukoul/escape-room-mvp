import { h, $, mount, clear } from "../lib/dom.ts";
import { emit, ClientEvents } from "../lib/socket.ts";
import { playSuccess, playFail } from "../audio/audio-manager.ts";
import type { PlayerView } from "@shared/types.ts";

export function renderDemogorgonHunt(container: HTMLElement, view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const currentRound = data.currentRound as number;
  const maxRounds = data.maxRounds as number;

  mount(
    container,
    h("div", { className: "puzzle-header" },
      h("h2", { className: "title-lg" }, view.puzzleTitle),
      h("div", { className: "puzzle-role-badge" }, view.role),
    ),
    h("p", { id: "dh-round-info", className: "subtitle mt-md" }, `Round ${currentRound} / ${maxRounds}`)
  );

  const mainArea = h("div", { className: "mt-lg dh-container w-full flex-col items-center" });
  mount(container, mainArea);

  if (view.role === "Eleven") {
    renderElevenView(mainArea, data);
  } else {
    renderTrapperView(mainArea, data);
  }
}

function renderElevenView(container: HTMLElement, data: Record<string, unknown>): void {
  const quadrant = data.quadrant as string;
  const statusOverride = data.statusOverride as string | null;

  mount(
    container,
    h("div", { className: "flex-col items-center gap-md w-full max-w-lg" },
      h("p", { className: "subtitle text-center" }, "You can sense the Demogorgon's presence. Guide your team!"),
      
      h("div", { className: "dh-radar-container mt-md" },
        h("div", { className: `dh-quadrant nw ${quadrant === 'NW' ? 'active' : ''}` }, 
          h("span", { className: "dh-quad-label" }, "NW"),
          quadrant === 'NW' ? h("div", { className: "dh-radar-blip" }) : null
        ),
        h("div", { className: `dh-quadrant ne ${quadrant === 'NE' ? 'active' : ''}` }, 
          h("span", { className: "dh-quad-label" }, "NE"),
          quadrant === 'NE' ? h("div", { className: "dh-radar-blip" }) : null
        ),
        h("div", { className: `dh-quadrant sw ${quadrant === 'SW' ? 'active' : ''}` }, 
          h("span", { className: "dh-quad-label" }, "SW"),
          quadrant === 'SW' ? h("div", { className: "dh-radar-blip" }) : null
        ),
        h("div", { className: `dh-quadrant se ${quadrant === 'SE' ? 'active' : ''}` }, 
          h("span", { className: "dh-quad-label" }, "SE"),
          h("div", { className: "dh-school-icon" }, "🏫"),
          quadrant === 'SE' ? h("div", { className: "dh-radar-blip" }) : null
        ),
      ),
      
      h("div", { id: "dh-status-msg", className: "mt-md title-md glow-text text-center min-h-[40px]" }, 
        statusOverride === 'win' ? "The Demogorgon was caught!" :
        statusOverride === 'lose' ? "The Demogorgon reached the school..." :
        `Sense: The Demogorgon is in the ${quadrant}!`
      )
    )
  );
}

function renderTrapperView(container: HTMLElement, data: Record<string, unknown>): void {
  const gridSize = data.gridSize as number;
  const trapsPerRound = data.trapsPerRound as number;
  const placedTraps = (data.placedTraps as {row: number, col: number}[]) || [];
  const currentRoundTraps = (data.currentRoundTraps as {row: number, col: number}[]) || [];
  const schoolPosition = data.schoolPosition as {row: number, col: number};
  const statusOverride = data.statusOverride as string | null;

  const trapsRemaining = trapsPerRound - currentRoundTraps.length;
  
  const board = h("div", { className: "dh-board mt-md" });
  // Set CSS variable for grid size
  board.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const isSchool = r === schoolPosition.row && c === schoolPosition.col;
      const isPlaced = placedTraps.some(t => t.row === r && t.col === c);
      const isCurrent = currentRoundTraps.some(t => t.row === r && t.col === c);
      
      let content = "";
      if (isSchool) content = "🏫";
      else if (isPlaced || isCurrent) content = "🪤";

      const cellClass = `dh-cell ${isPlaced ? 'placed' : ''} ${isCurrent ? 'current' : ''} ${isSchool ? 'school' : ''}`;
      
      const cell = h("div", { 
        className: cellClass,
        "data-row": r.toString(),
        "data-col": c.toString()
      }, content);

      if (!isSchool && !isPlaced && !statusOverride) {
        cell.addEventListener("click", () => handleCellClick(r, c));
      }

      mount(board, cell);
    }
  }

  mount(
    container,
    h("div", { className: "flex-col items-center gap-sm w-full max-w-lg" },
      h("p", { className: "subtitle text-center" }, "Listen to Eleven's intel and place traps!"),
      board,
      
      h("div", { className: "mt-md flex gap-md items-center justify-between w-full" },
        h("p", { id: "dh-traps-info", className: "hud-label glow-text" }, `Traps left: ${trapsRemaining}`),
        h("button", {
          id: "dh-confirm",
          className: "btn btn-primary",
          disabled: trapsRemaining > 0 || statusOverride !== null ? "true" : false,
          onClick: handleConfirmRound,
        }, "Confirm Trap Placement"),
      ),
      h("div", { id: "dh-status-msg", className: "mt-md title-md glow-text text-center min-h-[40px]" }, 
        statusOverride === 'win' ? "The Demogorgon was caught! 🏆" :
        statusOverride === 'lose' ? "The Demogorgon reached the school... 💀" :
        ""
      )
    )
  );
}

function handleCellClick(row: number, col: number): void {
  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: "",
    action: "toggle_trap",
    data: { row, col },
  });
}

function handleConfirmRound(): void {
  emit(ClientEvents.PUZZLE_ACTION, {
    puzzleId: "",
    action: "confirm_round",
    data: {},
  });
}

let lastStatus: string | null = null;
export function updateDemogorgonHunt(view: PlayerView): void {
  const data = view.viewData as Record<string, unknown>;
  const currentRound = data.currentRound as number;
  const maxRounds = data.maxRounds as number;
  const statusOverride = data.statusOverride as string | null;

  const roundInfo = $("#dh-round-info");
  if (roundInfo) roundInfo.textContent = `Round ${currentRound} / ${maxRounds}`;

  // Just do a full re-render of the specific container part since it's a grid state
  // This is simpler and less prone to DOM desync for this puzzle
  const container = document.querySelector(".dh-container") as HTMLElement;
  if (container) {
    clear(container);
    if (view.role === "Eleven") {
      renderElevenView(container, data);
    } else {
      renderTrapperView(container, data);
    }
  }

  // Handle win/lose audio
  if (statusOverride !== lastStatus) {
    lastStatus = statusOverride;
    if (statusOverride === 'win') {
      playSuccess();
    } else if (statusOverride === 'lose') {
      playFail();
    }
  }
}
