-- TacTic Sonata Auth schema
-- Run this in Supabase SQL Editor if you want to store auth users in Postgres.
-- The current Express implementation uses a local JSON store for development,
-- but this table mirrors the expected production-ready shape.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);
create index if not exists users_username_idx on public.users (username);

-- Production note:
-- Keep password_hash server-only. Do not expose this table directly to anon
-- clients unless strict RLS policies prevent selecting password_hash.
--
-- For a production Supabase implementation, enable RLS and create policies
-- that only allow a user to read/update their own public profile fields.
