// All gameplay feel/balance knobs in one place.
export const TUNING = {
  // Logical canvas size (scaled to fit the window, aspect preserved)
  width: 960,
  height: 540,

  // Price model — price climbs multiplicatively so every "doubling" of the
  // stock takes roughly equal play time (otherwise $0.51 -> $2 would crawl
  // and $40 -> $82 would flash by).
  startPrice: 0.51,
  athPrice: 82, // the historic all-time high — celebrated, then the run goes on
  baseClimbRate: 0.045, // ln(price) per second, no momentum (price is NOT sped
  // up by the milestone multiplier — only by momentum — so it can't run away)
  momentumMaxBonus: 0.5, // up to +50% climb rate on a long clean streak
  momentumFullTime: 18, // seconds without a hit to reach full momentum
  hitPriceDrop: 0.82, // price is multiplied by this on a hit (-18%)
  minPrice: 0.51, // crashes can never take you below the all-time low

  // Run / scroll speed
  baseScroll: 280, // px per second at speed x1
  scrollExponent: 0.7, // scroll = baseScroll * speedMultiplier^exponent
  maxScroll: 760,

  // Player physics
  playerX: 0.25, // fraction of screen width
  gravity: 2300,
  jumpVelocity: 720, // gives ~112px jump apex
  fastFallBoost: 1300, // extra gravity while holding duck mid-air
  standWidth: 36,
  standHeight: 46,
  duckWidth: 42,
  duckHeight: 26,
  hitboxForgiveness: 0.18, // shrink hitboxes by this fraction on each side
  invincibleTime: 1.6, // i-frames after taking a hit, seconds

  // Lives
  maxLives: 3,

  // Hit penalty — a hit briefly slows the game, then it eases back to the speed
  // you'd built up (the slowdown is temporary, not a permanent boost loss).
  hitSlowMult: 0.6, // game speed right after a hit
  hitSlowRecover: 3.5, // seconds to ease back to full speed

  // Obstacles
  spawnIntervalStart: 1.9, // average seconds between obstacles at game start
  spawnIntervalMin: 0.78, // floor at max difficulty
  spawnJitter: 0.55, // +/- randomness fraction of the interval
  squeezeDuration: 4.5, // seconds obstacles flee/stop spawning (squeeze effect)
  shieldDuration: 10, // milestone shield: absorbs one hit or expires

  // Cluster combos — at higher difficulty an obstacle sometimes brings a
  // complementary partner (a jump then a duck, or vice versa) close behind.
  clusterChanceMax: 0.45, // partner chance at full difficulty
  clusterGap: 0.75, // seconds between the pair (enough to land a jump, then duck)
  startGrace: 2.4, // calm seconds at the start of a run before the first short

  // "EARNINGS DAY" volatility surges — periodic combo-dense bursts.
  surgeDuration: 5, // seconds a surge lasts
  surgeFirst: 16, // seconds into a run before the first surge
  surgeInterval: 22, // seconds between surges
  surgeIntervalJitter: 6, // +/- randomness on the gap

  // Collectible pickups
  pickupPriceBoost: 1.06, // Opendoor logo: instant +6% on the price
  rocketChance: 0.3, // chance a spawned pickup is the rare rocket
  rocketBoostMult: 1.4, // rocket: extra speed/climb multiplier while active
  rocketBoostTime: 3.5, // seconds the rocket boost lasts
  pickupIntervalMin: 7, // seconds between pickup spawns (random in range)
  pickupIntervalMax: 14,

  // Terrain / chart line
  groundBase: 0.74, // fraction of screen height where the chart line sits
  crashDip: 52, // px the whole chart line sags after a hit
  crashRecoverTime: 3.2, // seconds for the floor to ease back up
} as const;
