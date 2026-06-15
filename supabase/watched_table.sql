-- ============================================================
-- Watch Diary — run this once in the Supabase SQL editor.
-- Mirrors the existing `favorites` table conventions:
--   movie_id is text; TV ids are stored prefixed as 'tv-<id>'.
-- ============================================================

create table if not exists public.watched (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  movie_id          text not null,
  movie_title       text,
  movie_poster_path text,
  media_type        text not null default 'movie',
  watched_at        date not null default current_date,
  created_at        timestamptz not null default now(),
  unique (user_id, movie_id)
);

create index if not exists watched_user_idx on public.watched (user_id, watched_at desc);

-- Row Level Security: each user only sees / edits their own diary.
alter table public.watched enable row level security;

drop policy if exists "watched_select_own" on public.watched;
create policy "watched_select_own" on public.watched
  for select using (auth.uid() = user_id);

drop policy if exists "watched_insert_own" on public.watched;
create policy "watched_insert_own" on public.watched
  for insert with check (auth.uid() = user_id);

drop policy if exists "watched_update_own" on public.watched;
create policy "watched_update_own" on public.watched
  for update using (auth.uid() = user_id);

drop policy if exists "watched_delete_own" on public.watched;
create policy "watched_delete_own" on public.watched
  for delete using (auth.uid() = user_id);
