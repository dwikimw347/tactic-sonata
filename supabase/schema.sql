create extension if not exists pgcrypto;

create table if not exists public.multiplayer_rooms (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  player_x text,
  player_o text,
  player_x_id text,
  player_o_id text,
  current_turn text check (current_turn in ('X', 'O')),
  board jsonb not null default '[null, null, null, null, null, null, null, null, null]'::jsonb,
  skill_state jsonb not null default '{"player_x":{"insight":2,"undo":1,"shield":"ready"},"player_o":{"insight":2,"undo":1,"shield":"ready"}}'::jsonb,
  move_history jsonb not null default '[]'::jsonb,
  winner text,
  result_type text check (result_type in ('win', 'draw', 'afk', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_move_at timestamptz not null default now()
);

alter table public.multiplayer_rooms
  add column if not exists skill_state jsonb not null default '{"player_x":{"insight":2,"undo":1,"shield":"ready"},"player_o":{"insight":2,"undo":1,"shield":"ready"}}'::jsonb;

alter table public.multiplayer_rooms
  add column if not exists move_history jsonb not null default '[]'::jsonb;

create table if not exists public.multiplayer_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.multiplayer_rooms(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  message text not null check (char_length(message) <= 120),
  created_at timestamptz not null default now()
);

create table if not exists public.multiplayer_history (
  id uuid primary key default gen_random_uuid(),
  room_id uuid,
  player_x text,
  player_o text,
  winner text,
  result_type text not null check (result_type in ('win', 'draw', 'afk', 'left')),
  started_at timestamptz,
  ended_at timestamptz not null default now()
);

create index if not exists idx_multiplayer_rooms_status on public.multiplayer_rooms(status);
create index if not exists idx_multiplayer_rooms_updated_at on public.multiplayer_rooms(updated_at);
create index if not exists idx_multiplayer_messages_room_id on public.multiplayer_messages(room_id);
create index if not exists idx_multiplayer_messages_created_at on public.multiplayer_messages(created_at);
create index if not exists idx_multiplayer_history_player_x on public.multiplayer_history(player_x);
create index if not exists idx_multiplayer_history_player_o on public.multiplayer_history(player_o);
create index if not exists idx_multiplayer_history_ended_at on public.multiplayer_history(ended_at);

alter table public.multiplayer_rooms
  drop constraint if exists multiplayer_rooms_result_type_check;

alter table public.multiplayer_rooms
  add constraint multiplayer_rooms_result_type_check
  check (result_type in ('win', 'draw', 'afk', 'left'));

alter table public.multiplayer_history
  drop constraint if exists multiplayer_history_result_type_check;

alter table public.multiplayer_history
  add constraint multiplayer_history_result_type_check
  check (result_type in ('win', 'draw', 'afk', 'left'));

-- Demo mode: keep RLS disabled for simple GitHub Pages testing.
-- For production, enable RLS and replace this with authenticated policies.
alter table public.multiplayer_rooms disable row level security;
alter table public.multiplayer_messages disable row level security;
alter table public.multiplayer_history disable row level security;

-- Supabase Realtime: enable replication for these tables in the dashboard:
-- multiplayer_rooms
-- multiplayer_messages
