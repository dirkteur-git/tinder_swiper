-- V4: multi-type swipe-candidates + inbound API tokens
--
-- Maakt het mogelijk om naast tekst-types (FAQ, Doctrine, ...) ook
-- visuele types te swipen: Brand-asset (logo/icoon), Visual-mockup,
-- Copy-keuze (A/B), enz. Type-specifieke data leeft in `payload` (jsonb),
-- afbeeldingen in `media` (jsonb-array).
--
-- Ingest-tokens vervangen het delen van de service-role-key. Externe
-- bronnen (MegaVondr, klant-tooling, ...) krijgen een token + endpoint
-- /api/v1/candidates.

-- ── swipe_candidates: payload + media ──────────────────────────────

alter table public.swipe_candidates
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.swipe_candidates
  add column if not exists media jsonb not null default '[]'::jsonb;

-- Index op payload voor toekomstige type-specifieke queries
create index if not exists idx_swipe_candidates_payload
  on public.swipe_candidates using gin (payload);

-- ── swipe_ingest_tokens: API-tokens (vervanger voor service-role-key sharing) ──

create table if not exists public.swipe_ingest_tokens (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                              -- mens-leesbaar, bv "MegaVondr-prod"
  token_hash   text not null unique,                       -- sha256 hex van de plain token
  source       text not null,                              -- bv "megavondr", "klant-portal"
  scopes       text[] not null default array['candidates:write']::text[],
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create index if not exists idx_ingest_tokens_active
  on public.swipe_ingest_tokens(token_hash) where revoked_at is null;

-- Geen RLS-policies — service-role only (het API-endpoint gebruikt
-- service-role-key intern; clients praten alleen via /api/v1/...).
alter table public.swipe_ingest_tokens enable row level security;
