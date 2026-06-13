import { TUNING } from '../config/tuning';

// The stock price model. The price climbs multiplicatively (constant rate on
// ln(price)), modulated by the milestone speed multiplier and a "momentum"
// bonus that builds while you avoid hits and resets when you take one.
export class PriceSystem {
  price: number = TUNING.startPrice;
  peak: number = TUNING.startPrice;
  /** 0..1 — clean-streak momentum. */
  momentum = 0;
  private streakTime = 0;

  update(dt: number) {
    this.streakTime += dt;
    this.momentum = Math.min(1, this.streakTime / TUNING.momentumFullTime);

    // Price climbs at a steady base pace, sped up ONLY by a clean-streak
    // momentum bonus — deliberately NOT by the milestone speed multiplier, so
    // the climb can't run away into absurd numbers. Each doubling takes roughly
    // equal real time; surviving cleanly is what makes you richer.
    const rate = TUNING.baseClimbRate * (1 + this.momentum * TUNING.momentumMaxBonus);

    this.price *= Math.exp(rate * dt);
    if (this.price > this.peak) this.peak = this.price;
  }

  /** Instant price bump (logo pickup). Returns the dollars gained. */
  bump(mult: number): number {
    const before = this.price;
    this.price *= mult;
    if (this.price > this.peak) this.peak = this.price;
    return this.price - before;
  }

  /** Returns the dollar amount lost, for the crash effect. */
  hit(): number {
    const before = this.price;
    this.price = Math.max(TUNING.minPrice, this.price * TUNING.hitPriceDrop);
    this.streakTime = 0;
    this.momentum = 0;
    return before - this.price;
  }

  reset() {
    this.price = TUNING.startPrice;
    this.peak = TUNING.startPrice;
    this.momentum = 0;
    this.streakTime = 0;
  }
}

export function formatPrice(p: number): string {
  if (p >= 1000) {
    return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return '$' + p.toFixed(2);
}
