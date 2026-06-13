import { TUNING } from '../config/tuning';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The hero: a little pixel house with an open blue door, running up the chart.
export class Player {
  readonly x = TUNING.width * TUNING.playerX;
  /** y of the player's FEET in screen space. */
  feetY = 0;
  private vy = 0;
  private grounded = true;
  /** True after a jump until the rise is cut short or the apex is reached. */
  private canCutJump = false;
  ducking = false;
  /** Cosmetic upgrade from the "Opendoor 2.0" milestone. */
  upgraded = false;
  /** True while a rocket pickup's speed boost is active (set by the game). */
  boosting = false;
  shieldTime = 0;
  invincibleTime = 0;
  private runPhase = 0;

  reset() {
    this.vy = 0;
    this.grounded = true;
    this.canCutJump = false;
    this.ducking = false;
    this.upgraded = false;
    this.boosting = false;
    this.shieldTime = 0;
    this.invincibleTime = 0;
  }

  get width(): number {
    return this.ducking ? TUNING.duckWidth : TUNING.standWidth;
  }
  get height(): number {
    return this.ducking ? TUNING.duckHeight : TUNING.standHeight;
  }

  /** Collision box, shrunk by the forgiveness margin. */
  hitbox(): Box {
    const f = TUNING.hitboxForgiveness;
    const w = this.width * (1 - f * 2);
    const h = this.height * (1 - f * 2);
    return { x: this.x - w / 2, y: this.feetY - this.height + this.height * f, w, h };
  }

  tryJump(): boolean {
    if (!this.grounded) return false;
    this.vy = -TUNING.jumpVelocity;
    this.grounded = false;
    this.ducking = false;
    this.canCutJump = true; // a short tap can cut this jump short (see update)
    return true;
  }

  update(
    dt: number,
    groundY: number,
    duckHeld: boolean,
    scrollSpeed: number,
    jumpHeld = true
  ) {
    this.runPhase += dt * scrollSpeed * 0.055;
    if (this.shieldTime > 0) this.shieldTime = Math.max(0, this.shieldTime - dt);
    if (this.invincibleTime > 0) this.invincibleTime = Math.max(0, this.invincibleTime - dt);

    if (this.grounded) {
      this.ducking = duckHeld;
      if (groundY > this.feetY + 8) {
        // Ground fell away under us (crash dip) — go airborne and fall.
        this.grounded = false;
      } else {
        this.feetY = groundY;
      }
    }

    if (!this.grounded) {
      // Variable jump height: releasing the button while still rising cuts the
      // upward speed, turning a hold into a full jump and a tap into a short hop.
      if (this.canCutJump && this.vy < 0) {
        if (!jumpHeld) {
          this.vy *= TUNING.jumpCutFactor;
          this.canCutJump = false;
        }
      } else {
        this.canCutJump = false; // past the apex — nothing left to cut
      }

      // Holding duck in the air = fast-fall, so ducks feel responsive.
      const g = TUNING.gravity + (duckHeld ? TUNING.fastFallBoost : 0);
      this.vy += g * dt;
      this.feetY += this.vy * dt;
      if (this.feetY >= groundY && this.vy >= 0) {
        this.feetY = groundY;
        this.vy = 0;
        this.grounded = true;
      }
    }
  }

  get isFlashing(): boolean {
    // Blink during i-frames
    return this.invincibleTime > 0 && Math.floor(this.invincibleTime * 12) % 2 === 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isFlashing) return;

    const w = this.width;
    const h = this.height;
    const left = this.x - w / 2;
    const top = this.feetY - h;
    const bob = this.grounded && !this.ducking ? Math.sin(this.runPhase * 2) * 1.5 : 0;

    ctx.save();
    ctx.translate(0, bob);

