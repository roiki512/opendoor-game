import { TUNING } from './config/tuning';
import { MILESTONES, POST_ATH_MILESTONES, type Milestone } from './config/milestones';
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
  drawLeaderboardScreen,
  drawHowTo,
  PAUSE_BUTTONS,
  SHARE_BUTTON,
  TRY_AGAIN_BUTTON,
  TITLE_BUTTONS,
  BOARD_BACK_BUTTON,
  HOWTO_BACK_BUTTON,
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
  /** AI pills collected this run — every few steps the speed up. */
  private pillCount = 0;
  /** Seconds left on the temporary slowdown from the last hit. */
  private hitSlowTime = 0;
  private nextMilestoneIdx = 0;
  private runTime = 0;
  private finalTime = 0;
  private banner: { milestone: Milestone; t: number } | null = null;
  private tint = '#37d67a';
  private tintStrength = 0;
  private shake = 0;
  private paused = false;
  /** Leaderboard overlay open (from title or pause menu). */
  private viewingBoard = false;
  /** How-to-play overlay open (from the title menu). */
  private viewingHowTo = false;
  /** Seconds left on a collected rocket's speed boost. */
  private rocketTime = 0;
  /** Seconds left on a magnet's pull. */
  private magnetTime = 0;
  /** Countdown to the next EARNINGS DAY volatility surge. */
  private surgeTimer: number = TUNING.surgeFirst;

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
      if (this.viewingBoard || this.viewingHowTo) {
        if (e.code === 'Escape') {
          this.viewingBoard = false;
          this.viewingHowTo = false;
          this.input.clear();
        }
        return; // swallow everything else while an overlay is open
      }
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

    // Overlays sit on top of everything.
    if (this.viewingBoard) {
      if (hit(BOARD_BACK_BUTTON)) this.viewingBoard = false;
      return true; // swallow all other taps while it's open
    }
    if (this.viewingHowTo) {
      if (hit(HOWTO_BACK_BUTTON)) this.viewingHowTo = false;
      return true;
    }
    if (this.state === 'title') {
      if (hit(TITLE_BUTTONS.start)) this.startRun();
      else if (hit(TITLE_BUTTONS.howto)) this.viewingHowTo = true;
      else if (hit(TITLE_BUTTONS.leaderboard)) this.openBoard();
      return true; // the title is button-driven now
    }
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
    if (this.state === 'gameover' && !this.enteringName) {
      if (hit(SHARE_BUTTON)) {
        this.shareScore();
        return true; // don't let the tap also restart the run
      }
      if (hit(TRY_AGAIN_BUTTON)) {
        this.startRun();
        return true;
      }
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

  /** Open the leaderboard overlay and pull the freshest standings. */
  private openBoard() {
    this.viewingBoard = true;
    this.input.clear();
    void refreshRemote().then(() => {
      this.board = loadLeaderboard();
    });
  }

  private goToTitle() {
    this.state = 'title';
    this.stateTime = 0;
    this.viewingBoard = false;
    this.viewingHowTo = false;
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
    this.input.jumpButtonHeld = false;
    this.price.reset();
    this.chart = new Chart();
    this.player.reset();
    this.player.feetY = this.chart.groundAt(this.player.x);
    this.spawner.reset();
    this.pickups.reset();
    this.particles.clear();
    this.lives = TUNING.maxLives;
    this.speedMultiplier = 1;
    this.pillCount = 0;
    this.hitSlowTime = 0;
    this.nextMilestoneIdx = 0;
    this.runTime = 0;
    this.banner = null;
    this.tintStrength = 0;
    this.shake = 0;
    this.paused = false;
    this.rocketTime = 0;
    this.magnetTime = 0;
    this.surgeTimer = TUNING.surgeFirst;
    this.highlightIndex = -1;
    this.enteringName = false;
    this.nameEntryEl.classList.remove('visible');
    this.input.clear();
  }

  /** Temporary multiplier while a rocket pickup is active. */
  private get rocketFactor(): number {
    return this.rocketTime > 0 ? TUNING.rocketBoostMult : 1;
  }

  /**
   * Temporary slowdown after a hit that eases back to full. 1 = no penalty,
   * dips to hitSlowMult right after a hit and recovers over hitSlowRecover.
   */
  private get hitSlowFactor(): number {
    if (this.hitSlowTime <= 0) return 1;
    const p = this.hitSlowTime / TUNING.hitSlowRecover; // 1 just after hit -> 0
    return TUNING.hitSlowMult + (1 - TUNING.hitSlowMult) * (1 - p);
  }

  private get scrollSpeed(): number {
    let s =
      TUNING.baseScroll *
      Math.pow(this.speedMultiplier, TUNING.scrollExponent) *
      this.rocketFactor *
      this.hitSlowFactor;
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
    // A hit briefly slows the game; it eases back to full speed afterward
    // (the boosts you've earned are kept — only the pace dips temporarily).
    this.hitSlowTime = TUNING.hitSlowRecover;
    this.particles.floatText(
      this.player.x - 30,
      this.player.feetY - 115,
      'SLOWED!',
      '#ffb13d'
    );
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
    const { index } = addEntry(this.nameInputEl.value, this.price.peak);
    this.highlightIndex = index;
    this.board = loadLeaderboard();
    void refreshRemote().then(() => {
      this.board = loadLeaderboard();
    });
    this.finishNameEntry();
  }

  /** "SKIP" on the name modal: don't record, but still offer Share / Try again. */
  private skipName() {
    if (!this.enteringName) return;
    this.finishNameEntry();
  }

  /** Close the name modal and return to the game-over screen (Share / Try again). */
  private finishNameEntry() {
    this.enteringName = false;
    this.nameEntryEl.classList.remove('visible');
    this.stateTime = 0; // restart the gameover prompt timing / restart delay
    this.input.clear();
  }

  /**
   * Past the configured roster, every doubling is a new milestone — themed ones
   * from POST_ATH_MILESTONES while they last, then a generic all-time high.
   */
  private milestoneAt(idx: number): Milestone {
    if (idx < MILESTONES.length) return MILESTONES[idx];
    const doublings = idx - MILESTONES.length + 1;
    const price = Math.round(TUNING.athPrice * Math.pow(2, doublings));
    const themed = POST_ATH_MILESTONES[idx - MILESTONES.length];
    if (themed) return { ...themed, price };
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

      // Milestones are price achievements now — speed comes from AI pills, not
      // from milestones. They still celebrate and the $8 upgrade / $82 ATH fire.
      this.tint = m.tint;
      this.tintStrength = 1;
      this.banner = { milestone: m, t: 0 };
      this.sound.milestone();
      this.particles.confettiBurst(this.player.x, this.player.feetY - 40, 50);

      switch (m.effect) {
        case 'upgrade':
          this.player.upgraded = true;
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
        this.input.clear(); // the menu is button-driven; no press-any-key start
        break;

      case 'playing': {
        if (this.paused) {
          this.input.clear(); // the menu is button-driven
          return;
        }
        this.runTime += dt;
        this.rocketTime = Math.max(0, this.rocketTime - dt);
        this.magnetTime = Math.max(0, this.magnetTime - dt);
        this.hitSlowTime = Math.max(0, this.hitSlowTime - dt);
        this.player.boosting = this.rocketTime > 0;

        // EARNINGS DAY: periodic combo-dense volatility surges that escalate as
        // you climb — longer and more frequent the deeper you get.
        this.surgeTimer -= dt;
        if (this.surgeTimer <= 0) {
          const p = this.nextMilestoneIdx;
          this.spawner.startSurge(Math.min(9, TUNING.surgeDuration + p * 0.4));
          const interval = Math.max(11, TUNING.surgeInterval - p * 1.3);
          this.surgeTimer = interval + (Math.random() * 2 - 1) * TUNING.surgeIntervalJitter;
          this.particles.floatText(
            TUNING.width / 2,
            TUNING.height * 0.32,
            '📊 EARNINGS DAY — VOLATILITY!',
            '#ffb13d'
          );
          this.sound.boostPickup();
        }
        const scroll = this.scrollSpeed;

        this.price.update(dt);
        this.checkMilestones();

        this.chart.update(dt, scroll);

        if (this.input.consumeJump() && this.player.tryJump()) this.sound.jump();
        this.player.update(
          dt,
          this.chart.groundAt(this.player.x),
          this.input.duckHeld,
          scroll,
          this.input.jumpHeld
        );

        const pickupXs = this.pickups.pickups.map((p) => p.x);
        this.spawner.update(dt, scroll, this.nextMilestoneIdx, MILESTONES.length, pickupXs);
        // Keep boosters out of a tall crash chart's no-jump shadow (unreachable).
        const wallXs = this.spawner.obstacles
          .filter((o) => o.kind === 'crashChart')
          .map((o) => o.x);
        // Short-squeeze shields only start dropping once you've passed $34.
        this.pickups.update(dt, scroll, this.price.price >= 34, wallXs);
        // Backstop: drop any booster that still lands beside a chart while it's
        // still off the right edge (invisible to the player).
        for (const p of this.pickups.pickups) {
          if (p.collected || p.x < TUNING.width - 50) continue;
          if (wallXs.some((xo) => Math.abs(xo - p.x) < TUNING.pickupWallClear)) {
            p.collected = true;
          }
        }
        // "Bait" boosters: occasionally a pill floats right over a ground enemy —
        // tempting, but grabbing it means committing to a full jump by the hazard.
        for (const o of this.spawner.obstacles) {
          if (o.baitDone || o.x < TUNING.width + 50) continue;
          o.baitDone = true;
          if (
            (o.kind === 'bear' || o.kind === 'wreckedHouse') &&
            Math.random() < TUNING.baitChance
          ) {
            this.pickups.spawnBait(o.x);
          }
        }

        // Collisions. Obstacles are positioned against the player's own ground
        // height (they collide at the player's x anyway), so terrain bumps can
        // never shrink a duck gap below what a ducking player can clear.
        const pbox = this.player.hitbox();
        const collideGround = this.chart.groundAt(this.player.x);
        for (const o of this.spawner.obstacles) {
          if (o.fleeing) continue;
          if (o.kind === 'pit') {
            // Rug pull: you fall in only if you're on the ground as it passes.
            if (this.player.onGround && Math.abs(o.x - this.player.x) < o.w / 2 - 12) {
              this.takeHit();
              break;
            }
            continue;
          }
          if (boxesOverlap(pbox, o.hitbox(collideGround))) {
            this.takeHit();
            break;
          }
        }
        if (this.state !== 'playing') break; // the last hit ends the run

        // Magnet: drag nearby boosters in and line them up with the player.
        if (this.magnetTime > 0) {
          for (const p of this.pickups.pickups) {
            if (p.collected) continue;
            const dx = p.x - this.player.x;
            if (dx > 0 && dx < TUNING.magnetRange) {
              p.x -= TUNING.magnetPull * dt;
              p.altitude += (30 - p.altitude) * Math.min(1, 5 * dt);
            }
          }
        }

        for (const p of this.pickups.pickups) {
          if (boxesOverlap(pbox, p.hitbox(this.chart.groundAt(p.x)))) {
            p.collected = true;
            const py = this.chart.groundAt(p.x);
            if (p.kind === 'rocket') {
              // Pure speed burst now — no shield. Faster = riskier.
              this.rocketTime = TUNING.rocketBoostTime;
              this.sound.pickup();
              this.particles.floatText(p.x, py - 90, '🚀 FASTER!', '#ffb13d');
            } else if (p.kind === 'squeeze') {
              // Short squeeze = the only shield in the game now.
              this.player.shieldTime = TUNING.shieldDuration;
              this.sound.shieldBlock();
              this.particles.floatText(p.x, py - 90, '🛡 SHORT SQUEEZE!', '#50dcff');
            } else if (p.kind === 'magnet') {
              this.magnetTime = TUNING.magnetTime;
              this.sound.boostPickup();
              this.particles.floatText(p.x, py - 90, "🧲 KAZ'S TALENT MAGNET!", '#39c2ff');
            } else {
              // AI pill: a small price nudge, and every few pills steps up speed.
              const gained = this.price.bump(TUNING.pickupPriceBoost);
              this.pillCount++;
              if (this.pillCount % TUNING.pillsPerSpeedUp === 0) {
                this.speedMultiplier *= TUNING.pillSpeedStep;
                this.sound.faster();
                this.particles.floatText(p.x, py - 90, '⚡ FASTER!', '#ffd84d');
              } else {
                this.sound.boostPickup();
                this.particles.floatText(p.x, py - 90, `+$${gained.toFixed(2)}`, '#39c2ff');
              }
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

    this.chart.drawBackdrop(ctx, this.tint, this.tintStrength, this.price.price);
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
        speedMultiplier: this.speedMultiplier * this.rocketFactor * this.hitSlowFactor,
        pillProgress: this.pillCount % TUNING.pillsPerSpeedUp,
        pillsPerStep: TUNING.pillsPerSpeedUp,
        nextMilestone: this.milestoneAt(this.nextMilestoneIdx),
        muted: this.sound.muted,
        crashing: this.chart.crashing,
      });
      if (this.banner) {
        drawMilestoneBanner(ctx, this.banner.milestone, this.banner.t / BANNER_DURATION);
      }
      if (this.paused) drawPauseMenu(ctx);
    } else if (this.state === 'title') {
      drawTitle(ctx);
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

    if (this.viewingBoard) {
      drawLeaderboardScreen(ctx, this.board, isGlobal());
    }
    if (this.viewingHowTo) {
      drawHowTo(ctx);
    }

    ctx.restore();
  }
}
