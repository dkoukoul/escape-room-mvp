import { zzfx } from "zzfx";

// Standard ZzFX Presets from the documentation/examples
const PRESETS: Record<string, number[]> = {
  "Power Up": [1, 0.5, 1000, 0.05, 0.1, 0.3, 1, 1.5, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Standard Shoot": [1, 0.05, 1500, 0.05, 0.1, 0.3, 1, 1.5, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Jump": [1, 0.05, 500, 0.05, 0.1, 0.3, 1, 1.5, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Cyber Hit": [1, 0.1, 200, 0.01, 0.1, 0.2, 3, 1, -5, 0, 0, 0, 0, 1, 0, 0.4, 0, 0, 0, 0],
  "Data Pickup": [1, 0.05, 600, 0.1, 0.1, 0.4, 2, 1.5, 10, 0, 10, 0.1, 0, 0, 0, 0, 0, 0, 0, 0],
  "Explosion": [1, 0.1, 80, 0.2, 0.4, 1.5, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Blip": [1, 0.05, 1500, 0, 0.01, 0.01, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0.1, 0],
  "Glitch Sweep": [1, 0.5, 100, 0.1, 0.1, 1, 4, 0, 0, 0, 0, 0, 0, 0.5, 10, 0.4, 0, 0, 0.1, 0],
};

function init() {
  const grid = document.getElementById("presets-grid");
  const customTextArea = document.getElementById("custom-params") as HTMLTextAreaElement;
  const playCustomBtn = document.getElementById("play-custom");
  const randomBtn = document.getElementById("random-gen");

  if (!grid || !customTextArea || !playCustomBtn || !randomBtn) return;

  // Render presets
  Object.entries(PRESETS).forEach(([name, params]) => {
    const card = document.createElement("div");
    card.className = "sound-card";
    
    const title = document.createElement("div");
    title.className = "title-md";
    title.textContent = name;
    
    const code = document.createElement("div");
    code.className = "sound-code";
    code.textContent = `zzfx(...[${params.join(", ")}])`;
    
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "PLAY";
    btn.onclick = () => {
      // @ts-ignore
      zzfx(...params);
      customTextArea.value = `[${params.join(", ")}]`;
    };
    
    card.appendChild(title);
    card.appendChild(code);
    card.appendChild(btn);
    grid.appendChild(card);
  });

  // Play custom
  playCustomBtn.onclick = () => {
    try {
      const val = customTextArea.value.trim();
      const params = JSON.parse(val);
      if (Array.isArray(params)) {
        // @ts-ignore
        zzfx(...params);
      } else {
        alert("Invalid format: Must be an array [v, r, f, ...]");
      }
    } catch (e) {
      alert("JSON Syntax Error: " + e);
    }
  };

  // Random generator
  randomBtn.onclick = () => {
    const randomParams = [
      1,                                  // volume
      Math.random() * 0.5,                // randomness
      Math.random() * 2000 + 20,          // frequency
      Math.random() * 0.5,                // attack
      Math.random() * 0.5,                // sustain
      Math.random() * 1.5,                // release
      Math.floor(Math.random() * 5),      // shape
      Math.random() * 2,                  // shapeCurve
      Math.random() * 20 - 10,            // slide
      Math.random() * 20 - 10,            // deltaSlide
      Math.random() * 400,                // pitchJump
      Math.random() * 0.1,                // pitchJumpTime
      Math.random() * 0.1,                // repeatTime
      Math.random() * 2,                  // noise
      Math.random() * 20,                 // modulation
      Math.random(),                      // bitCrush
      Math.random() * 0.5,                // delay
      Math.random() * 0.5,                // sustain
      Math.random() * 0.5,                // decay
      Math.random() * 0.2                 // tremolo
    ].map(n => Number(n.toFixed(3)));

    customTextArea.value = `[${randomParams.join(", ")}]`;
    // @ts-ignore
    zzfx(...randomParams);
  };
}

document.addEventListener("DOMContentLoaded", init);