    // Shield aura
    if (this.shieldTime > 0) {
      const pulse = 0.35 + Math.sin(performance.now() / 120) * 0.15;
      ctx.beginPath();
      ctx.arc(this.x, this.feetY - h / 2, Math.max(w, h) * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(80, 220, 255, ${pulse + 0.25})`;
      ctx.fillStyle = `rgba(80, 220, 255, ${pulse * 0.2})`;
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
    }

    // Upgrade/rocket glow + flame trail
    if (this.upgraded || this.boosting) {
      ctx.shadowColor = this.boosting ? '#ffb13d' : '#7a6bff';
      ctx.shadowBlur = 14;
      // Flame trailing behind
      const flicker = Math.random() * 8;
      ctx.fillStyle = '#ffb13d';
      ctx.beginPath();
      ctx.moveTo(left - 2, top + h * 0.45);
      ctx.lineTo(left - 16 - flicker, top + h * 0.6);
      ctx.lineTo(left - 2, top + h * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe06b';
      ctx.beginPath();
      ctx.moveTo(left - 2, top + h * 0.5);
      ctx.lineTo(left - 8 - flicker * 0.5, top + h * 0.6);
      ctx.lineTo(left - 2, top + h * 0.7);
      ctx.closePath();
      ctx.fill();
    }

    const roofH = h * 0.34;
    const bodyTop = top + roofH;
    const bodyH = h - roofH - 5; // 5px legs

    // Legs (scurrying)
    if (this.grounded) {
      const legSwing = Math.sin(this.runPhase * 4) * 4;
      ctx.fillStyle = '#26354a';
      ctx.fillRect(this.x - w * 0.22 + legSwing, this.feetY - 5, 6, 5);
      ctx.fillRect(this.x + w * 0.12 - legSwing, this.feetY - 5, 6, 5);
    } else {
      ctx.fillStyle = '#26354a';
      ctx.fillRect(this.x - w * 0.22, this.feetY - 6, 6, 5);
      ctx.fillRect(this.x + w * 0.12, this.feetY - 6, 6, 5);
    }

    // Body
    ctx.fillStyle = '#f3eee4';
    ctx.fillRect(left, bodyTop, w, bodyH);
    ctx.strokeStyle = '#26354a';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, bodyTop, w, bodyH);

    // Roof
    ctx.fillStyle = this.upgraded ? '#7a6bff' : '#2b4a6f';
    ctx.beginPath();
    ctx.moveTo(left - 4, bodyTop);
    ctx.lineTo(this.x, top);
    ctx.lineTo(left + w + 4, bodyTop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!this.ducking) {
      // Open door: dark doorway + blue door panel swung outward
      const doorW = w * 0.3;
      const doorH = bodyH * 0.72;
      const doorX = this.x - doorW * 0.15;
      const doorY = bodyTop + bodyH - doorH;
      ctx.fillStyle = '#10161f';
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.fillStyle = '#1c85e8';
      ctx.save();
      ctx.translate(doorX, doorY);
      ctx.transform(1, 0.22, 0, 1, 0, 0); // swung-open skew
      ctx.fillRect(-doorW * 0.9, 0, doorW * 0.85, doorH * 0.92);
      ctx.restore();

      // Window
      ctx.fillStyle = '#ffd84d';
      ctx.fillRect(left + w * 0.62, bodyTop + bodyH * 0.18, w * 0.22, w * 0.22);
      ctx.strokeStyle = '#26354a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left + w * 0.62, bodyTop + bodyH * 0.18, w * 0.22, w * 0.22);

      // Determined little eyes on the doorway side
      ctx.fillStyle = '#26354a';
      ctx.fillRect(left + w * 0.18, bodyTop + bodyH * 0.22, 4, 4);
    } else {
      // Ducking: squashed house — just a wide window squinting
      ctx.fillStyle = '#ffd84d';
      ctx.fillRect(this.x - w * 0.2, bodyTop + bodyH * 0.3, w * 0.4, 5);
      ctx.strokeStyle = '#26354a';
      ctx.strokeRect(this.x - w * 0.2, bodyTop + bodyH * 0.3, w * 0.4, 5);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
