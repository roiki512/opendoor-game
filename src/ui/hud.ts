import { TUNING } from '../config/tuning';
import { formatPrice } from '../systems/price';
import type { Milestone } from '../config/milestones';

const MONO = '"Courier New", monospace';

export interface HudState {
  price: number;
  peak: number;
  lives: number;
  speedMultiplier: number;
  momentum: number;
  nextMilestone: Milestone | null;
  muted: boolean;
  crashing: boolean;
}

export const MUTE_BUTTON = { x: TUNING.width - 44, y: 8, w: 36, h: 30 };

export function drawHud(ctx: CanvasRenderingContext2D, s: HudState) {
  const W = TUNING.width;

  // ---- Price readout (top-left) ----
  ctx.font = `bold 40px ${MONO}`;
  ctx.fillStyle = s.crashing ? '#ff5050' : '#37d67a';
  ctx.shadowColor = ctx.fillStyle as string;
  ctx.shadowBlur = 12;
  ctx.fillText(formatPrice(s.price), 16, 48);
  ctx.shadowBlur = 0;

  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = 'rgba(150, 190, 230, 0.7)';
  const goal =
    s.price < TUNING.athPrice ? `ATH $${TUNING.athPrice}` : 'BEYOND ALL-TIME HIGH 🚀';
  ctx.fillText(`PEAK ${formatPrice(s.peak)}   •   ${goal}`, 18, 68);

  // Progress to next milestone
  if (s.nextMilestone) {
    const barW = 170;
    ctx.fillStyle = 'rgba(40, 60, 90, 0.6)';
    ctx.fillRect(18, 78, barW, 7);
    // Log-scale progress from start (or previous look) to next milestone
    const span = Math.log(s.nextMilestone.price) - Math.log(TUNING.startPrice);
    const done = Math.log(s.price) - Math.log(TUNING.startPrice);
    const frac = Math.max(0, Math.min(1, done / span));
    ctx.fillStyle = s.nextMilestone.tint;
    ctx.fillRect(18, 78, barW * frac, 7);
    ctx.fillStyle = 'rgba(150, 190, 230, 0.7)';
    ctx.font = `10px ${MONO}`;
    ctx.fillText(
      `NEXT: ${s.nextMilestone.name} @ $${s.nextMilestone.price}`,
      18 + barW + 8,
      85
    );
  }

  // ---- Lives: earnings-report documents (top-right, before mute) ----
  ctx.font = `10px ${MONO}`;
  for (let i = 0; i < TUNING.maxLives; i++) {
    const x = W - 150 + i * 32;
    const y = 14;
    const alive = i < s.lives;
    ctx.globalAlpha = alive ? 1 : 0.22;
    // Document
    ctx.fillStyle = '#e8e4da';
    ctx.fillRect(x, y, 20, 26);
    ctx.strokeStyle = '#26354a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, 20, 26);
    // "ER" header + chart squiggle
    ctx.fillStyle = '#26354a';
    ctx.fillText('ER', x + 4, y + 9);
    ctx.strokeStyle = alive ? '#37d67a' : '#ff4646';
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 20);
    ctx.lineTo(x + 8, y + 16);
    ctx.lineTo(x + 12, y + 19);
    ctx.lineTo(x + 17, y + 13);
    ctx.stroke();
    if (!alive) {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#ff4646';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 2);
      ctx.lineTo(x + 22, y + 28);
      ctx.moveTo(x + 22, y - 2);
      ctx.lineTo(x - 2, y + 28);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---- Speed meter (bottom-left, above ticker) ----
  const speedText = `FASTER ×${s.speedMultiplier.toFixed(2)}`;
  ctx.font = `bold 16px ${MONO}`;
  ctx.fillStyle = '#ffb13d';
  ctx.fillText(speedText, 16, TUNING.height - 38);
  // Momentum bar
  ctx.fillStyle = 'rgba(40, 60, 90, 0.6)';
  ctx.fillRect(16, TUNING.height - 56, 120, 6);
  ctx.fillStyle = '#39c2ff';
  ctx.fillRect(16, TUNING.height - 56, 120 * s.momentum, 6);
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = 'rgba(150, 190, 230, 0.7)';
  ctx.fillText('MOMENTUM', 142, TUNING.height - 51);

  // ---- Mute button ----
  drawMuteButton(ctx, s.muted);
}

export function drawMuteButton(ctx: CanvasRenderingContext2D, muted: boolean) {
  const b = MUTE_BUTTON;
  ctx.fillStyle = 'rgba(20, 32, 50, 0.8)';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = 'rgba(120, 170, 220, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  // Speaker icon
  const cx = b.x + b.w / 2 - 4;
  const cy = b.y + b.h / 2;
  ctx.fillStyle = muted ? 'rgba(150, 190, 230, 0.4)' : '#5fa8d8';
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 3);
  ctx.lineTo(cx - 1, cy - 3);
  ctx.lineTo(cx + 4, cy - 8);
  ctx.lineTo(cx + 4, cy + 8);
  ctx.lineTo(cx - 1, cy + 3);
  ctx.lineTo(cx - 5, cy + 3);
  ctx.closePath();
  ctx.fill();
  if (muted) {
    ctx.strokeStyle = '#ff4646';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy - 5);
    ctx.lineTo(cx + 13, cy + 5);
    ctx.moveTo(cx + 13, cy - 5);
    ctx.lineTo(cx + 7, cy + 5);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#5fa8d8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 7, cy, 5, -0.9, 0.9);
    ctx.stroke();
  }
}
