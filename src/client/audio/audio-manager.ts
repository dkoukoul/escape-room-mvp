// ============================================================
// Audio Manager — Web Audio API wrapper for SFX
// ============================================================

let audioContext: AudioContext | null = null;
let backgroundMusicSource: AudioBufferSourceNode | null = null;
let backgroundMusicGain: GainNode | null = null;
let isMuted = localStorage.getItem("odyssey_muted") === "true";

const rawBuffers = new Map<string, ArrayBuffer>();
const audioBuffers = new Map<string, AudioBuffer>();
const ASSETS_PATH = "/assets/audio/";
import { zzfx } from "zzfx";

/**
 * Get or create the audio context
 */
function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Resume audio context if suspended (browser autoplay policy)
 */
export async function resumeContext(): Promise<void> {
  const ctx = getContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  // Defer decoding until we have a context and a user gesture
  for (const [name, buffer] of rawBuffers.entries()) {
    if (!audioBuffers.has(name)) {
      try {
        // Use a slice to avoid neutering the buffer in the map
        const decoded = await ctx.decodeAudioData(buffer.slice(0));
        audioBuffers.set(name, decoded);
        console.log(`[Audio] Decoded on resume: ${name}`);
      } catch (err) {
        console.warn(`[Audio] Failed to decode ${name} on resume:`, err);
      }
    }
  }
}

/**
 * Load an audio file into the buffer cache
 */
export async function loadSound(nameOrUrl: string, name?: string): Promise<void> {
  const soundName = name ?? nameOrUrl;
  if (audioBuffers.has(soundName) || rawBuffers.has(soundName)) return;

  const fullUrl = nameOrUrl.startsWith("/") || nameOrUrl.startsWith("http") 
    ? nameOrUrl 
    : `${ASSETS_PATH}${nameOrUrl}`;
    
  try {
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    
    // Store raw buffer for later decoding
    rawBuffers.set(soundName, arrayBuffer);
    console.log(`[Audio] Fetched: ${soundName}`);

    // If context is already active, decode immediately
    if (audioContext && audioContext.state === "running") {
      const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      audioBuffers.set(soundName, decoded);
    }
  } catch (err) {
    console.warn(`[Audio] Could not load: ${soundName} from ${fullUrl}`, err);
  }
}

/**
 * Play a loaded sound effect
 */
export async function playSound(name: string, volume: number = 1.0): Promise<void> {
  await resumeContext();
  const ctx = getContext();
  
  const buffer = audioBuffers.get(name);
  if (!buffer) {
    console.warn(`[Audio] Sound not loaded or decoded: ${name}`);
    return;
  }

  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = buffer;
  gainNode.gain.value = volume;

  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(0);
}

/**
 * Generate a simple procedural beep/glitch sound
 */
