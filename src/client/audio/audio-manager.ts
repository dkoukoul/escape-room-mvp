// ============================================================
// Audio Manager — Web Audio API wrapper for SFX
// ============================================================

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
const audioBuffers = new Map<string, AudioBuffer>();
const ASSETS_PATH = "/assets/sfx/";

/**
 * Load an audio file into the buffer cache
 */
export async function loadSound(name: string, url?: string): Promise<void> {
  if (audioBuffers.has(name)) return;

  const fullUrl = url ?? `${ASSETS_PATH}${name}`;
  try {
    const response = await fetch(fullUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers.set(name, audioBuffer);
    console.log(`[Audio] Loaded: ${name}`);
  } catch (err) {
    // Audio files may not exist yet — that's OK for MVP
    console.warn(`[Audio] Could not load: ${name}`, err);
  }
}

/**
 * Play a loaded sound effect
 */
export function playSound(name: string, volume: number = 1.0): void {
  const buffer = audioBuffers.get(name);
  if (!buffer) {
    console.warn(`[Audio] Sound not loaded: ${name}`);
    return;
  }

  // Resume context if suspended (browser autoplay policy)
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();

  source.buffer = buffer;
  gainNode.gain.value = volume;

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start(0);
}

/**
 * Generate a simple procedural beep/glitch sound
 */
export function playGlitchHit(): void {
  if (audioContext.state === "suspended") audioContext.resume();

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.15);

  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + 0.2);
}

/**
 * Generate a success chime
 */
export function playSuccess(): void {
  if (audioContext.state === "suspended") audioContext.resume();

  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    const startTime = audioContext.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

/**
 * Generate a failure buzz
 */
export function playFail(): void {
  if (audioContext.state === "suspended") audioContext.resume();

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(100, audioContext.currentTime);

  gain.gain.setValueAtTime(0.2, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + 0.3);
}

/**
 * Play a tick sound (for timer)
 */
export function playTick(): void {
  if (audioContext.state === "suspended") audioContext.resume();

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "sine";
  osc.frequency.value = 880;

  gain.gain.setValueAtTime(0.05, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + 0.05);
}

/**
 * Preload common SFX
 */
export async function preloadSounds(): Promise<void> {
  const sounds = [
    "puzzle_start.mp3",
    "puzzle_success.mp3",
    "letter_miss.mp3",
    "switch_fail.mp3",
    "piece_wrong.mp3",
    "glitch_warning.mp3",
    "mission_victory.mp3",
    "mission_defeat.mp3",
    "athena_welcome.mp3",
  ];

  // Load in parallel — failures are silent (files may not exist yet)
  await Promise.allSettled(sounds.map((s) => loadSound(s)));
}
