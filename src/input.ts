// Keyboard + touch input, exposed as simple game-facing signals:
//  - jumpPressed: edge-triggered (consumed once per press)
//  - duckHeld: level-triggered
//  - actionPressed: "any input" for menu screens
// Touch: tap = jump, swipe down + hold = duck.

const SWIPE_THRESHOLD = 26; // px downward to count as a duck swipe
const TAP_DECIDE_MS = 120; // how long we wait to disambiguate tap vs swipe

export class Input {
  private jumpQueued = false;
  private actionQueued = false;
  private keysDown = new Set<string>();

  private touchActive = false;
  private touchStartY = 0;
  private touchDucking = false;
  private touchTimer: number | null = null;

  /** Set by the game; lets the audio context unlock on first gesture. */
  onFirstGesture: (() => void) | null = null;
  /** Returns true if the touch hit a UI element (e.g. mute) and should not jump. */
  pointerGuard: ((clientX: number, clientY: number) => boolean) | null = null;
  private gestureSeen = false;

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // Typing in a form field (leaderboard name entry) is not game input.
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        e.preventDefault();
      }
      this.keysDown.add(e.code);
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.jumpQueued = true;
      }
      // M (mute) and P (pause) are control keys, not "press any key to start".
      if (e.code !== 'KeyM' && e.code !== 'KeyP') this.actionQueued = true;
      this.firstGesture();
    });
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));

    target.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        this.firstGesture();
        if (this.pointerGuard?.(e.touches[0].clientX, e.touches[0].clientY)) return;
        this.touchActive = true;
        this.touchDucking = false;
        this.touchStartY = e.touches[0].clientY;
        this.actionQueued = true;
        // Wait briefly: if the finger swipes down it's a duck, otherwise jump.
        this.touchTimer = window.setTimeout(() => {
          if (this.touchActive && !this.touchDucking) this.jumpQueued = true;
          this.touchTimer = null;
        }, TAP_DECIDE_MS);
      },
      { passive: false }
    );

    target.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        if (!this.touchActive || this.touchDucking) return;
        const dy = e.touches[0].clientY - this.touchStartY;
        if (dy > SWIPE_THRESHOLD) {
          this.touchDucking = true;
          if (this.touchTimer !== null) {
            clearTimeout(this.touchTimer);
            this.touchTimer = null;
          }
        }
      },
      { passive: false }
    );

    const endTouch = (e: Event) => {
      e.preventDefault();
      // A quick tap released before the decide-timer still jumps.
      if (this.touchTimer !== null) {
        clearTimeout(this.touchTimer);
        this.touchTimer = null;
        if (!this.touchDucking) this.jumpQueued = true;
      }
      this.touchActive = false;
      this.touchDucking = false;
    };
    target.addEventListener('touchend', endTouch, { passive: false });
    target.addEventListener('touchcancel', endTouch, { passive: false });
  }

  private firstGesture() {
    if (!this.gestureSeen) {
      this.gestureSeen = true;
      this.onFirstGesture?.();
    }
  }

  /** Edge-triggered jump; returns true once per press. */
  consumeJump(): boolean {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  /** Edge-triggered "any input" for title/restart screens. */
  consumeAction(): boolean {
    const a = this.actionQueued;
    this.actionQueued = false;
    return a;
  }

  get duckHeld(): boolean {
    return (
      this.keysDown.has('ArrowDown') ||
      this.keysDown.has('KeyS') ||
      (this.touchActive && this.touchDucking)
    );
  }

  isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  clear() {
    this.jumpQueued = false;
    this.actionQueued = false;
  }
}
