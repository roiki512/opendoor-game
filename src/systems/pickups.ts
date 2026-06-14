import { TUNING } from '../config/tuning';
import type { Box } from './player';

// Collectibles floating along the path:
//  - 'pill'    ("AI pill" capsule) -> collect 3 to go one step FASTER
//  - 'rocket'  (🚀, uncommon)      -> short speed burst
//  - 'squeeze' (short squeeze, rare) -> a shield that absorbs one hit
// They float at jump height so you grab them mid-air — risk vs. reward.

export type PickupKind = 'rocket' | 'pill' | 'squeeze';

const ROCKET_SIZE = 26;
const PILL_W = 34;
const PILL_H = 18;
const SQUEEZE_SIZE = 28;

export class Pickup {
  x: number;
  kind: PickupKind;
  /** Height above the ground line. */
  altitude: number;
  spin = Math.random() * Math.PI * 2;
  collected = false;

  constructor(x: number, kind: PickupKind) {
    this.x = x;
    this.kind = kind;
    // Sometimes at running height, usually at jump height.
    this.altitude = Math.random() < 0.35 ? 30 : 65 + Math.random() * 35;
  }

  update(dt: number, scrollSpeed: number) {
    this.x -= scrollSpeed * dt;
    this.spin += dt * 3;
  }

  hitbox(groundY: number): Box {
    const bob = Math.sin(this.spin) * 4;
    const w = this.kind === 'rocket' ? ROCKET_SIZE : this.kind === 'squeeze' ? SQUEEZE_SIZE : PILL_W;
    const h = this.kind === 'rocket' ? ROCKET_SIZE : this.kind === 'squeeze' ? SQUEEZE_SIZE : PILL_H;
    // Generous grab box — picking up should feel easy
    return {
      x: this.x - w / 2 - 6,
      y: groundY - this.altitude - h / 2 - 8 + bob,
      w: w + 12,
      h: h + 16,
    };
  }

  draw(ctx: CanvasRenderingContext2D, groundY: number) {
    const bob = Math.sin(this.spin) * 4;
    const cx = this.x;
    const cy = groundY - this.altitude + bob;

    ctx.save();
    ctx.translate(cx, cy);

    if (this.kind === 'squeeze') {
      // "Short squeeze" — a glowing shield (the only source of a shield now).
      const s = SQUEEZE_SIZE;
      ctx.shadowColor = '#50dcff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#0e2b3a';
      ctx.strokeStyle = '#50dcff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(s * 0.42, -s * 0.3);
      ctx.lineTo(s * 0.42, s * 0.1);
      ctx.quadraticCurveTo(s * 0.42, s * 0.42, 0, s * 0.55);
      ctx.quadraticCurveTo(-s * 0.42, s * 0.42, -s * 0.42, s * 0.1);
      ctx.lineTo(-s * 0.42, -s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Up-arrow inside — the price gets squeezed UP
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#50dcff';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.26);
      ctx.lineTo(s * 0.22, s * 0.02);
      ctx.lineTo(s * 0.09, s * 0.02);
      ctx.lineTo(s * 0.09, s * 0.28);
      ctx.lineTo(-s * 0.09, s * 0.28);
      ctx.lineTo(-s * 0.09, s * 0.02);
      ctx.lineTo(-s * 0.22, s * 0.02);
      ctx.closePath();
      ctx.fill();
    } else if (this.kind === 'rocket') {
      // The real 🚀 — rendered as emoji text, with sparkle exhaust.
      ctx.rotate(Math.sin(this.spin * 0.7) * 0.18);
      ctx.shadowColor = '#ffb13d';
      ctx.shadowBlur = 14;
      ctx.font = `${ROCKET_SIZE}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚀', 0, 2);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      // Sparkle trail
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 216, 77, ${0.5 + Math.sin(this.spin * 4) * 0.3})`;
      ctx.fillRect(-ROCKET_SIZE * 0.8, ROCKET_SIZE * 0.45, 3, 3);
      ctx.fillRect(-ROCKET_SIZE * 0.62, ROCKET_SIZE * 0.6, 2.5, 2.5);
    } else {
      // "AI pill" capsule — a two-tone medicine pill with AI on it.
      const breathe = 1 + Math.sin(this.spin * 0.9) * 0.06;
      ctx.scale(breathe, breathe);
      ctx.rotate(-0.32 + Math.sin(this.spin * 0.7) * 0.08); // jaunty tilt
      const w = PILL_W;
      const h = PILL_H;
      const r = h / 2;
      ctx.shadowColor = '#39c2ff';
      ctx.shadowBlur = 14;

      // Capsule body, clipped so each half gets its own color
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, r);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#1c85e8'; // Opendoor blue half (left)
      ctx.fillRect(-w / 2, -h / 2, w / 2, h);
      ctx.fillStyle = '#eef6ff'; // white half (right)
      ctx.fillRect(0, -h / 2, w / 2, h);
      // Glossy highlight along the top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, 3);
      ctx.restore();

      // Seam + outline
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#0a3a66';
      ctx.lineWidth = 2;
      ctx.stroke(); // outline of the capsule path
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(0, h / 2);
      ctx.stroke();

      // "AI" lettering, half on each side for contrast
      ctx.font = `bold 11px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#eef6ff';
      ctx.fillText('A', -w * 0.25, 1);
      ctx.fillStyle = '#1c85e8';
      ctx.fillText('I', w * 0.25, 1);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }
}

/** Draw a static pickup sprite centered at (x, y) — for menus / how-to-play. */
export function drawPickupIcon(
  ctx: CanvasRenderingContext2D,
  kind: PickupKind,
  x: number,
  y: number,
  scale = 1
) {
  const p = new Pickup(0, kind);
  p.spin = 0;
  p.altitude = 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  p.draw(ctx, 0); // groundY 0 + altitude 0 -> centered on the local origin
  ctx.restore();
}

export class PickupSpawner {
  pickups: Pickup[] = [];
  private nextSpawnIn = 5;

  reset() {
    this.pickups = [];
    this.nextSpawnIn = 5;
  }

  update(dt: number, scrollSpeed: number) {
    for (const p of this.pickups) p.update(dt, scrollSpeed);
    this.pickups = this.pickups.filter((p) => p.x > -60 && !p.collected);

    this.nextSpawnIn -= dt;
    if (this.nextSpawnIn <= 0) {
      // Pills are the common drop (they drive speed); rockets uncommon; the
      // short-squeeze shield is rare.
      const r = Math.random();
      let kind: PickupKind = 'pill';
      if (r < TUNING.squeezeChance) kind = 'squeeze';
      else if (r < TUNING.squeezeChance + TUNING.rocketChance) kind = 'rocket';
      this.pickups.push(new Pickup(TUNING.width + 60, kind));
      this.nextSpawnIn =
        TUNING.pickupIntervalMin +
        Math.random() * (TUNING.pickupIntervalMax - TUNING.pickupIntervalMin);
    }
  }
}