export async function playGlitchHit(): Promise<void> {
  await resumeContext();
  const ctx = getContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

/**
 * Generate a success chime
 */
export async function playSuccess(): Promise<void> {
  await resumeContext();
  const ctx = getContext();

  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    const startTime = ctx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

/**
 * Generate a failure buzz
 */
export async function playFail(): Promise<void> {
  await resumeContext();
  const ctx = getContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(100, ctx.currentTime);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

/**
 * Play a tick sound (for timer)
 */
export async function playTick(): Promise<void> {
  await resumeContext();
  const ctx = getContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = 880;

  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

/**
 * Play unique zzfx sounds for puzzle briefings
 */
export async function playBriefingIntro(puzzleIndex: number): Promise<void> {
  await resumeContext();
  
  switch (puzzleIndex) {
    case 0:
      // High tech beep / power up
      zzfx(1, 0.05, 1000, 0.05, 0.1, 0.3, 1, 1.5, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      // Mission intro narration
      playSound("level-01-briefing.mp3");
      break;
    case 1:
      // Low sweep
      zzfx(1, 0.1, 150, 0.3, 0.3, 0.6, 0, 1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      break;
    case 2:
      // Glitchy burst
      zzfx(1, 0.5, 200, 0.01, 0.1, 0.2, 3, 1, -5, 0, 0, 0, 0, 1, 0, 0.4, 0, 0, 0, 0);
      break;
    case 3:
      // Data scan
      zzfx(1, 0.05, 600, 0.1, 0.1, 0.4, 2, 1.5, 10, 0, 10, 0.1, 0, 0, 0, 0, 0, 0, 0, 0);
      break;
    case 4:
      // Final warning / heavy synth
      zzfx(1, 0.1, 80, 0.2, 0.4, 1.5, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      break;
    default:
      // Generic transmission
      zzfx(1, 0.05, 400, 0.1, 0.1, 0.3, 1, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}

/**
 * Play a typewriter click sound
 */
export async function playTypewriterClick(): Promise<void> {
  await resumeContext();
  // zzfx(...) - quick mechanical click
  // volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustain, decay, tremolo
  zzfx(0.4, 0.1, 900 + Math.random() * 300, 0, 0.01, 0.01, 1, 0.3, 0, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0, 0);
}

let currentMusicName: string | null = null;

/**
 * Play continuous background music
 */
export async function playBackgroundMusic(name: string, volume: number = 0.4): Promise<void> {
  if (currentMusicName === name && backgroundMusicSource) return;

  await resumeContext();
  const ctx = getContext();

  let buffer = audioBuffers.get(name);
  if (!buffer) {
    console.log(`[Audio] Music not in cache, loading: ${name}`);
    await loadSound(name);
    buffer = audioBuffers.get(name);
  }

  if (!buffer) {
    console.warn(`[Audio] Failed to load background music: ${name}`);
    return;
  }

  // Stop existing if any
  stopBackgroundMusic();

  backgroundMusicSource = ctx.createBufferSource();
  backgroundMusicGain = ctx.createGain();

  backgroundMusicSource.buffer = buffer;
  backgroundMusicSource.loop = true;
  backgroundMusicGain.gain.value = isMuted ? 0 : volume;

  backgroundMusicSource.connect(backgroundMusicGain);
  backgroundMusicGain.connect(ctx.destination);
  backgroundMusicSource.start(0);

  currentMusicName = name;
  console.log(`[Audio] Started BGM: ${name}`);
}

/**
 * Stop background music
 */
export function stopBackgroundMusic(): void {
  if (backgroundMusicSource) {
    try {
      backgroundMusicSource.stop();
    } catch (e) {}
    backgroundMusicSource = null;
  }
}

/**
 * Toggle global mute state
 */
export function toggleMute(): boolean {
  isMuted = !isMuted;
  localStorage.setItem("odyssey_muted", String(isMuted));

  if (backgroundMusicGain) {
    backgroundMusicGain.gain.setTargetAtTime(isMuted ? 0 : 0.4, getContext().currentTime, 0.1);
  }

  return isMuted;
}

/**
 * Get current mute state
 */
export function getMuteState(): boolean {
  return isMuted;
}

/**
 * Preload all level-specific audio cues
 */
export async function preloadLevelAudio(audioCues: Record<string, string | undefined>): Promise<void> {
  const cues = Object.entries(audioCues)
    .filter(([_, url]) => !!url) as [string, string][];
    
  // Load based on the value (URL/Path) but cache it as the value (the filename/path)
  // because that's what playSound("file.mp3") expects
  await Promise.allSettled(cues.map(([_, url]) => loadSound(url)));
}

/**
 * Preload common SFX
 */
export async function preloadSounds(): Promise<void> {
  const sounds = [
    "puzzle_start.mp3",
    "puzzle_success.mp3",
    "error.mp3",
    "switch_fail.mp3",
    "game_over.mp3",
  ];

  await Promise.allSettled(sounds.map((s) => loadSound(s)));
}
/**
 * Play a sound and return a promise that resolves when it finishes
 */
export async function playAudioFile(name: string, volume: number = 1.0): Promise<void> {
  await resumeContext();
  const ctx = getContext();
  
  const buffer = audioBuffers.get(name);
  if (!buffer) {
    console.warn(`[Audio] Sound not loaded or decoded: ${name}`);
    return;
  }

  return new Promise((resolve) => {
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.onended = () => {
      resolve();
    };

    source.start(0);
  });
}
