import { TUNING } from './config/tuning';
import { Input } from './input';
import { Game } from './game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let renderScale = 1;

function resize() {
  const fit = Math.min(
    window.innerWidth / TUNING.width,
    window.innerHeight / TUNING.height
  );
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${TUNING.width * fit}px`;
  canvas.style.height = `${TUNING.height * fit}px`;
  canvas.width = Math.round(TUNING.width * fit * dpr);
  canvas.height = Math.round(TUNING.height * fit * dpr);
  renderScale = fit * dpr;
}
resize();
window.addEventListener('resize', resize);

function toLogical(clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * TUNING.width,
    y: ((clientY - rect.top) / rect.height) * TUNING.height,
  };
}

// Input must be constructed before Game so its key listeners run first
// (Game relies on clearing queued input after pause toggles).
const input = new Input(canvas);
const game = new Game(input);

if (import.meta.env.DEV) {
  // Dev-only handle for debugging from the console.
  (window as unknown as { __game: Game }).__game = game;
}

canvas.addEventListener('mousedown', (e) => {
  const p = toLogical(e.clientX, e.clientY);
  game.pointerDown(p.x, p.y);
});
// Touch goes through Input's guard so a mute-button tap doesn't also jump.
input.pointerGuard = (cx, cy) => {
  const p = toLogical(cx, cy);
  return game.pointerDown(p.x, p.y);
};

let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;

  game.update(dt);

  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  game.render(ctx);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
