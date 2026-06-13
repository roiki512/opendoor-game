import { TUNING } from './config/tuning';
import { MILESTONES, type Milestone } from './config/milestones';
import { Input } from './input';
import { Sound } from './audio';
import { PriceSystem, formatPrice } from './systems/price';
import { Chart } from './systems/background';
import { Player } from './systems/player';
import { ObstacleSpawner, boxesOverlap } from './systems/obstacles';
import { PickupSpawner } from './systems/pickups';
import { Particles } from './systems/particles';
import { drawHud, MUTE_BUTTON } from './ui/hud';
import {
  drawTitle,
  drawGameOver,
  drawMilestoneBanner,
  drawPauseMenu,
  PAUSE_BUTTONS,
  SHARE_BUTTON,
} from './ui/screens';
import {
  loadLeaderboard,
  qualifies,
  addEntry,
  refreshRemote,
  isGlobal,
  type LeaderboardEntry,
} from './leaderboard';

const SHARE_URL = 'https://roiki512.github.io/opendoor-game/';

type State = 'title' | 'playing' | 'gameover';

const BANNER_DURATION = 2.6;

export class Game {
  private state: State = 'title';
  private stateTime = 0;

  private input: Input;
  private sound = new Sound();
  private price = new PriceSystem();
  private chart = new Chart();
  private player = new Player();
  private spawner = new ObstacleSpawner();
  private pickups = new PickupSpawner();
  private particles = new Particles();

  private lives = TUNING.maxLives;
  private speedMultiplier = 1;
  /** Boosts earned from milestones — each hit knocks the latest one off. */
  private boostStack: number[] = [];
  private nextMilestoneIdx = 0;
  private runTime = 0;
  private finalTime = 0;
  private banner: { milestone: Milestone; t: number } | null = null;
  private tint = '#37d67a';
  private tintStrength = 0;
  private shake = 0;
  private paused = false;
  /** Seconds left on a collected rocket's speed boost. */
  private rocketTime = 0;

  // Leaderboard / name entry
  private board: LeaderboardEntry[] = loadLeaderboard();
  private highlightIndex = -1;
  private enteringName = false;
  private nameEntryEl = document.getElementById('name-entry') as HTMLDivElement;
  private nameInputEl = document.getElementById('name-input') as HTMLInputElement;

