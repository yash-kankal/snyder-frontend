-- ============================================================
-- Episode Progress — run this once in the Supabase SQL editor.
-- Tracks which individual TV episodes a user has marked watched.
-- show_id is the TMDB show id stored as text.
-- ============================================================

create table if not exists public.episode_progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  show_id        text not null,
  season_number  int  not null,
  episode_number int  not null,
  marked_at      timestamptz not null default now(),
  unique (user_id, show_id, season_number, episode_number)
);

create index if not exists ep_progress_user_show_idx
  on public.episode_progress (user_id, show_id);

alter table public.episode_progress enable row level security;

drop policy if exists "ep_progress_select_own" on public.episode_progress;
create policy "ep_progress_select_own" on public.episode_progress
  for select using (auth.uid() = user_id);

drop policy if exists "ep_progress_insert_own" on public.episode_progress;
create policy "ep_progress_insert_own" on public.episode_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "ep_progress_delete_own" on public.episode_progress;
create policy "ep_progress_delete_own" on public.episode_progress
  for delete using (auth.uid() = user_id);
