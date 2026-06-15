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
  jumpVelocity: 720, // full jump apex (~112px) when the button is held
  jumpCutFactor: 0.42, // releasing early while rising cuts speed -> short hop
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
  spawnIntervalMin: 0.72, // floor at max difficulty
  spawnJitter: 0.55, // +/- randomness fraction of the interval
  // Minimum gap between obstacles, which tightens as scroll speed climbs so the
  // late/fast game doesn't get easy (fixed-airtime jumps sailing over big gaps).
  spawnFloorBase: 0.82, // floor at base speed
  spawnFloorSpeedDrop: 0.2, // how much the floor drops per +1x speed ratio
  spawnFloorMin: 0.44, // hard floor (keeps consecutive jumps/ducks just fair)
  shieldDuration: 10, // shield (short-squeeze item): absorbs one hit or expires

  // Cluster combos — an obstacle often brings a complementary partner (jump then
  // a duck, or jump-duck-jump) close behind. Drives the jump<->duck rhythm.
  clusterChanceMax: 0.68, // partner chance at full difficulty
  clusterGap: 0.75, // seconds between the pair (enough to land a jump, then duck)
  bearWeight: 1.6, // how much more often a spawn is a bear vs. another kind
  bearPackChance: 0.4, // chance a bear charges in as a pack of 2-3
  baitChance: 0.3, // chance a ground enemy gets a tempting "bait" booster
  startGrace: 2.4, // calm seconds at the start of a run before the first short

  // "EARNINGS DAY" volatility surges — periodic combo-dense bursts.
  surgeDuration: 5, // seconds a surge lasts
  surgeFirst: 16, // seconds into a run before the first surge
  surgeInterval: 22, // seconds between surges
  surgeIntervalJitter: 6, // +/- randomness on the gap

  // Speed comes from collecting AI pills (no longer automatic at milestones).
  pillsPerSpeedUp: 3, // AI pills needed to step the speed up once
  pillSpeedStep: 1.2, // speed multiplier gained per step

  // Collectible pickups
  pickupPriceBoost: 1.03, // AI pill: small instant price nudge on top of speed
  squeezeChance: 0.1, // chance a spawned pickup is the rare short-squeeze shield
  magnetChance: 0.1, // chance a spawned pickup is a magnet
  magnetTime: 5, // seconds the magnet pulls in nearby pills
  magnetRange: 430, // px ahead the magnet reaches
  magnetPull: 620, // extra px/s it drags pickups toward you
  rocketChance: 0.15, // chance a spawned pickup is a rocket (after squeeze roll)
  rocketBoostMult: 1.4, // rocket: extra speed/climb multiplier while active
  rocketBoostTime: 3.5, // seconds the rocket boost lasts
  pickupIntervalMin: 2.8, // seconds between pickup spawns (random in range)
  pickupIntervalMax: 5,
  pickupWallClear: 185, // keep boosters this far (px) from a tall crash chart

  // Terrain / chart line
  groundBase: 0.74, // fraction of screen height where the chart line sits
  crashDip: 52, // px the whole chart line sags after a hit
  crashRecoverTime: 3.2, // seconds for the floor to ease back up
} as const;