  constructor(input: Input) {
    this.input = input;
    input.onFirstGesture = () => this.sound.unlock();
    this.player.feetY = this.chart.groundAt(this.player.x);

    // If a global board is configured, pull the standings in the background.
    void refreshRemote().then(() => {
      this.board = loadLeaderboard();
    });

    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if (e.code === 'KeyM') this.sound.toggleMute();
      if ((e.code === 'KeyP' || e.code === 'Escape') && this.state === 'playing') {
        this.paused = !this.paused;
        this.input.clear();
      }
      if (import.meta.env.DEV) this.debugKeys(e.code);
    });
    window.addEventListener('blur', () => {
      if (this.state === 'playing') this.paused = true;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.paused = true;
    });

    document.getElementById('name-submit')!.addEventListener('click', () => {
      this.submitName();
    });
    document.getElementById('name-skip')!.addEventListener('click', () => {
      this.skipName();
    });
    this.nameInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitName();
    });
  }

  private debugKeys(code: string) {
    if (this.state !== 'playing') return;
    if (code === 'Digit9') {
      // Warp to the next milestone price
      this.price.price = this.milestoneAt(this.nextMilestoneIdx).price;
    }
    if (code === 'Digit8') this.takeHit();
  }

  /** Returns true if the pointer press was consumed by UI. */
  pointerDown(x: number, y: number): boolean {
    const hit = (b: { x: number; y: number; w: number; h: number }) =>
      x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

    if (this.state === 'playing' && hit(MUTE_BUTTON)) {
      this.sound.toggleMute();
      return true;
    }
    if (this.state === 'playing' && this.paused) {
      if (hit(PAUSE_BUTTONS.resume)) {
        this.paused = false;
      } else if (hit(PAUSE_BUTTONS.restart)) {
        this.startRun();
      } else if (hit(PAUSE_BUTTONS.menu)) {
        this.goToTitle();
      }
      return true; // swallow stray taps while the menu is open
    }
    if (this.state === 'gameover' && !this.enteringName && hit(SHARE_BUTTON)) {
      this.shareScore();
      return true; // don't let the tap also restart the run
    }
    return false;
  }

  /** Open a pre-filled X/Twitter post bragging about this run's peak. */
  private shareScore() {
    const peak = formatPrice(this.price.peak);
    const text = `I ran $OPEN from $0.51 to ${peak} in "$OPEN: FASTER" 🏠⚡\n\nDodge the shorts, climb to the all-time high — can you beat me?`;
    const url =
      'https://twitter.com/intent/tweet?text=' +
      encodeURIComponent(text) +
      '&url=' +
      encodeURIComponent(SHARE_URL);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private goToTitle() {
    this.state = 'title';
    this.stateTime = 0;
    document.body.classList.remove('is-playing');
    this.paused = false;
    this.enteringName = false;
    this.nameEntryEl.classList.remove('visible');
    this.board = loadLeaderboard();
    // Re-pull the global board (in case others posted, or we just did).
    void refreshRemote().then(() => {
      this.board = loadLeaderboard();
    });
    this.spawner.reset();
    this.pickups.reset();
    this.particles.clear();
    this.input.clear();
  }

  private startRun() {
    this.state = 'playing';
    this.stateTime = 0;
    document.body.classList.add('is-playing');
    this.input.duckButtonHeld = false;
    this.price.reset();
    this.chart = new Chart();
    this.player.reset();
    this.player.feetY = this.chart.groundAt(this.player.x);
    this.spawner.reset();
    this.pickups.reset();
    this.particles.clear();
    this.lives = TUNING.maxLives;
    this.speedMultiplier = 1;
    this.boostStack = [];
    this.nextMilestoneIdx = 0;
    this.runTime = 0;
    this.banner = null;
    this.tintStrength = 0;
    this.shake = 0;
    this.paused = false;
    this.rocketTime = 0;
    this.highlightIndex = -1;
    this.enteringName = false;
    this.nameEntryEl.classList.remove('visible');
    this.input.clear();
  }

  /** Temporary multiplier while a rocket pickup is active. */
  private get rocketFactor(): number {
    return this.rocketTime > 0 ? TUNING.rocketBoostMult : 1;
  }

  private get scrollSpeed(): number {
    let s =
      TUNING.baseScroll *
      Math.pow(this.speedMultiplier, TUNING.scrollExponent) *
      this.rocketFactor;
    if (this.chart.crashing) s *= 0.8; // brief slowdown while the floor is down
    return Math.min(TUNING.maxScroll, s);
  }

  private takeHit() {
    if (this.player.invincibleTime > 0) return;
    if (this.player.shieldTime > 0) {
      this.player.shieldTime = 0;
      this.player.invincibleTime = 0.6;
      this.sound.shieldBlock();
      this.particles.floatText(this.player.x, this.player.feetY - 70, 'SHIELDED!', '#50dcff');
      return;
    }

    this.lives--;
    const lost = this.price.hit();
    // Each hit also knocks off the most recent speed boost.
    const lostBoost = this.boostStack.pop();
    if (lostBoost) {
      this.speedMultiplier /= lostBoost;
      this.particles.floatText(
        this.player.x - 30,
        this.player.feetY - 115,
        'BOOST LOST!',
        '#ffb13d'
      );
    }
    this.chart.onHit();
    this.player.invincibleTime = TUNING.invincibleTime;
    this.particles.crashBurst(this.player.x, this.player.feetY - 20);
    this.particles.floatText(
      this.player.x + 60,
      this.player.feetY - 90,
      `-$${lost.toFixed(2)}`,
      '#ff4646'
    );
    this.shake = 11;
    this.sound.hit();

    if (this.lives <= 0) this.endRun();
  }

  private endRun() {
    this.state = 'gameover';
    this.stateTime = 0;
    document.body.classList.remove('is-playing');
    this.input.duckButtonHeld = false;
    this.finalTime = this.runTime;
    this.input.clear();
    if (this.price.peak >= TUNING.athPrice) {
      // Founder mode: even the ending is a celebration.
      this.sound.victory();
      this.particles.confettiBurst(TUNING.width / 2, TUNING.height * 0.3, 120);
    } else {
      this.sound.gameOver();
    }

    this.board = loadLeaderboard();
    this.highlightIndex = -1;
    if (qualifies(this.price.peak)) {
      this.enteringName = true;
      this.nameEntryEl.classList.add('visible');
      this.nameInputEl.value = '';
      setTimeout(() => this.nameInputEl.focus(), 80);
    }
  }

  private submitName() {
    if (!this.enteringName) return;
    addEntry(this.nameInputEl.value, this.price.peak);
    this.goToTitle();
  }

  /** "RESTART" on the name modal: skip signing, back to the entry screen. */
  private skipName() {
    if (!this.enteringName) return;
    this.goToTitle();
  }

  /** Past the configured roster, every doubling is a fresh all-time high. */
  private milestoneAt(idx: number): Milestone {
    if (idx < MILESTONES.length) return MILESTONES[idx];
    const doublings = idx - MILESTONES.length + 1;
    const price = Math.round(TUNING.athPrice * Math.pow(2, doublings));
    return {
      price,
      name: 'NEW ALL-TIME HIGH',
      tagline: `$${price} — uncharted territory`,
      boost: 1.08,
      effect: 'none',
      tint: '#ffd84d',
    };
  }

  private checkMilestones() {
    let m = this.milestoneAt(this.nextMilestoneIdx);
    while (this.price.price >= m.price) {
      this.nextMilestoneIdx++;

      this.speedMultiplier *= m.boost;
      if (m.boost > 1) this.boostStack.push(m.boost);
      this.tint = m.tint;
      this.tintStrength = 1;
      this.banner = { milestone: m, t: 0 };
      this.sound.milestone();
      this.particles.confettiBurst(this.player.x, this.player.feetY - 40, 50);

      switch (m.effect) {
        case 'shield':
          this.player.shieldTime = TUNING.shieldDuration;
          break;
        case 'upgrade':
          this.player.upgraded = true;
          break;
        case 'squeeze':
          this.spawner.startSqueeze();
          break;
        case 'ath':
          // Breaking the all-time high deserves the full fanfare — and then
          // the run keeps going.
          this.sound.victory();
          this.particles.confettiBurst(TUNING.width / 2, TUNING.height * 0.3, 140);
          break;
      }

      m = this.milestoneAt(this.nextMilestoneIdx);
    }
  }

  update(dt: number) {
    this.stateTime += dt;

    switch (this.state) {
      case 'title':
        this.chart.update(dt, TUNING.baseScroll * 0.4);
        this.player.feetY = this.chart.groundAt(this.player.x);
        if (this.input.consumeAction()) this.startRun();
        break;

      case 'playing': {
        if (this.paused) {
          this.input.clear(); // the menu is button-driven
          return;
        }
        this.runTime += dt;
        this.rocketTime = Math.max(0, this.rocketTime - dt);
        this.player.boosting = this.rocketTime > 0;
        const scroll = this.scrollSpeed;

        this.price.update(dt);
        this.checkMilestones();

        this.chart.update(dt, scroll);

        if (this.input.consumeJump() && this.player.tryJump()) this.sound.jump();
        this.player.update(dt, this.chart.groundAt(this.player.x), this.input.duckHeld, scroll);

        this.spawner.update(dt, scroll, this.nextMilestoneIdx, MILESTONES.length);
        this.pickups.update(dt, scroll);

        // Collisions
        const pbox = this.player.hitbox();
        for (const o of this.spawner.obstacles) {
          if (o.fleeing) continue;
          if (boxesOverlap(pbox, o.hitbox(this.chart.groundAt(o.x)))) {
            this.takeHit();
            break;
          }
        }
        if (this.state !== 'playing') break; // the last hit ends the run

        for (const p of this.pickups.pickups) {
          if (boxesOverlap(pbox, p.hitbox(this.chart.groundAt(p.x)))) {
            p.collected = true;
            const py = this.chart.groundAt(p.x);
            if (p.kind === 'rocket') {
              this.player.shieldTime = Math.max(
                this.player.shieldTime,
                TUNING.pickupShieldTime
              );
              this.rocketTime = TUNING.rocketBoostTime;
              this.sound.pickup();
              this.particles.floatText(p.x, py - 90, '🚀 FASTER!', '#ffb13d');
            } else {
              const gained = this.price.bump(TUNING.pickupPriceBoost);
              this.sound.boostPickup();
              this.particles.floatText(p.x, py - 90, `+$${gained.toFixed(2)}`, '#39c2ff');
            }
            this.particles.confettiBurst(p.x, py - 60, 14);
          }
        }

        if (this.banner) {
          this.banner.t += dt;
          if (this.banner.t >= BANNER_DURATION) this.banner = null;
        }
        this.tintStrength = Math.max(0.45, this.tintStrength - dt * 0.4);
        if (this.nextMilestoneIdx === 0) this.tintStrength = 0;
        break;
      }

      case 'gameover':
        this.chart.update(dt, TUNING.baseScroll * 0.25);
        if (this.enteringName) {
          this.input.clear(); // typing/taps must not restart the run
        } else if (this.stateTime > 0.8 && this.input.consumeAction()) {
          this.startRun();
        }
        break;
    }

    this.particles.update(dt);
    this.shake = Math.max(0, this.shake - dt * 30);
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.shake > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake
      );
    }

    this.chart.drawBackdrop(ctx, this.tint, this.tintStrength);
    this.chart.drawAxis(ctx, this.price.price);
    this.chart.drawChartLine(ctx);

    for (const o of this.spawner.obstacles) o.draw(ctx, this.chart.groundAt(o.x));
    for (const p of this.pickups.pickups) p.draw(ctx, this.chart.groundAt(p.x));

    if (this.state === 'playing' || this.state === 'title') this.player.draw(ctx);
    this.particles.draw(ctx);
    this.chart.drawTicker(ctx);

    if (this.state === 'playing') {
      drawHud(ctx, {
        price: this.price.price,
        peak: this.price.peak,
        lives: this.lives,
        speedMultiplier: this.speedMultiplier * this.rocketFactor,
        momentum: this.price.momentum,
        nextMilestone: this.milestoneAt(this.nextMilestoneIdx),
        muted: this.sound.muted,
        crashing: this.chart.crashing,
      });
      if (this.banner) {
        drawMilestoneBanner(ctx, this.banner.milestone, this.banner.t / BANNER_DURATION);
      }
      if (this.paused) drawPauseMenu(ctx);
    } else if (this.state === 'title') {
      drawTitle(ctx, this.stateTime, this.board);
    } else if (this.state === 'gameover') {
      drawGameOver(
        ctx,
        this.stateTime,
        this.price.peak,
        this.finalTime,
        this.board,
        this.highlightIndex,
        this.enteringName,
        isGlobal()
      );
    }

    ctx.restore();
  }
}
