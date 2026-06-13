// Lightweight particle system: confetti for milestones/wins, red shards for
// crashes, floating "+$" wisps for flavor.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  shape: 'rect' | 'text';
  text?: string;
  spin: number;
}

const CONFETTI_COLORS = ['#37d67a', '#39c2ff', '#ffd84d', '#ff7ab8', '#7a6bff', '#f3eee4'];

export class Particles {
  private items: Particle[] = [];

  clear() {
    this.items = [];
  }

  confettiBurst(x: number, y: number, count = 60) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 380;
      this.items.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 180,
        life: 0,
        maxLife: 1.2 + Math.random() * 1.4,
        size: 4 + Math.random() * 5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        gravity: 500,
        shape: 'rect',
        spin: (Math.random() - 0.5) * 12,
      });
    }
  }

  crashBurst(x: number, y: number) {
    for (let i = 0; i < 26; i++) {
      const angle = -Math.PI * Math.random(); // upward fan
      const speed = 100 + Math.random() * 320;
      this.items.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 3 + Math.random() * 4,
        color: Math.random() < 0.7 ? '#ff4646' : '#ffb13d',
        gravity: 800,
        shape: 'rect',
        spin: (Math.random() - 0.5) * 16,
      });
    }
    this.items.push({
      x,
      y: y - 30,
      vx: 0,
      vy: -60,
      life: 0,
      maxLife: 1.1,
      size: 18,
      color: '#ff4646',
      gravity: 0,
      shape: 'text',
      text: 'SHORT REPORT!',
      spin: 0,
    });
  }

  floatText(x: number, y: number, text: string, color: string) {
    this.items.push({
      x,
      y,
      vx: 0,
      vy: -55,
      life: 0,
      maxLife: 1.0,
      size: 14,
      color,
      gravity: 0,
      shape: 'text',
      text,
      spin: 0,
    });
  }

  update(dt: number) {
    for (const p of this.items) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.items = this.items.filter((p) => p.life < p.maxLife);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.items) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      if (p.shape === 'text') {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text!, p.x, p.y);
        ctx.textAlign = 'left';
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * p.spin);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
}
