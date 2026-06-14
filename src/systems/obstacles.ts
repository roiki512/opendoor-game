import { TUNING } from '../config/tuning';
import type { Box } from './player';

// The shorts' arsenal — each enemy plays differently:
//  - 'wreckedHouse'  ground, static            -> JUMP
//  - 'bear'          ground, charges in fast   -> JUMP
//  - 'fud'           FUD report, bobs down/up  -> JUMP it low, slip UNDER it high
//  - 'crashChart'    tall red chart, static    -> too tall to jump, DUCK under
//  - 'flyingHouse'   rival, sharp zig-zag      -> JUMP it low, DUCK it high
//  - 'pit'           a "rug pull" gap in the floor -> JUMP across it (you fall
//    in if you're on the ground — standing or ducking — when it passes)
export type ObstacleKind =
  | 'wreckedHouse'
  | 'fud'
  | 'crashChart'
  | 'flyingHouse'
  | 'bear'
  | 'pit';

interface KindSpec {
  w: number;
  h: number;
  /** Gap between ground and the obstacle's bottom edge. */
  clearance: number;
  /** Extra horizontal speed on top of the scroll speed. */
  extraSpeed: number;
  /** Minimum difficulty tier (milestones passed) before this spawns. */
  minTier: number;
}

const SPECS: Record<ObstacleKind, KindSpec> = {
  wreckedHouse: { w: 38, h: 36, clearance: 0, extraSpeed: 0, minTier: 0 },
  // A FUD headline that bobs down and up (clearance via effClearance).
  fud: { w: 40, h: 26, clearance: 0, extraSpeed: 0, minTier: 0 },
  // A tall red crash-chart: its top sits above the jump apex (~112px) so it
  // can't be jumped — you must duck under the gap at its base. Anti jump-spam.
  crashChart: { w: 44, h: 86, clearance: 32, extraSpeed: 0, minTier: 1 },
  // Rival house — flies forward (extraSpeed) AND zig-zags vertically.
  flyingHouse: { w: 44, h: 30, clearance: 26, extraSpeed: 45, minTier: 1 },
  // Bears charge in from the very start — a bit fast (kept modest so they can
  // combo with other obstacles fairly), and they always bring company.
  bear: { w: 44, h: 34, clearance: 0, extraSpeed: 40, minTier: 0 },
  // A "rug pull" gap in the floor — collision is special (see game.ts): you
  // fall in if grounded as it passes. Unlocks later in the climb.
  pit: { w: 84, h: 10, clearance: 0, extraSpeed: 0, minTier: 4 },
};

// The bobbing FUD rides high so there's usually room to duck under it: clearance
// oscillates ~22 (duck) .. ~50 (slip under). It rarely drops to a jump.
const FUD_BASE = 36;
const FUD_AMP = 14;
const FUD_FREQ = 0.014;
// The rival's zig-zag, raised so ducking is more often an option. Triangle wave.
const ZIG_BASE = 34;
const ZIG_AMP = 18;
const ZIG_FREQ = 0.013;

/** Sharp triangle wave: period 2π, range [-1, 1]. */
function triWave(t: number): number {
  const u = t / (Math.PI * 2);
  const f = u - Math.floor(u + 0.5); // [-0.5, 0.5)
  return 4 * Math.abs(f) - 1;
}

export class Obstacle {
  x: number;
  kind: ObstacleKind;
  spin = Math.random() * Math.PI * 2;
  fleeing = false;
  /** Whether a bait booster has already been considered for this obstacle. */
  baitDone = false;
  /** Random phase so each FUD/rival's down-up rhythm is unpredictable. */
  private phase = Math.random() * Math.PI * 2;

  constructor(kind: ObstacleKind, x: number) {
    this.kind = kind;
    this.x = x;
  }

  get spec(): KindSpec {
    return SPECS[this.kind];
  }

  /** Bottom-edge clearance. FUD bobs; rival zig-zags. */
  get effClearance(): number {
    switch (this.kind) {
      case 'fud':
        return FUD_BASE + Math.sin(this.x * FUD_FREQ + this.phase) * FUD_AMP;
      case 'flyingHouse':
        return ZIG_BASE + triWave(this.x * ZIG_FREQ + this.phase) * ZIG_AMP;
      default:
        return SPECS[this.kind].clearance;
    }
  }
  /** A "high" obstacle must be ducked under (vs. a ground one you jump over). */
  get isHigh(): boolean {
    return SPECS[this.kind].clearance > 0;
  }

