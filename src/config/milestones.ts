// ============================================================
//  MILESTONE ROSTER — edit names, taglines, prices and effects
//  here. This is the only file you need to touch to re-theme
//  the climb. Keep the list sorted by price.
//
//  After the last milestone the game keeps going forever:
//  every doubling of the price auto-generates a
//  "NEW ALL-TIME HIGH" milestone with a small boost.
// ============================================================

export type MilestoneEffect =
  | 'none' // banner + speed boost only
  | 'shield' // absorbs the next hit (or expires after a while)
  | 'upgrade' // permanent visual upgrade for the house (glow + rocket)
  | 'squeeze' // all obstacles flee the screen for a few seconds
  | 'ath'; // all-time-high celebration (big confetti) — game continues!

export interface Milestone {
  price: number;
  name: string;
  tagline: string;
  /** Multiplies the global speed multiplier (1.15 = +15% faster). */
  boost: number;
  effect: MilestoneEffect;
  /** Accent color used for the banner + background tint shift. */
  tint: string;
}

export const MILESTONES: Milestone[] = [
  {
    price: 1,
    name: 'ERIC JACKSON',
    tagline: 'The thesis goes viral',
    boost: 1.18,
    effect: 'none',
    tint: '#37d67a',
  },
  {
    price: 4,
    name: 'KAZ',
    tagline: 'A new CEO walks through the open door',
    boost: 1.18,
    effect: 'shield',
    tint: '#39c2ff',
  },
  {
    price: 8,
    name: 'OPENDOOR 2.0',
    tagline: 'Software company now. Ship FASTER.',
    boost: 1.22,
    effect: 'upgrade',
    tint: '#7a6bff',
  },
  {
    price: 13,
    name: 'PROFITABILITY',
    tagline: 'The numbers turn green',
    boost: 1.16,
    effect: 'none',
    tint: '#37d67a',
  },
  {
    price: 21,
    name: 'AI MORTGAGE PRODUCT NATIONWIDE',
    tagline: 'Approved in all 50 states, instantly',
    boost: 1.16,
    effect: 'shield',
    tint: '#39c2ff',
  },
  {
    price: 34,
    name: 'SHORT SQUEEZE',
    tagline: 'The shorts run for the exits',
    boost: 1.15,
    effect: 'squeeze',
    tint: '#ffb13d',
  },
  {
    price: 55,
    name: 'S&P 500 INCLUSION',
    tagline: 'Welcome to the index',
    boost: 1.15,
    effect: 'shield',
    tint: '#ffd84d',
  },
  {
    price: 82,
    name: 'TOKENIZATION PRODUCT SHIPPED',
    tagline: 'ALL-TIME HIGH — FASTER.',
    boost: 1.15,
    effect: 'ath',
    tint: '#ffd84d',
  },
];

// Past $82 the climb is endless. Instead of a generic "NEW ALL-TIME HIGH" at
// every doubling, these themed milestones fire in order (price is filled in
// automatically from the doubling). After the list is exhausted it falls back
// to a generic all-time-high banner. Edit/extend freely.
export const POST_ATH_MILESTONES: Omit<Milestone, 'price'>[] = [
  {
    name: 'INTERNATIONAL EXPANSION',
    tagline: 'Open doors across the Atlantic 🌍',
    boost: 1.1,
    effect: 'shield',
    tint: '#39c2ff',
  },
  {
    name: 'OPENDOOR CARD LAUNCHES',
    tagline: 'Swipe right on your next home',
    boost: 1.08,
    effect: 'none',
    tint: '#37d67a',
  },
  {
    name: '$100B MARKET CAP',
    tagline: 'Eleven zeros and climbing',
    boost: 1.09,
    effect: 'none',
    tint: '#ffd84d',
  },
  {
    name: 'MORTGAGE IN 60 SECONDS',
    tagline: 'Approved before the kettle boils',
    boost: 1.08,
    effect: 'shield',
    tint: '#39c2ff',
  },
  {
    name: 'SHORTS FULLY LIQUIDATED',
    tagline: 'The last bear leaves the building',
    boost: 1.1,
    effect: 'squeeze',
    tint: '#ffb13d',
  },
  {
    name: '$1 TRILLION MARKET CAP',
    tagline: 'Welcome to the four-comma club',
    boost: 1.1,
    effect: 'ath',
    tint: '#ffd84d',
  },
  {
    name: 'OPENDOOR ON EVERY CONTINENT',
    tagline: 'Even the penguins got a cash offer',
    boost: 1.08,
    effect: 'none',
    tint: '#37d67a',
  },
  {
    name: 'THE HOUSING SINGULARITY',
    tagline: 'Homes now buy and sell themselves',
    boost: 1.09,
    effect: 'shield',
    tint: '#7a6bff',
  },
  {
    name: 'OPENDOOR BUYS THE MOON',
    tagline: 'Lunar listings, instant offers 🌕',
    boost: 1.1,
    effect: 'squeeze',
    tint: '#ffd84d',
  },
  {
    name: 'INTERSTELLAR REAL ESTATE',
    tagline: 'To infinity — and beyond the all-time high',
    boost: 1.1,
    effect: 'ath',
    tint: '#ffd84d',
  },
];

// Headlines for the scrolling ticker tape at the bottom of the screen.
export const TICKER_HEADLINES = [
  '$OPEN +12% — shorts reportedly "very tired"',
  'BREAKING: Kaz ships 14 features before breakfast',
  'Analyst upgrades $OPEN to "extremely FASTER"',
  'Homeowners love cash offers, sources say',
  'Bears spotted leaving the building',
  'Opendoor 2.0: now with more open doors',
  '$0.51 was the bottom. You are the chart now.',
  'Eric Jackson tweets again — volume spikes',
  'Short interest down. Morale up.',
  'Earnings report drops — it is beautiful',
];
