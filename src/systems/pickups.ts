import { TUNING } from '../config/tuning';
import type { Box } from './player';

// Collectibles floating along the path:
//  - 'rocket' (🚀, rare)          -> short speed boost + shield
//  - 'logo'   (Opendoor open-door) -> instant price bump
// They float at jump height so you grab them mid-air — risk vs. reward.

export type PickupKind = 'rocket' | 'logo';

const ROCKET_SIZE = 26;
const LOGO_W = 22;
const LOGO_H = 26;

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
    const w = this.kind === 'rocket' ? ROCKET_SIZE : LOGO_W;
    const h = this.kind === 'rocket' ? ROCKET_SIZE : LOGO_H;
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

    if (this.kind === 'rocket') {
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
      // Opendoor open-door logo: blue door frame, panel swung open,
      // light spilling out of the doorway.
      const breathe = 1 + Math.sin(this.spin * 0.9) * 0.07;
      ctx.scale(breathe, breathe);
      ctx.shadowColor = '#1c85e8';
      ctx.shadowBlur = 14;
      // Glowing doorway
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(-LOGO_W / 2, -LOGO_H / 2, LOGO_W, LOGO_H);
      // Frame
      ctx.strokeStyle = '#1c85e8';
      ctx.lineWidth = 3;
      ctx.strokeRect(-LOGO_W / 2, -LOGO_H / 2, LOGO_W, LOGO_H);
      // Door panel swung open (toward the viewer-left)
      ctx.fillStyle = '#1c85e8';
      ctx.beginPath();
      ctx.moveTo(-LOGO_W / 2, -LOGO_H / 2);
      ctx.lineTo(-LOGO_W / 2 - 9, -LOGO_H / 2 + 6);
      ctx.lineTo(-LOGO_W / 2 - 9, LOGO_H / 2 + 6);
      ctx.lineTo(-LOGO_W / 2, LOGO_H / 2);
      ctx.closePath();
      ctx.fill();
      // Knob
      ctx.fillStyle = '#0a1322';
      ctx.fillRect(-LOGO_W / 2 - 7, 1, 2.5, 2.5);
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
      // Rockets are the rare one; logos are the common drop.
      const kind: PickupKind = Math.random() < TUNING.rocketChance ? 'rocket' : 'logo';
      this.pickups.push(new Pickup(TUNING.width + 60, kind));
      this.nextSpawnIn =
        TUNING.pickupIntervalMin +
        Math.random() * (TUNING.pickupIntervalMax - TUNING.pickupIntervalMin);
    }
  }
}
