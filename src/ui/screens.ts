import { TUNING } from '../config/tuning';
import { formatPrice } from '../systems/price';
import { drawObstacleIcon } from '../systems/obstacles';
import { drawPickupIcon } from '../systems/pickups';
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

/** Title is a real menu now: START GAME / HOW TO PLAY / LEADERBOARD. */
export const TITLE_BUTTONS: Record<'start' | 'howto' | 'leaderboard', ButtonRect> = {
  start: { x: W / 2 - 120, y: H * 0.5, w: 240, h: 48, label: '▶  START GAME' },
  howto: { x: W / 2 - 120, y: H * 0.63, w: 240, h: 44, label: 'HOW TO PLAY' },
  leaderboard: { x: W / 2 - 120, y: H * 0.75, w: 240, h: 44, label: '🏆 LEADERBOARD' },
};

export function drawTitle(ctx: CanvasRenderingContext2D) {
  dim(ctx, 0.5);
  centered(ctx, '$OPEN', H * 0.26, 66, '#37d67a', true);
  centered(ctx, 'F A S T E R', H * 0.385, 34, '#ffd84d', true);
  drawButton(ctx, TITLE_BUTTONS.start, 19);
  drawButton(ctx, TITLE_BUTTONS.howto, 16);
  drawButton(ctx, TITLE_BUTTONS.leaderboard, 16);
}

// ---- How to play overlay ----

export const HOWTO_BACK_BUTTON: ButtonRect = {
  x: W / 2 - 90,
  y: H * 0.92,
  w: 180,
  h: 38,
  label: '‹ BACK',
};

function sectionHead(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = `bold 14px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd84d';
  ctx.fillText(text, x, y);
  ctx.strokeStyle = 'rgba(255, 216, 77, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 7);
  ctx.lineTo(x + ctx.measureText(text).width, y + 7);
  ctx.stroke();
}

function infoLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = `13px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#dce8f4';
  ctx.fillText(text, x, y);
}

/** A sprite icon with a label to its right. */
function spriteRow(
  ctx: CanvasRenderingContext2D,
  drawIcon: (x: number, y: number) => void,
  label: string,
  iconX: number,
  textX: number,
  y: number
) {
  drawIcon(iconX, y);
  infoLine(ctx, label, textX, y + 4);
}

/** A little rounded "keyboard key" cap with a label; returns the next x. */
function keycap(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, accent: string): number {
  ctx.font = `bold 13px ${MONO}`;
  const w = Math.max(28, ctx.measureText(label).width + 16);
  const h = 26;
  ctx.fillStyle = 'rgba(38, 54, 80, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#eaf2fb';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 5);
  ctx.textAlign = 'left';
  return x + w + 8;
}

