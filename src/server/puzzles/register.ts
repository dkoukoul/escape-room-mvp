// ============================================================
// Puzzle Registration — Import all handlers and register them
// ============================================================

import { registerPuzzleHandler } from "./puzzle-handler.ts";
import { asymmetricSymbolsHandler } from "./asymmetric-symbols.ts";
import { rhythmTapHandler } from "./rhythm-tap.ts";
import { collaborativeWiringHandler } from "./collaborative-wiring.ts";
import { cipherDecodeHandler } from "./cipher-decode.ts";
import { collaborativeAssemblyHandler } from "./collaborative-assembly.ts";
import { alphabetWallHandler } from "./alphabet-wall.ts";
import { demogorgonHuntHandler } from "./demogorgon-hunt.ts";

registerPuzzleHandler("asymmetric_symbols", asymmetricSymbolsHandler);
registerPuzzleHandler("rhythm_tap", rhythmTapHandler);
registerPuzzleHandler("collaborative_wiring", collaborativeWiringHandler);
registerPuzzleHandler("cipher_decode", cipherDecodeHandler);
registerPuzzleHandler("collaborative_assembly", collaborativeAssemblyHandler);
registerPuzzleHandler("alphabet_wall", alphabetWallHandler);
registerPuzzleHandler("demogorgon_hunt", demogorgonHuntHandler);

console.log("[PuzzleRegistry] Registered all puzzle handlers");
