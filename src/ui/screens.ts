import { TUNING } from '../config/tuning';
import { formatPrice } from '../systems/price';
import type { Milestone } from '../config/milestones';
import type { LeaderboardEntry } from '../leaderboard';

const MONO = '"Courier New", monospace';
const W = TUNING.width;
const H = TUNING.height;

function dim(ctx: CanvasRenderingContext2D, alpha = 0.72) {
  ctx.fillStyle = `rgba(4, 7, 12, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function centered(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  size: number,
  color: string,
  glow = false,
  weight = 'bold'
) {
  ctx.font = `${weight} ${size}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
  }
  ctx.fillText(text, W / 2, y);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

export function drawTitle(
  ctx: CanvasRenderingContext2D,
  t: number,
  board: LeaderboardEntry[]
) {
  dim(ctx, 0.45);
  centered(ctx, '$OPEN', H * 0.24, 64, '#37d67a', true);
  centered(ctx, 'F A S T E R', H * 0.36, 34, '#ffd84d', true);
  centered(
    ctx,
    'From $0.51 rock bottom to $82 and beyond — how FAST can you go?',
    H * 0.48,
    15,
    '#c9d8ea'
  );
  centered(
    ctx,
    'SPACE / TAP = jump      ↓ / SWIPE DOWN = duck',
    H * 0.56,
    14,
    'rgba(150, 190, 230, 0.85)',
    false,
    ''
  );

  if (board.length > 0) {
    const top = board[0];
    centered(
      ctx,
      `👑 RECORD: ${top.name} — ${formatPrice(top.score)}`,
      H * 0.66,
      14,
      '#ffd84d'
    );
  }

  if (Math.floor(t * 1.6) % 2 === 0) {
    centered(ctx, '— PRESS ANY KEY OR TAP TO IPO —', H * 0.8, 16, '#f3eee4');
  }
}

// The ending depends on how far you got. Three tiers of glory.
function endingVariant(peak: number) {
  if (peak >= TUNING.athPrice) {
    return {
      line1: 'OPENDOOR 2.0',
      line2: 'FOUNDER MODE ACHIEVED',
      size2: 28,
      color: '#ffd84d',
      quote1: '"The shorts have left the chat.',
      quote2: 'Kaz says: keep shipping."',
    };
  }
  if (peak >= 10) {
    return {
      line1: 'NOT FAST',
      line2: 'ENOUGH...',
      size2: 36,
      color: '#ffb13d',
      quote1: '"Good run. But around here,',
      quote2: 'FASTER is a lifestyle."',
    };
  }
  return {
    line1: 'SHORT REPORT',
    line2: 'PUBLISHED',
    size2: 36,
    color: '#ff4646',
    quote1: '"Position closed. The shorts',
    quote2: 'got you... this time."',
  };
}

export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  t: number,
  peak: number,
  timeAlive: number,
  board: LeaderboardEntry[],
  highlightIndex: number,
  enteringName: boolean
) {
  dim(ctx, 0.82);
  const v = endingVariant(peak);

  // Left column: the verdict
  const lx = W * 0.27;
  ctx.textAlign = 'center';
  ctx.fillStyle = v.color;
  ctx.shadowColor = v.color;
  ctx.shadowBlur = 16;
  ctx.font = `bold 36px ${MONO}`;
  ctx.fillText(v.line1, lx, H * 0.2);
  ctx.font = `bold ${v.size2}px ${MONO}`;
  ctx.fillText(v.line2, lx, H * 0.28);
  ctx.shadowBlur = 0;
  ctx.font = `italic 13px ${MONO}`;
  ctx.fillStyle = '#c9d8ea';
  ctx.fillText(v.quote1, lx, H * 0.36);
  ctx.fillText(v.quote2, lx, H * 0.4);

  ctx.font = `bold 26px ${MONO}`;
  ctx.fillStyle = '#37d67a';
  ctx.shadowColor = '#37d67a';
  ctx.shadowBlur = 10;
  ctx.fillText(`PEAK ${formatPrice(peak)}`, lx, H * 0.52);
  ctx.shadowBlur = 0;
  ctx.font = `15px ${MONO}`;
  ctx.fillStyle = '#5fa8d8';
  ctx.fillText(`TIME IN MARKET ${fmtTime(timeAlive)}`, lx, H * 0.58);

  if (highlightIndex >= 0) {
    ctx.font = `bold 15px ${MONO}`;
    ctx.fillStyle = '#ffd84d';
    ctx.shadowColor = '#ffd84d';
    ctx.shadowBlur = 10;
    ctx.fillText(`★ TOP ${highlightIndex + 1} OF ALL TIME ★`, lx, H * 0.66);
    ctx.shadowBlur = 0;
  }
  ctx.textAlign = 'left';

  // Right column: leaderboard
  drawLeaderboard(ctx, board, highlightIndex, W * 0.55, H * 0.14);

  if (!enteringName && t > 0.8 && Math.floor(t * 1.6) % 2 === 0) {
    centered(ctx, '— TAP OR PRESS ANY KEY TO BUY THE DIP —', H * 0.88, 16, '#f3eee4');
  }
}

