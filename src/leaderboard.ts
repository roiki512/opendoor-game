// Local top-10 leaderboard, persisted in this browser's localStorage.
// (Per-device: for a company-wide shared board you'd need a tiny backend.)

export interface LeaderboardEntry {
  name: string;
  /** Peak price reached. */
  score: number;
  date: string; // ISO date, shown as YYYY-MM-DD
}

const KEY = 'openFaster.leaderboard';
export const MAX_ENTRIES = 10;

export function loadLeaderboard(): LeaderboardEntry[] {
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

/** Does this score make the top 10? */
export function qualifies(score: number): boolean {
  const board = loadLeaderboard();
  if (board.length < MAX_ENTRIES) return score > 0;
  return score > board[board.length - 1].score;
}

/** Add an entry; returns the new board and the inserted index (-1 if cut). */
export function addEntry(name: string, score: number): {
  board: LeaderboardEntry[];
  index: number;
} {
  const entry: LeaderboardEntry = {
    name: name.trim().slice(0, 12) || 'ANON',
    score,
    date: new Date().toISOString().slice(0, 10),
  };
  const board = [...loadLeaderboard(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(board));
  } catch {
    // storage full/blocked — play on without persisting
  }
  return { board, index: board.indexOf(entry) };
}