  update(dt: number, scrollSpeed: number) {
    const flee = this.fleeing ? -2.2 : 1; // squeeze: run back off-screen right
    this.x -= (scrollSpeed + this.spec.extraSpeed) * flee * dt;
    this.spin += dt * (this.kind === 'fud' ? 4 : 2);
  }

  /** AABB in screen space; groundY sampled at the obstacle's x. */
  hitbox(groundY: number): Box {
    const s = SPECS[this.kind];
    return {
      x: this.x - s.w / 2,
      y: groundY - this.effClearance - s.h,
      w: s.w,
      h: s.h,
    };
  }

  draw(ctx: CanvasRenderingContext2D, groundY: number) {
    const b = this.hitbox(groundY);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.save();

    switch (this.kind) {
      case 'wreckedHouse': {
        // A condemned, collapsing house — what the shorts think we are.
        ctx.translate(cx, b.y + b.h);
        ctx.rotate(-0.06); // slight derelict lean
        const w = b.w;
        const bodyH = b.h * 0.6;
        const roofH = b.h * 0.4;
        // Body (grimy grey)
        ctx.fillStyle = '#6e6a61';
        ctx.fillRect(-w / 2, -bodyH, w, bodyH);
        ctx.strokeStyle = '#2a2722';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -bodyH, w, bodyH);
        // Cracks
        ctx.strokeStyle = '#2a2722';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -bodyH);
        ctx.lineTo(-w * 0.18, -bodyH * 0.55);
        ctx.lineTo(-w * 0.3, -bodyH * 0.2);
        ctx.moveTo(w * 0.1, -bodyH * 0.8);
        ctx.lineTo(w * 0.22, -bodyH * 0.45);
        ctx.lineTo(w * 0.12, -bodyH * 0.1);
        ctx.stroke();
        // Collapsed, sagging roof (broken in the middle)
        ctx.fillStyle = '#473f36';
        ctx.beginPath();
        ctx.moveTo(-w / 2 - 4, -bodyH);
        ctx.lineTo(-w * 0.12, -bodyH - roofH);
        ctx.lineTo(0, -bodyH - roofH * 0.45); // caved-in notch
        ctx.lineTo(w * 0.15, -bodyH - roofH * 0.9);
        ctx.lineTo(w / 2 + 4, -bodyH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Boarded-up window (X planks)
        ctx.fillStyle = '#15181d';
        ctx.fillRect(-w * 0.08, -bodyH * 0.75, w * 0.34, bodyH * 0.45);
        ctx.strokeStyle = '#8a7a5c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-w * 0.08, -bodyH * 0.75);
        ctx.lineTo(w * 0.26, -bodyH * 0.3);
        ctx.moveTo(w * 0.26, -bodyH * 0.75);
        ctx.lineTo(-w * 0.08, -bodyH * 0.3);
        ctx.stroke();
        // Red X — condemned by the shorts
        ctx.strokeStyle = '#ff4646';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-w * 0.4, -bodyH * 0.7);
        ctx.lineTo(-w * 0.18, -bodyH * 0.3);
        ctx.moveTo(-w * 0.18, -bodyH * 0.7);
        ctx.lineTo(-w * 0.4, -bodyH * 0.3);
        ctx.stroke();
        break;
      }
      case 'fud': {
        // A FUD headline (newspaper) tumbling along at bob height.
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(this.spin) * 0.4);
        ctx.fillStyle = '#e8e4da';
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.strokeStyle = '#6b6f78';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.fillStyle = '#b03030';
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FUD', 0, -2);
        ctx.fillStyle = '#9aa0ab';
        ctx.fillRect(-b.w / 2 + 4, 4, b.w - 8, 2);
        ctx.fillRect(-b.w / 2 + 4, 9, b.w - 8, 2);
        break;
      }
      case 'crashChart': {
        // A tall red crashing chart you can't jump — duck under it.
        ctx.fillStyle = 'rgba(20, 8, 10, 0.85)';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#ff4646';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        const pts: [number, number][] = [
          [0.08, 0.1],
          [0.32, 0.32],
          [0.46, 0.22],
          [0.68, 0.58],
          [0.8, 0.46],
          [0.92, 0.9],
        ];
        ctx.strokeStyle = '#ff4646';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff4646';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(b.x + pts[0][0] * b.w, b.y + pts[0][1] * b.h);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(b.x + pts[i][0] * b.w, b.y + pts[i][1] * b.h);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        const ex = b.x + 0.92 * b.w;
        const ey = b.y + 0.9 * b.h;
        ctx.fillStyle = '#ff4646';
        ctx.beginPath();
        ctx.moveTo(ex + 2, ey + 2);
        ctx.lineTo(ex - 7, ey);
        ctx.lineTo(ex, ey - 7);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'bear': {
        // A bear-market grizzly charging LEFT toward the player — JUMP it.
        ctx.translate(cx, b.y + b.h); // origin at the bear's feet, center
        const w = b.w;
        const h = b.h;
        const fur = '#5a4636';
        const dark = '#2e231b';
        const outline = '#1a130d';
        const stride = Math.sin(this.spin * 3) * 3;

        ctx.lineJoin = 'round';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;

        // Hind leg (back, right) — drawn first so it sits behind the body
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.roundRect(w * 0.24 - stride, -h * 0.34, 11, h * 0.34, 3);
        ctx.fill();
        ctx.stroke();

        // Body: bulky torso with a pronounced shoulder hump toward the front
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.moveTo(w * 0.46, -h * 0.12); // rump, lower right
        ctx.quadraticCurveTo(w * 0.56, -h * 0.62, w * 0.18, -h * 0.74); // rump up to back
        ctx.quadraticCurveTo(-w * 0.06, -h * 0.92, -w * 0.22, -h * 0.66); // shoulder hump (front)
        ctx.quadraticCurveTo(-w * 0.4, -h * 0.5, -w * 0.34, -h * 0.16); // down the chest (front-left)
        ctx.quadraticCurveTo(-w * 0.1, -h * 0.04, w * 0.1, -h * 0.06); // belly
        ctx.quadraticCurveTo(w * 0.34, -h * 0.06, w * 0.46, -h * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head, low and forward (front-left)
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.arc(-w * 0.32, -h * 0.36, h * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Round ear
        ctx.beginPath();
        ctx.arc(-w * 0.2, -h * 0.6, h * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Muzzle/snout pointing left
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(-w * 0.5, -h * 0.3, w * 0.13, h * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Nose tip
        ctx.fillStyle = '#0b0805';
        ctx.beginPath();
        ctx.arc(-w * 0.6, -h * 0.31, 2.4, 0, Math.PI * 2);
        ctx.fill();

        // Angry brow + small red eye beneath it
        ctx.strokeStyle = '#0b0805';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.46, -h * 0.56);
        ctx.lineTo(-w * 0.3, -h * 0.48); // angled brow = scowl
        ctx.stroke();
        ctx.fillStyle = '#ff5a4d';
        ctx.beginPath();
        ctx.arc(-w * 0.4, -h * 0.45, 2.1, 0, Math.PI * 2);
        ctx.fill();

        // Foreleg (front, left) — drawn last, over the body
        ctx.fillStyle = '#46362a';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-w * 0.28 + stride, -h * 0.3, 11, h * 0.3, 3);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'pit': {
        // A "rug pull" chasm in the floor — jump across it.
        const top = b.y + b.h; // ground-line level
        const w = b.w;
        const depth = 58;
        ctx.fillStyle = '#04060c';
        ctx.fillRect(b.x, top, w, depth);
        // Torn red edges (the rug yanked out from under you)
        ctx.strokeStyle = '#ff4646';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff4646';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(b.x, top);
        ctx.lineTo(b.x - 4, top + 9);
        ctx.lineTo(b.x + 1, top + 18);
        ctx.lineTo(b.x - 3, top + 28);
        ctx.moveTo(b.x + w, top);
        ctx.lineTo(b.x + w + 4, top + 9);
        ctx.lineTo(b.x + w - 1, top + 18);
        ctx.lineTo(b.x + w + 3, top + 28);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Warning lip across the opening
        ctx.fillStyle = 'rgba(255, 70, 70, 0.55)';
        ctx.fillRect(b.x, top - 2, w, 3);
        // Down-chevrons hinting "gap"
        ctx.fillStyle = '#ff4646';
        for (let i = 0; i < 3; i++) {
          const dx = b.x + w * (0.3 + i * 0.2);
          ctx.beginPath();
          ctx.moveTo(dx - 5, top + 12);
          ctx.lineTo(dx + 5, top + 12);
          ctx.lineTo(dx, top + 19);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'flyingHouse': {
        // A rival house airlifted by rotors — sharp zig-zag up and down.
        const hx = b.x + 6;
        const hw = b.w - 12;
        const roofH = 9;
        const bodyY = b.y + roofH + 5;
        const bodyH = b.h - roofH - 5;
        // Rotors at the top of the box
        ctx.strokeStyle = '#9aa0ab';
        ctx.lineWidth = 2;
        const rotor = Math.abs(Math.sin(this.spin * 8)) * (b.w * 0.26) + 3;
        ctx.beginPath();
        ctx.moveTo(cx - rotor, b.y);
        ctx.lineTo(cx + rotor, b.y);
        ctx.moveTo(cx, b.y);
        ctx.lineTo(cx, b.y + 5);
        ctx.stroke();
        // Roof (red — it's the competition)
        ctx.fillStyle = '#b8232e';
        ctx.beginPath();
        ctx.moveTo(hx - 3, bodyY);
        ctx.lineTo(cx, b.y + 5);
        ctx.lineTo(hx + hw + 3, bodyY);
        ctx.closePath();
        ctx.fill();
        // Body
        ctx.fillStyle = '#d8cfc0';
        ctx.fillRect(hx, bodyY, hw, bodyH);
        ctx.strokeStyle = '#3a2a2a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx, bodyY, hw, bodyH);
        // Angry red window-eyes
        ctx.fillStyle = '#ff4646';
        ctx.fillRect(cx - 9, bodyY + 3, 5, 5);
        ctx.fillRect(cx + 4, bodyY + 3, 5, 5);
        break;
      }
    }
    ctx.restore();
  }
}

export class ObstacleSpawner {
  obstacles: Obstacle[] = [];
  private nextSpawnIn: number = TUNING.startGrace;
  /** First obstacle of a run never clusters — eases new players in. */
  private firstSpawnDone = false;
  /** Partners queued behind the last spawn (cluster / triple combo). */
  private queue: ObstacleKind[] = [];
  private pendingIn = 0;
  /** EARNINGS DAY volatility burst — combo-heavy while it lasts. */
  surgeTime = 0;

  reset() {
    this.obstacles = [];
    this.nextSpawnIn = TUNING.startGrace;
    this.firstSpawnDone = false;
    this.queue = [];
    this.pendingIn = 0;
    this.surgeTime = 0;
  }

  /** Kick off an EARNINGS DAY surge (a combo-dense burst). */
  startSurge(duration: number = TUNING.surgeDuration) {
    this.surgeTime = duration;
  }

  /**
   * @param progress milestones passed so far (uncapped — drives the endless
   *   difficulty creep past the configured roster).
   * @param totalTiers number of milestones in the roster.
   */
  update(
    dt: number,
    scrollSpeed: number,
    progress: number,
    totalTiers: number,
    pickupXs: number[] = []
  ) {
    if (this.surgeTime > 0) this.surgeTime -= dt;
    // Don't drop a tall crash chart right where a booster already is.
    const spawnX = TUNING.width + 80;
    const blockWall = pickupXs.some((px) => Math.abs(px - spawnX) < TUNING.pickupWallClear);

    for (const o of this.obstacles) o.update(dt, scrollSpeed);
    this.obstacles = this.obstacles.filter(
      (o) => o.x > -80 && o.x < TUNING.width + 600
    );

    const tier = Math.min(progress, totalTiers); // which kinds are unlocked
    // Ramp to full difficulty by ~60% of the roster, so the climb to $82 is a
    // real test rather than only heating up at the very end.
    const difficulty = Math.min(1, progress / Math.max(1, (totalTiers - 1) * 0.6));
    // Past the roster, keep creeping difficulty up so endless mode stays tense.
    const endless = Math.min(0.5, Math.max(0, progress - totalTiers) * 0.04);
    const surging = this.surgeTime > 0;

    // Release queued cluster partners first; hold the main timer until they're out.
    if (this.queue.length > 0) {
      this.pendingIn -= dt;
      if (this.pendingIn <= 0) {
        this.spawnKind(this.queue.shift()!);
        if (this.queue.length > 0) this.pendingIn = TUNING.clusterGap;
      }
      return;
    }

    this.nextSpawnIn -= dt;
    if (this.nextSpawnIn <= 0) {
      const primary = this.spawnRandom(tier, blockWall);
      const wasFirst = !this.firstSpawnDone;
      this.firstSpawnDone = true;

      // Bring complementary partner(s) -> jump<->duck (<->jump) combos. Surges
      // are nearly always combos. The first obstacle of a run never combos.
      let clusterChance = Math.min(0.8, TUNING.clusterChanceMax * difficulty + endless);
      if (surging) clusterChance = 0.97;

      // Bears are never standalone — they always charge in alongside something.
      const bearPrimary = primary.kind === 'bear';

      if (wasFirst) {
        // no combo on the very first obstacle
      } else if (bearPrimary && Math.random() < TUNING.bearPackChance) {
        // A charging pack: more bears the deeper you are (packs of 2-4).
        const extra =
          1 + (Math.random() < 0.45 + endless ? 1 : 0) + (Math.random() < endless ? 1 : 0);
        for (let i = 0; i < extra; i++) this.queue.push('bear');
        this.pendingIn = TUNING.clusterGap;
      } else if (bearPrimary || Math.random() < clusterChance) {
        let wantHigh = !primary.isHigh; // first partner is the opposite action
        const p1 = this.pickPartner(tier, wantHigh);
        if (p1) {
          this.queue.push(p1);
          // Longer jump-duck-jump(-duck) chains at higher difficulty / surges.
          let chain = (surging ? 0.7 : 0) + Math.min(0.7, difficulty * 0.5 + endless);
          while (Math.random() < chain && this.queue.length < 4) {
            wantHigh = !wantHigh;
            const pn = this.pickPartner(tier, wantHigh);
            if (!pn) break;
            this.queue.push(pn);
            chain *= 0.7; // each extra link is less likely
          }
          this.pendingIn = TUNING.clusterGap;
        }
      }

      // Interval shrinks as difficulty rises; jitter keeps it unpredictable.
      const base =
        TUNING.spawnIntervalStart -
        (TUNING.spawnIntervalStart - TUNING.spawnIntervalMin) * difficulty;
      const jitter = 1 + (Math.random() * 2 - 1) * TUNING.spawnJitter;
      // The minimum gap TIGHTENS as you speed up — otherwise a fixed-airtime
      // jump sails over the (speed-stretched) gaps and high speed feels easy.
      const speedRatio = scrollSpeed / TUNING.baseScroll;
      const floor = Math.max(
        TUNING.spawnFloorMin,
        TUNING.spawnFloorBase - (speedRatio - 1) * TUNING.spawnFloorSpeedDrop - endless * 0.06
      );
      const speedComp = Math.sqrt(speedRatio);
      this.nextSpawnIn = Math.max(floor, (base * jitter) / speedComp);
    }
  }

  /** Spawn a random unlocked obstacle (bears weighted heavier) and return it. */
  private spawnRandom(tier: number, blockWall = false): Obstacle {
    const kinds = (Object.keys(SPECS) as ObstacleKind[]).filter(
      (k) => SPECS[k].minTier <= tier && !(blockWall && k === 'crashChart')
    );
    const weights = kinds.map((k) => (k === 'bear' ? TUNING.bearWeight : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let kind = kinds[kinds.length - 1];
    for (let i = 0; i < kinds.length; i++) {
      r -= weights[i];
      if (r < 0) {
        kind = kinds[i];
        break;
      }
    }
    return this.spawnKind(kind);
  }

  private spawnKind(kind: ObstacleKind): Obstacle {
    const o = new Obstacle(kind, TUNING.width + 80);
    this.obstacles.push(o);
    return o;
  }

  /**
   * Pick a partner of the requested action category (high = duck, low = jump).
   * Steady-height kinds only (FUD/rival bob, so their action isn't predictable):
   * jump = wreckedHouse or bear (weighted), duck = crashChart.
   */
  private pickPartner(tier: number, wantHigh: boolean): ObstacleKind | null {
    const kinds = (Object.keys(SPECS) as ObstacleKind[]).filter(
      (k) =>
        SPECS[k].minTier <= tier &&
        k !== 'fud' &&
        k !== 'flyingHouse' &&
        k !== 'pit' &&
        SPECS[k].clearance > 0 === wantHigh
    );
    if (kinds.length === 0) return null;
    const weights = kinds.map((k) => (k === 'bear' ? TUNING.bearWeight : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < kinds.length; i++) {
      r -= weights[i];
      if (r < 0) return kinds[i];
    }
    return kinds[kinds.length - 1];
  }
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Draw a static obstacle sprite centered at (x, y) — for menus / how-to-play. */
export function drawObstacleIcon(
  ctx: CanvasRenderingContext2D,
  kind: ObstacleKind,
  x: number,
  y: number,
  scale = 1
) {
  const o = new Obstacle(kind, 0);
  o.spin = 0; // freeze the animation for a clean still
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  o.draw(ctx, o.effClearance + SPECS[kind].h / 2); // center the sprite on the origin
  ctx.restore();
}
