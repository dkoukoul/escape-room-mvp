// ============================================================
// Timer — Server-authoritative countdown
// ============================================================

import type { TimerState } from "../../../shared/types.ts";

export type TimerCallback = (timer: TimerState) => void;

export class GameTimer {
  private state: TimerState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onTick: TimerCallback;
  private onExpire: TimerCallback;

  constructor(
    totalSeconds: number,
    onTick: TimerCallback,
    onExpire: TimerCallback
  ) {
    this.state = {
      totalSeconds,
      remainingSeconds: totalSeconds,
      running: false,
    };
    this.onTick = onTick;
    this.onExpire = onExpire;
  }

  start(): void {
    if (this.state.running) return;
    this.state.running = true;

    this.intervalId = setInterval(() => {
      this.state.remainingSeconds--;
      this.onTick({ ...this.state });

      if (this.state.remainingSeconds <= 0) {
        this.stop();
        this.onExpire({ ...this.state });
      }
    }, 1000);

    console.log(`[Timer] Started: ${this.state.totalSeconds}s`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.state.running = false;
  }

  pause(): void {
    this.stop();
    console.log(`[Timer] Paused at ${this.state.remainingSeconds}s`);
  }

  resume(): void {
    this.start();
    console.log(`[Timer] Resumed at ${this.state.remainingSeconds}s`);
  }

  getState(): TimerState {
    return { ...this.state };
  }

  getRemainingSeconds(): number {
    return this.state.remainingSeconds;
  }

  setRemainingSeconds(seconds: number): void {
    this.state.remainingSeconds = seconds;
  }

  destroy(): void {
    this.stop();
  }
}
