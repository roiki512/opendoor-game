# $OPEN: FASTER 🏠⚡

A tiny arcade runner for Opendoor employees and shareholders. You are the
chart: run the stock up from its all-time low of **$0.51**, dodge the short
sellers, and collect milestone power-ups that make everything go **FASTER**.
The run never ends — climb as high as you can before the shorts take your
last earnings report.

## How to play

| Action | Desktop | Mobile |
|---|---|---|
| Jump | `Space` / `↑` / `W` | tap |
| Duck | `↓` / `S` | swipe down & hold |
| Pause menu | `Esc` / `P` | — |
| Mute | `M` | tap the speaker icon |

- You have **3 earnings reports** (lives). Every hit publishes a *Short
  Report*: the price crashes ~18%, the floor drops, and you lose a report.
- Survive cleanly and **momentum** builds, climbing the price faster — get hit
  and it resets.
- Grab the floating **Opendoor logos** for an instant price bump, and the
  rare **🚀 rockets** for a short speed boost + shield.
- Cross the historic **$82** all-time high and keep going — every doubling
  after that is a fresh NEW ALL-TIME HIGH boost.
- Lose all 3 reports → game over. If your peak price makes the **top 10**,
  sign your name on the leaderboard. (The leaderboard is stored per-browser;
  a shared company-wide board would need a small backend.)

## Run it locally

```bash
npm install
npm run dev      # dev server at http://localhost:5173
```

Dev-only debug keys: `9` warps the price to the next milestone, `8` simulates
a hit.

## Customize the milestones

Everything story-related lives in **`src/config/milestones.ts`** — names,
taglines, trigger prices, speed boosts, special effects (`shield`, `upgrade`,
`squeeze`, `ath`), banner colors, and the ticker-tape headlines. Edit that one
file to retheme the whole climb.

Gameplay feel (speeds, physics, spawn rates, lives, pickup frequency) lives in
**`src/config/tuning.ts`**.

## Share it

```bash
npm run build    # outputs a fully static site to dist/
```

Drop the `dist/` folder on any static host — GitHub Pages, Netlify, Vercel,
an S3 bucket, or the company intranet. No server needed. (The build uses
relative paths, so it works from any subdirectory.)

## Tech

Vite + TypeScript + raw HTML5 canvas. No runtime dependencies, no image or
audio assets — all art is drawn in code, sound is synthesized with WebAudio,
and the "FASTER!" voice uses the browser's speech synthesis.