/** One control card: a titled panel with key-caps and a one-line tip. */
function controlCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string,
  title: string,
  keys: string[],
  note: string
) {
  ctx.fillStyle = 'rgba(12, 20, 34, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 9);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Title
  ctx.font = `bold 17px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 8;
  ctx.fillText(title, x + 16, y + 27);
  ctx.shadowBlur = 0;
  // Key caps
  let kx = x + 16;
  for (const k of keys) kx = keycap(ctx, k, kx, y + 38, accent);
  // Tip
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = '#9fb6cc';
  ctx.textAlign = 'left';
  ctx.fillText(note, x + 16, y + 82);
}

export function drawHowTo(ctx: CanvasRenderingContext2D) {
  // Near-solid backdrop so the title menu underneath doesn't bleed through.
  ctx.fillStyle = '#070b12';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10, 16, 28, 0.55)';
  ctx.fillRect(0, 0, W, H);

  centered(ctx, 'HOW TO PLAY', 52, 28, '#ffd84d', true);
  centered(
    ctx,
    'You ARE the $OPEN price — run up the chart, dodge the shorts, climb FASTER.',
    84,
    13,
    '#9fb6cc',
    false,
    ''
  );

  // --- Controls: two clear cards (the part that confused people) ---
  controlCard(ctx, 70, 104, 380, 92, '#37d67a', '▲  JUMP', ['SPACE', '↑', 'W'],
    'Hold = jump higher   ·   tap = short hop');
  controlCard(ctx, 510, 104, 380, 92, '#39c2ff', '▼  DUCK', ['↓', 'S'],
    'Hold to stay down   ·   in mid-air = drop fast');
  centered(ctx, 'PAUSE  ESC / P          ON PHONE  use the on-screen ▲ / ▼ buttons', 222, 12, '#7e98b4', false, '');

  // --- Power-ups (left) and the shorts (right) ---
  const lx = 70;
  sectionHead(ctx, 'POWER-UPS  (collect these)', lx, 256);
  const pIx = lx + 18;
  const pTx = lx + 44;
  spriteRow(ctx, (x, y) => drawPickupIcon(ctx, 'pill', x, y, 0.9), 'AI PILL — grab 3 to go FASTER', pIx, pTx, 286);
  spriteRow(ctx, (x, y) => drawPickupIcon(ctx, 'magnet', x, y, 0.9), "KAZ'S TALENT MAGNET — pulls in nearby pills", pIx, pTx, 318);
  spriteRow(ctx, (x, y) => drawPickupIcon(ctx, 'squeeze', x, y, 0.9), 'SHORT SQUEEZE — shield, blocks 1 hit', pIx, pTx, 350);
  spriteRow(ctx, (x, y) => drawPickupIcon(ctx, 'rocket', x, y, 0.9), 'ROCKET — quick speed burst', pIx, pTx, 382);

  const rx = 510;
  sectionHead(ctx, 'DODGE THE SHORTS  (avoid these)', rx, 256);
  const ix = rx + 20;
  const tx = rx + 48;
  spriteRow(ctx, (x, y) => drawObstacleIcon(ctx, 'wreckedHouse', x, y, 0.7), 'WRECKED HOUSE — jump over', ix, tx, 286);
  spriteRow(ctx, (x, y) => drawObstacleIcon(ctx, 'bear', x, y, 0.7), 'BEAR — jump (charges fast!)', ix, tx, 318);
  spriteRow(ctx, (x, y) => drawObstacleIcon(ctx, 'fud', x, y, 0.9), 'FUD — jump if low, duck if high', ix, tx, 350);
  spriteRow(ctx, (x, y) => drawObstacleIcon(ctx, 'crashChart', x, y, 0.38), 'CRASH WALL — too tall, duck under', ix, tx, 382);
  spriteRow(ctx, (x, y) => drawObstacleIcon(ctx, 'flyingHouse', x, y, 0.7), 'RIVAL — jump if low, duck if high', ix, tx, 414);
  spriteRow(ctx, (x, y) => drawObstacleIcon(ctx, 'pit', x, y, 0.5), 'RUG-PULL PIT — jump across the gap', ix, tx, 446);

  drawButton(ctx, HOWTO_BACK_BUTTON);
  ctx.textAlign = 'left';
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

/** Share-on-X + Try-again buttons on the game-over screen (left column). */
export const SHARE_BUTTON: ButtonRect = {
  x: W * 0.27 - 115,
  y: H * 0.69,
  w: 230,
  h: 42,
  label: '𝕏  SHARE YOUR RUN',
};
export const TRY_AGAIN_BUTTON: ButtonRect = {
  x: W * 0.27 - 115,
  y: H * 0.79,
  w: 230,
  h: 42,
  label: '▶  TRY AGAIN',
};

export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  t: number,
  peak: number,
  timeAlive: number,
  board: LeaderboardEntry[],
  highlightIndex: number,
  enteringName: boolean,
  global = false
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
    ctx.fillText(`★ TOP ${highlightIndex + 1} OF ALL TIME ★`, lx, H * 0.63);
    ctx.shadowBlur = 0;
  }
  ctx.textAlign = 'left';

  // Share-on-X + Try-again buttons (hidden while the name modal is up)
  if (!enteringName) {
    drawButton(ctx, SHARE_BUTTON, 16);
    drawButton(ctx, TRY_AGAIN_BUTTON, 16);
    if (t > 0.8 && Math.floor(t * 1.6) % 2 === 0) {
      centered(ctx, '(or press any key to try again)', H * 0.93, 12, 'rgba(150,190,230,0.7)', false, '');
    }
  }

  // Right column: leaderboard
  drawLeaderboard(ctx, board, highlightIndex, W * 0.55, H * 0.14, global);
}

function drawLeaderboard(
  ctx: CanvasRenderingContext2D,
  board: LeaderboardEntry[],
  highlightIndex: number,
  x: number,
  y: number,
  global = false
) {
  const w = W * 0.38;
  ctx.font = `bold 16px ${MONO}`;
  ctx.fillStyle = '#ffd84d';
  ctx.fillText(global ? '🌎 GLOBAL TOP 10' : 'TOP 10 TRADERS', x, y);
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
  resume: { x: W / 2 - 115, y: 226, w: 230, h: 46, label: 'CONTINUE' },
  restart: { x: W / 2 - 115, y: 286, w: 230, h: 46, label: 'RESTART RUN' },
  menu: { x: W / 2 - 115, y: 346, w: 230, h: 46, label: 'MAIN MENU' },
};

/** Shared button look used by the pause/title/board menus. */
function drawButton(ctx: CanvasRenderingContext2D, b: ButtonRect, size = 17) {
  ctx.fillStyle = 'rgba(16, 26, 42, 0.92)';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = '#5fa8d8';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.font = `bold ${size}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c9d8ea';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
  ctx.textAlign = 'left';
}

export function drawPauseMenu(ctx: CanvasRenderingContext2D) {
  dim(ctx, 0.72);
  centered(ctx, 'TRADING HALTED', 175, 36, '#f3eee4', true);
  for (const b of Object.values(PAUSE_BUTTONS)) drawButton(ctx, b);
  centered(ctx, '(ESC or P to resume)', 426, 12, 'rgba(150, 190, 230, 0.7)', false, '');
}

// ---- Leaderboard overlay (opened from the title or pause menu) ----

export const BOARD_BACK_BUTTON: ButtonRect = {
  x: W / 2 - 90,
  y: H * 0.85,
  w: 180,
  h: 40,
  label: '‹ BACK',
};

export function drawLeaderboardScreen(
  ctx: CanvasRenderingContext2D,
  board: LeaderboardEntry[],
  global: boolean,
  highlightIndex = -1
) {
  dim(ctx, 0.9);
  const x = (W - W * 0.38) / 2;
  drawLeaderboard(ctx, board, highlightIndex, x, H * 0.2, global);
  drawButton(ctx, BOARD_BACK_BUTTON);
  centered(ctx, '(ESC to close)', H * 0.93, 12, 'rgba(150, 190, 230, 0.7)', false, '');
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
