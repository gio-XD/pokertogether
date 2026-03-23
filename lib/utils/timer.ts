export class CountdownTimer {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private startTime = 0;
  private duration = 0;
  private onComplete: (() => void) | null = null;

  start(durationMs: number, onComplete: () => void): void {
    this.stop();
    this.duration = durationMs;
    this.startTime = Date.now();
    this.onComplete = onComplete;
    this.timerId = setTimeout(() => {
      this.onComplete?.();
      this.timerId = null;
    }, durationMs);
  }

  stop(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.onComplete = null;
  }

  getRemainingMs(): number {
    if (!this.timerId) return 0;
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.duration - elapsed);
  }

  isRunning(): boolean {
    return this.timerId !== null;
  }
}
