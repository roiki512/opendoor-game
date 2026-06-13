// Top-10 leaderboard. By default it's per-device (localStorage). If a backend
// is configured in config/backend.ts, a shared global board is layered on top:
// the global standings are cached in memory and shown when available, with the
// local board as an always-works fallback.

import { SUPABASE_URL, SUPABASE_ANON_KEY, REMOTE_ENABLED } from './config/backend';

export interface LeaderboardEntry {
  name: string;
  /** Peak price reached. */
  score: number;
  date: string; // ISO date, shown as YYYY-MM-DD
}

const KEY = 'openFaster.leaderboard';
export const MAX_ENTRIES = 10;

/** Latest fetched global standings (null until a fetch succeeds). */
let remoteCache: LeaderboardEntry[] | null = null;

function loadLocal(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => typeof e?.name === 'string' && Number.isFinite(e?.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/** The board to display: global standings if we have them, else local. */
export function loadLeaderboard(): LeaderboardEntry[] {
  if (REMOTE_ENABLED && remoteCache) return remoteCache;
  return loadLocal();
}

/** True when a shared global board is active and loaded. */
export function isGlobal(): boolean {
  return REMOTE_ENABLED && remoteCache !== null;
}

/** Does this score make the top 10 of whatever board is in play? */
export function qualifies(score: number): boolean {
  const board = loadLeaderboard();
  if (board.length < MAX_ENTRIES) return score > 0;
  return score > board[board.length - 1].score;
}

/**
 * Add an entry. Always writes the local board; when a backend is configured,
 * also posts to the global board (fire-and-forget). Returns the local board and
 * the inserted index (for the "you placed #N" highlight).
 */
export function addEntry(name: string, score: number): {
  board: LeaderboardEntry[];
  index: number;
} {
  const cleanName = name.trim().slice(0, 12) || 'ANON';
  const entry: LeaderboardEntry = {
    name: cleanName,
    score,
    date: new Date().toISOString().slice(0, 10),
  };
  const board = [...loadLocal(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(board));
  } catch {
    // storage full/blocked — play on without persisting
  }
  if (REMOTE_ENABLED) void submitRemote(cleanName, score);
  return { board, index: board.indexOf(entry) };
}

// ---- Global board (Supabase REST) ----

/** Fetch the global top 10 into the cache. No-op/quiet on any failure. */
export async function refreshRemote(): Promise<void> {
  if (!REMOTE_ENABLED) return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?select=name,score,created_at&order=score.desc&limit=${MAX_ENTRIES}`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return;
    const rows = (await res.json()) as { name: string; score: number; created_at?: string }[];
    remoteCache = rows
      .filter((r) => typeof r?.name === 'string' && Number.isFinite(r?.score))
      .map((r) => ({ name: r.name, score: r.score, date: (r.created_at ?? '').slice(0, 10) }))
      .slice(0, MAX_ENTRIES);
  } catch {
    // offline / blocked — keep showing whatever we last had (or local)
  }
}

async function submitRemote(name: string, score: number): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, score }),
    });
    await refreshRemote();
  } catch {
    // couldn't post — the local board still recorded it
  }
}
