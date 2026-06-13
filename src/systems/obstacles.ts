import { TUNING } from '../config/tuning';
import type { Box } from './player';

// The shorts' arsenal. Heights are relative to the ground line:
//  - 'wreckedHouse' and 'downGraph' sit on the ground -> must JUMP
//  - 'paper' and 'flyingHouse' fly high -> must DUCK (standing height 46
//    clips them, duck height 26 clears under their bottom edge at 34px)
export type ObstacleKind = 'wreckedHouse' | 'downGraph' | 'paper' | 'flyingHouse';

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
  downGraph: { w: 42, h: 22, clearance: 0, extraSpeed: 0, minTier: 0 },
  paper: { w: 40, h: 30, clearance: 34, extraSpeed: 0, minTier: 0 },
  flyingHouse: { w: 44, h: 30, clearance: 34, extraSpeed: 130, minTier: 1 },
};

export class Obstacle {
  x: number;
  kind: ObstacleKind;
  spin = Math.random() * Math.PI * 2;
  fleeing = false;

  constructor(kind: ObstacleKind, x: number) {
    this.kind = kind;
    this.x = x;
  }

  get spec(): KindSpec {
    return SPECS[this.kind];
  }

  update(dt: number, scrollSpeed: number) {
    const flee = this.fleeing ? -2.2 : 1; // squeeze: run back off-screen right
    this.x -= (scrollSpeed + this.spec.extraSpeed) * flee * dt;
    this.spin += dt * (this.kind === 'paper' ? 5 : 2);
  }

  /** AABB in screen space; groundY sampled at the obstacle's x. */
  hitbox(groundY: number): Box {
    const s = this.spec;
    const bob = this.kind === 'flyingHouse' ? Math.sin(this.spin) * 3 : 0;
    return {
      x: this.x - s.w / 2,
      y: groundY - s.clearance - s.h + bob,
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
      case 'downGraph': {
        // A little red stock chart trending down — the bears' favorite art.
        // Frame
        ctx.fillStyle = 'rgba(20, 8, 10, 0.85)';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#ff4646';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        // Declining line
        ctx.strokeStyle = '#ff4646';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff4646';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(b.x + 3, b.y + 4);
        ctx.lineTo(b.x + b.w * 0.3, b.y + 9);
        ctx.lineTo(b.x + b.w * 0.45, b.y + 6);
        ctx.lineTo(b.x + b.w * 0.7, b.y + 14);
        ctx.lineTo(b.x + b.w * 0.8, b.y + 11);
        ctx.lineTo(b.x + b.w - 3, b.y + b.h - 4);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Arrowhead at the end of the decline
        ctx.fillStyle = '#ff4646';
        ctx.beginPath();
        ctx.moveTo(b.x + b.w - 1, b.y + b.h - 1);
        ctx.lineTo(b.x + b.w - 9, b.y + b.h - 3);
        ctx.lineTo(b.x + b.w - 3, b.y + b.h - 9);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'paper': {
        // Tumbling FUD newspaper
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(this.spin) * 0.5);
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
      case 'flyingHouse': {
        // A rival house airlifted by rotors — flying competition.
        const bob = Math.sin(this.spin) * 3;
        ctx.translate(0, bob);
        const hx = b.x + 6;
        const hw = b.w - 12;
        const roofH = 9;
        const bodyY = b.y - bob + roofH + 5;
        const bodyH = b.h - roofH - 5;
        // Rotors
        ctx.strokeStyle = '#9aa0ab';
        ctx.lineWidth = 2;
        const rotor = Math.abs(Math.sin(this.spin * 8)) * (b.w * 0.26) + 3;
        ctx.beginPath();
        ctx.moveTo(cx - rotor, b.y - bob);
        ctx.lineTo(cx + rotor, b.y - bob);
        ctx.moveTo(cx, b.y - bob);
        ctx.lineTo(cx, b.y - bob + 5);
        ctx.stroke();
        // Roof (red — it's the competition)
        ctx.fillStyle = '#b8232e';
        ctx.beginPath();
        ctx.moveTo(hx - 3, bodyY);
        ctx.lineTo(cx, b.y - bob + 5);
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
  private nextSpawnIn = 2.5;
  squeezeTime = 0;

  reset() {
    this.obstacles = [];
    this.nextSpawnIn = 2.5;
    this.squeezeTime = 0;
  }

  startSqueeze() {
    this.squeezeTime = TUNING.squeezeDuration;
    for (const o of this.obstacles) o.fleeing = true;
  }

  update(dt: number, scrollSpeed: number, tier: number, totalTiers: number) {
    if (this.squeezeTime > 0) this.squeezeTime -= dt;

    for (const o of this.obstacles) o.update(dt, scrollSpeed);
    this.obstacles = this.obstacles.filter(
      (o) => o.x > -80 && o.x < TUNING.width + 600
    );

    if (this.squeezeTime > 0) return; // no spawns during the squeeze

    this.nextSpawnIn -= dt;
    if (this.nextSpawnIn <= 0) {
      this.spawn(tier);
      // Interval shrinks as difficulty rises; jitter keeps it unpredictable.
      const difficulty = Math.min(1, tier / Math.max(1, totalTiers - 1));
      const base =
        TUNING.spawnIntervalStart -
        (TUNING.spawnIntervalStart - TUNING.spawnIntervalMin) * difficulty;
      const jitter = 1 + (Math.random() * 2 - 1) * TUNING.spawnJitter;
      // Normalize by speed a little so high speed doesn't wall you in.
      const speedComp = Math.sqrt(scrollSpeed / TUNING.baseScroll);
      this.nextSpawnIn = Math.max(0.7, (base * jitter) / speedComp);
    }
  }

  private spawn(tier: number) {
    const kinds = (Object.keys(SPECS) as ObstacleKind[]).filter(
      (k) => SPECS[k].minTier <= tier
    );
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    this.obstacles.push(new Obstacle(kind, TUNING.width + 80));
  }
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
