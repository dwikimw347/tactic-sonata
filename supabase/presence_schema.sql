-- TacTic Sonata user presence schema
-- Run this in Supabase SQL Editor, then enable Realtime for user_presence.

create extension if not exists pgcrypto;

create table if not exists public.user_presence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  username text not null,
  status text not null default 'offline'
    check (status in ('online', 'offline', 'searching', 'in_match')),
  current_room_id uuid,
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_presence_username on public.user_presence(username);
create index if not exists idx_user_presence_status on public.user_presence(status);
create index if not exists idx_user_presence_last_seen on public.user_presence(last_seen);
create index if not exists idx_user_presence_room on public.user_presence(current_room_id);

create unique index if not exists idx_user_presence_user_id_unique
  on public.user_presence(user_id)
  where user_id is not null;

create unique index if not exists idx_user_presence_username_unique
  on public.user_presence(lower(username));

-- Demo mode: keep RLS disabled for quick GitHub Pages testing.
-- For production, enable RLS and add policies that allow anon/authenticated
-- clients to select presence and only upsert/update their own row.
alter table public.user_presence disable row level security;

-- Supabase Realtime:
-- In the dashboard, enable Realtime replication for:
-- user_presence
