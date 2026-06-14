import { TUNING } from '../config/tuning';
import { TICKER_HEADLINES } from '../config/milestones';

// Trading-terminal backdrop + the chart line the player runs on.
//
// The chart line is a scrolling random walk (jagged like a real chart, but
// with a flat baseline so gameplay stays fair). Taking a hit sags the whole
// line down (the "floor drops"); a clean streak eases it back up.

const SAMPLE_SPACING = 14; // px between terrain samples

/** Linear-interpolate two #rrggbb colors; returns an "rgb(...)" string. */
function lerpHex(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export class Chart {
  private samples: number[] = [];
  private scrollOffset = 0; // 0..SAMPLE_SPACING, sub-sample scroll
  private walk = 0; // current random-walk offset
  private crashOffset = 0; // eases toward crashTarget
  private crashTarget = 0;
  private tickerX = 0;
  private tickerText: string;
  private gridScroll = 0;
  private skyScroll = 0; // slow parallax for stars/skyline
  /** Decorative starfield (fades in as the climb gets higher / later). */
  private stars: { x: number; y: number; r: number; a: number }[] = [];
  /** Distant skyline silhouette heights (fades in mid-climb). */
  private buildings: number[] = [];
  time = 0;

  constructor() {
    this.tickerText = TICKER_HEADLINES.join('   •   ') + '   •   ';
    const count = Math.ceil(TUNING.width / SAMPLE_SPACING) + 3;
    for (let i = 0; i < count; i++) this.samples.push(this.nextSample());
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * TUNING.width,
        y: Math.random() * TUNING.height * 0.6,
        r: Math.random() < 0.7 ? 1 : 2,
        a: 0.4 + Math.random() * 0.6,
      });
    }
    for (let i = 0; i < 16; i++) this.buildings.push(40 + Math.random() * 90);
  }

  private nextSample(): number {
    // Bounded random walk: jagged chart texture, +-18px around the baseline.
    this.walk += (Math.random() - 0.5) * 14;
    this.walk *= 0.92;
    this.walk = Math.max(-18, Math.min(18, this.walk));
    return this.walk;
  }

  onHit() {
    this.crashTarget = TUNING.crashDip;
  }

  update(dt: number, scrollSpeed: number) {
    this.time += dt;
    this.scrollOffset += scrollSpeed * dt;
    while (this.scrollOffset >= SAMPLE_SPACING) {
      this.scrollOffset -= SAMPLE_SPACING;
      this.samples.shift();
      this.samples.push(this.nextSample());
    }
    // Crash sag eases down fast, recovers slowly.
    this.crashTarget = Math.max(
      0,
      this.crashTarget - (TUNING.crashDip / TUNING.crashRecoverTime) * dt
    );
    const ease = this.crashOffset < this.crashTarget ? 14 : 2.2;
    this.crashOffset += (this.crashTarget - this.crashOffset) * Math.min(1, ease * dt);

    this.gridScroll = (this.gridScroll + scrollSpeed * 0.25 * dt) % 80;
    this.skyScroll += scrollSpeed * 0.05 * dt; // distant parallax
    this.tickerX -= 110 * dt;
  }

  /** Screen-space y of the chart line (the ground) at screen x. */
  groundAt(x: number): number {
    const base = TUNING.height * TUNING.groundBase;
    const fi = (x + this.scrollOffset) / SAMPLE_SPACING;
    const i = Math.max(0, Math.min(this.samples.length - 2, Math.floor(fi)));
    const t = fi - i;
    const sm = t * t * (3 - 2 * t); // smoothstep between samples
    const wobble = this.samples[i] + (this.samples[i + 1] - this.samples[i]) * sm;
    return base + wobble + this.crashOffset;
  }

  get crashing(): boolean {
    return this.crashOffset > 6;
  }

  drawBackdrop(
    ctx: CanvasRenderingContext2D,
    tint: string,
    tintStrength: number,
    price: number = TUNING.startPrice
  ) {
    const W = TUNING.width;
    const H = TUNING.height;
    const ph = this.phase(price);

    // Sky gradient — evolves from the dawn trading floor up toward space.
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, ph.top);
    grad.addColorStop(1, ph.bot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Starfield (fades in as you climb higher)
    if (ph.star > 0.01) {
      ctx.fillStyle = '#cfe0ff';
      for (const s of this.stars) {
        let x = (s.x - this.skyScroll * (0.4 + s.r * 0.25)) % W;
        if (x < 0) x += W;
        const tw = 0.65 + Math.sin(this.time * 1.8 + s.x) * 0.35;
        ctx.globalAlpha = ph.star * s.a * tw;
        ctx.fillRect(x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }

    // Distant skyline silhouette (fades in around the city phase)
    if (ph.sky > 0.01) {
      ctx.globalAlpha = ph.sky;
      ctx.fillStyle = '#0b1020';
      const horizon = H * TUNING.groundBase;
      const bw = W / 12;
      for (let i = 0; i < this.buildings.length; i++) {
        let bx = (i * bw - (this.skyScroll * 0.5) % (W + bw)) % (W + bw);
        if (bx < -bw) bx += W + bw;
        const bh = this.buildings[i];
        ctx.fillRect(bx, horizon - bh, bw - 4, bh);
      }
      ctx.globalAlpha = 1;
    }

    if (tintStrength > 0.01) {
      ctx.globalAlpha = tintStrength * 0.1;
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Grid (the trading-terminal feel) — eases back as the sky takes over.
    ctx.strokeStyle = `rgba(80, 130, 190, ${0.13 * (1 - ph.star * 0.55)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -this.gridScroll; x < W; x += 80) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y < H; y += 80) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
  }

  /** Interpolated backdrop look for the current price (the "journey"). */
  private phase(price: number): { top: string; bot: string; sky: number; star: number } {
    const stops = [
      { p: 0.51, top: '#0a1322', bot: '#06090f', sky: 0, star: 0 }, // dawn terminal
      { p: 8, top: '#241a3a', bot: '#0a0a16', sky: 1, star: 0.25 }, // city dusk
      { p: 34, top: '#0c1430', bot: '#05060f', sky: 0.55, star: 0.7 }, // night
      { p: 220, top: '#0a0618', bot: '#02030a', sky: 0, star: 1 }, // space
    ];
    const lp = Math.log(Math.max(0.51, price));
    let i = 0;
    while (i < stops.length - 2 && lp >= Math.log(stops[i + 1].p)) i++;
    const a = stops[i];
    const b = stops[i + 1];
    const f = Math.max(
      0,
      Math.min(1, (lp - Math.log(a.p)) / (Math.log(b.p) - Math.log(a.p)))
    );
    return {
      top: lerpHex(a.top, b.top, f),
      bot: lerpHex(a.bot, b.bot, f),
      sky: a.sky + (b.sky - a.sky) * f,
      star: a.star + (b.star - a.star) * f,
    };
  }

  /** Right-side price axis: labels drift so the ground line ~= current price. */
  drawAxis(ctx: CanvasRenderingContext2D, currentPrice: number) {
    const W = TUNING.width;
    const H = TUNING.height;
    const groundBase = H * TUNING.groundBase;
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(120, 170, 220, 0.45)';
    // Log-scale-ish labels above and below the ground line.
    for (let k = -1; k <= 3; k++) {
      const y = groundBase - k * 95;
      if (y < 30 || y > H - 50) continue;
      const value = currentPrice * Math.pow(1.45, k);
      ctx.fillText('$' + value.toFixed(2), W - 8, y - 4);
      ctx.strokeStyle = 'rgba(120, 170, 220, 0.12)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
  }

  drawChartLine(ctx: CanvasRenderingContext2D) {
    const W = TUNING.width;
    const H = TUNING.height;
    const red = this.crashing;

    // Area fill under the line
    ctx.beginPath();
    ctx.moveTo(0, this.groundAt(0));
    for (let x = SAMPLE_SPACING; x <= W + SAMPLE_SPACING; x += SAMPLE_SPACING / 2) {
      ctx.lineTo(x, this.groundAt(x));
    }
    ctx.lineTo(W + SAMPLE_SPACING, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, H * 0.6, 0, H);
    if (red) {
      fill.addColorStop(0, 'rgba(255, 70, 70, 0.22)');
      fill.addColorStop(1, 'rgba(255, 70, 70, 0.02)');
    } else {
      fill.addColorStop(0, 'rgba(55, 214, 122, 0.20)');
      fill.addColorStop(1, 'rgba(55, 214, 122, 0.02)');
    }
    ctx.fillStyle = fill;
    ctx.fill();

    // The line itself
    ctx.beginPath();
    ctx.moveTo(0, this.groundAt(0));
    for (let x = SAMPLE_SPACING; x <= W + SAMPLE_SPACING; x += SAMPLE_SPACING / 2) {
      ctx.lineTo(x, this.groundAt(x));
    }
    ctx.strokeStyle = red ? '#ff5050' : '#37d67a';
    ctx.lineWidth = 3;
    ctx.shadowColor = red ? '#ff5050' : '#37d67a';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawTicker(ctx: CanvasRenderingContext2D) {
    const W = TUNING.width;
    const H = TUNING.height;
    ctx.fillStyle = 'rgba(8, 14, 24, 0.92)';
    ctx.fillRect(0, H - 26, W, 26);
    ctx.strokeStyle = 'rgba(80, 130, 190, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, H - 26);
    ctx.lineTo(W, H - 26);
    ctx.stroke();

    ctx.font = '13px "Courier New", monospace';
    const textWidth = ctx.measureText(this.tickerText).width;
    if (this.tickerX < -textWidth) this.tickerX += textWidth;
    ctx.fillStyle = '#5fa8d8';
    ctx.fillText(this.tickerText, this.tickerX, H - 8);
    ctx.fillText(this.tickerText, this.tickerX + textWidth, H - 8);
  }
}