function drawLeaderboard(
  ctx: CanvasRenderingContext2D,
  board: LeaderboardEntry[],
  highlightIndex: number,
  x: number,
  y: number
) {
  const w = W * 0.38;
  ctx.font = `bold 16px ${MONO}`;
  ctx.fillStyle = '#ffd84d';
  ctx.fillText('TOP 10 TRADERS', x, y);
  ctx.strokeStyle = 'rgba(120, 170, 220, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x + w, y + 8);
  ctx.stroke();

  ctx.font = `13px ${MONO}`;
  for (let i = 0; i < 10; i++) {
    const rowY = y + 30 + i * 30;
    const e = board[i];
    const isYou = i === highlightIndex;
    if (isYou) {
      ctx.fillStyle = 'rgba(255, 216, 77, 0.14)';
      ctx.fillRect(x - 6, rowY - 15, w + 12, 24);
    }
    ctx.fillStyle = isYou ? '#ffd84d' : e ? '#c9d8ea' : 'rgba(120, 150, 180, 0.3)';
    ctx.fillText(`${String(i + 1).padStart(2)}.`, x, rowY);
    if (e) {
      ctx.fillText(e.name.toUpperCase(), x + 34, rowY);
      ctx.textAlign = 'right';
      ctx.fillStyle = isYou ? '#ffd84d' : '#37d67a';
      ctx.fillText(formatPrice(e.score), x + w, rowY);
      ctx.textAlign = 'left';
    } else {
      ctx.fillText('---', x + 34, rowY);
    }
  }
}

// ---- Pause menu ----

export interface ButtonRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export const PAUSE_BUTTONS: Record<'resume' | 'restart' | 'menu', ButtonRect> = {
  resume: { x: W / 2 - 115, y: 228, w: 230, h: 46, label: 'CONTINUE' },
  restart: { x: W / 2 - 115, y: 288, w: 230, h: 46, label: 'RESTART RUN' },
  menu: { x: W / 2 - 115, y: 348, w: 230, h: 46, label: 'MAIN MENU' },
};

export function drawPauseMenu(ctx: CanvasRenderingContext2D) {
  dim(ctx, 0.72);
  centered(ctx, 'TRADING HALTED', 175, 36, '#f3eee4', true);

  for (const b of Object.values(PAUSE_BUTTONS)) {
    ctx.fillStyle = 'rgba(16, 26, 42, 0.92)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#5fa8d8';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.font = `bold 17px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9d8ea';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
    ctx.textAlign = 'left';
  }

  centered(ctx, '(ESC or P to resume)', 428, 12, 'rgba(150, 190, 230, 0.7)', false, '');
}

/** In-game milestone banner. progress: 0..1 across the banner's lifetime. */
export function drawMilestoneBanner(
  ctx: CanvasRenderingContext2D,
  m: Milestone,
  progress: number
) {
  // Slide in fast, hold, fade out
  const inT = Math.min(1, progress * 5);
  const outT = Math.max(0, (progress - 0.78) / 0.22);
  const alpha = inT * (1 - outT);
  const slide = (1 - inT) * -60;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, slide);

  const y = H * 0.3;
  ctx.fillStyle = 'rgba(6, 10, 18, 0.82)';
  ctx.fillRect(0, y - 58, W, 116);
  ctx.fillStyle = m.tint;
  ctx.fillRect(0, y - 58, W, 3);
  ctx.fillRect(0, y + 55, W, 3);

  centered(ctx, `⚡ FASTER ⚡`, y - 28, 18, '#ffd84d', true);
  centered(ctx, m.name, y + 8, m.name.length > 22 ? 26 : 34, m.tint, true);
  centered(ctx, m.tagline, y + 38, 14, '#c9d8ea', false, 'italic');

  ctx.restore();
}

export function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return m > 0 ? `${m}m ${s.padStart(4, '0')}s` : `${s}s`;
}
