-- Vondr Swiper — initiële schema
-- Run dit in Supabase Studio → SQL Editor.
--
-- Architectuur: MegaVondr schrijft kandidaten (via service-role-key), swiper leest
-- ze + schrijft votes. MegaVondr leest votes en muteert status. Swiper raakt
-- swipe_candidates.status NIET aan.

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────────
-- swipe_candidates — wat de MegaVondr erin zet
-- ────────────────────────────────────────────────────────────────────

create table if not exists public.swipe_candidates (
  id                uuid primary key default gen_random_uuid(),
  external_id       text not null unique,
  source            text not null default 'newmegavondr',
  type              text not null,
  suggestion        text not null,
  proposed_answer   text,
  klant_naam        text,
  klant_quote       text,
  meeting_datum     date,
  reason_long       text,
  bron              text,
  facts_json        jsonb,
  requires_double   boolean not null default false,
  status            text not null default 'open' check (status in ('open','resolved','archived')),
  created_at        timestamptz not null default now()
);

create index if not exists idx_swipe_candidates_status
  on public.swipe_candidates (status);

-- ────────────────────────────────────────────────────────────────────
-- swipe_votes — wat de swiper erin zet
-- ────────────────────────────────────────────────────────────────────

create table if not exists public.swipe_votes (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid not null references public.swipe_candidates(id) on delete cascade,
  external_id       text not null,
  decision          text not null check (decision in ('yes','no','maybe')),
  voted_by          text,
  edited_suggestion text,
  edited_answer     text,
  voted_at          timestamptz not null default now()
);

create index if not exists idx_swipe_votes_voted_at
  on public.swipe_votes (voted_at);

create index if not exists idx_swipe_votes_candidate
  on public.swipe_votes (candidate_id);

create index if not exists idx_swipe_votes_voted_by
  on public.swipe_votes (voted_by);

-- ────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────

alter table public.swipe_candidates enable row level security;
alter table public.swipe_votes      enable row level security;

-- Iedereen die ingelogd is mag kandidaten lezen
drop policy if exists "auth read candidates" on public.swipe_candidates;
create policy "auth read candidates" on public.swipe_candidates
  for select using ( auth.role() = 'authenticated' );

-- Browser-clients mogen kandidaten NIET schrijven. Alleen service-role
-- (MegaVondr) kan dit, want service-role bypass't RLS automatisch. Geen extra
-- policy nodig — afwezigheid = geblokkeerd.

-- Ingelogde users mogen votes inserten waar voted_by = hun eigen email
drop policy if exists "auth insert vote" on public.swipe_votes;
create policy "auth insert vote" on public.swipe_votes
  for insert with check ( auth.email() = voted_by );

-- Iedereen die ingelogd is mag votes lezen (voor undo + audit)
drop policy if exists "auth read votes" on public.swipe_votes;
create policy "auth read votes" on public.swipe_votes
  for select using ( auth.role() = 'authenticated' );

-- Users mogen hun eigen votes verwijderen (voor undo).
-- Niet in originele spec maar nodig voor schone undo-UX. MegaVondr ziet
-- daardoor geen "spook"-stem meer als gebruiker undo't.
drop policy if exists "auth delete own vote" on public.swipe_votes;
create policy "auth delete own vote" on public.swipe_votes
  for delete using ( auth.email() = voted_by );
