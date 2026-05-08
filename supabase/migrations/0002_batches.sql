-- V2: batch-flow
-- Kandidaten worden gegroepeerd in batches (bv. "Update FAQ op basis van
-- gesprek BAM"). Gebruiker doorloopt batch, ziet samenvatting, kiest
-- 'verzenden'. Voor verzending zijn votes 'draft' — MegaVondr negeert ze.
--
-- Achterwaarts compatibel: candidates zonder batch_id blijven werken in de
-- flat 'losse kaarten'-stack en worden meteen committed (is_draft=false).

create table if not exists public.swipe_batches (
  id              uuid primary key default gen_random_uuid(),
  external_id     text not null unique,
  source          text not null default 'newmegavondr',
  title           text not null,
  klant_naam      text,
  meeting_datum   date,
  created_at      timestamptz not null default now()
);

create index if not exists idx_swipe_batches_created on public.swipe_batches(created_at);

alter table public.swipe_candidates
  add column if not exists batch_id uuid
    references public.swipe_batches(id) on delete set null;

create index if not exists idx_swipe_candidates_batch
  on public.swipe_candidates(batch_id);

alter table public.swipe_votes
  add column if not exists is_draft boolean not null default false;

create index if not exists idx_swipe_votes_draft
  on public.swipe_votes(voted_by, is_draft);

-- RLS

alter table public.swipe_batches enable row level security;

drop policy if exists "auth read batches" on public.swipe_batches;
create policy "auth read batches" on public.swipe_batches
  for select using ( auth.role() = 'authenticated' );

-- Users mogen hun eigen draft-votes flippen naar non-draft (verzenden) en
-- wijzigen (decision update bij re-swipe). Geen UPDATE-policy bestond nog.
drop policy if exists "auth update own vote" on public.swipe_votes;
create policy "auth update own vote" on public.swipe_votes
  for update using ( auth.email() = voted_by )
  with check ( auth.email() = voted_by );

-- MegaVondr contract: MegaVondr moet alleen non-draft votes verwerken. Voorbeeld-query
-- voor de MegaVondr:
--   select * from swipe_votes
--   where is_draft = false
--     and voted_at > $cursor
--   order by voted_at asc;
