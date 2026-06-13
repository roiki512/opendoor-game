// ============================================================
//  GLOBAL LEADERBOARD BACKEND (optional)
//
//  Leave these blank and the game uses a per-device leaderboard
//  (localStorage) — exactly as before. Fill them in to switch on
//  a shared, company-wide board.
//
//  Easiest free backend = Supabase (supabase.com):
//    1. Create a free project.
//    2. In the SQL editor, run:
//
//       create table scores (
//         id bigint generated always as identity primary key,
//         name text not null,
//         score double precision not null,
//         created_at timestamptz default now()
//       );
//       alter table scores enable row level security;
//       create policy "anyone can read"  on scores for select using (true);
//       create policy "anyone can insert" on scores for insert with check (true);
//
//    3. Project Settings -> API: copy the "Project URL" and the
//       "anon public" key into the two fields below.
//
//  The anon key is SAFE to ship in the browser — that's what it's
//  designed for; row-level security controls what it can do.
// ============================================================

export const SUPABASE_URL: string = 'https://ttjqeqqyfavogvuxdxuj.supabase.co';
export const SUPABASE_ANON_KEY: string =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0anFlcXF5ZmF2b2d2dXhkeHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDc1ODYsImV4cCI6MjA5Njg4MzU4Nn0.BKQ_QZtWybhBM5pu2vWTGOuEIlmlGd8L3HFqvGkGD2I';

/** Global board is active only when both values above are filled in. */
export const REMOTE_ENABLED = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
