-- 0003_faq.sql — FAQ-laag in Supabase
-- ──────────────────────────────────────────────────────────────────
-- Drie tabellen:
--   faq_entries     — de eigenlijke FAQ-rijen (vraag, antwoord, status, herkomst)
--   faq_entities    — glossary: entiteiten + abstractie ("Wistor" → "jullie CDE")
--   faq_categories  — taxonomie ("commercieel", "technisch", ...)
--
-- Schrijf-toegang: alleen service-role (MegaVondr).
-- Lees-toegang:    elke authenticated user (Dirk, Milan, ...).
--
-- Idempotent: alle CREATE's hebben "if not exists", policies droppen we eerst.
-- ──────────────────────────────────────────────────────────────────

-- ── 1. categories ─────────────────────────────────────────────────
create table if not exists public.faq_categories (
  id           uuid primary key default gen_random_uuid(),
  naam         text not null unique,
  beschrijving text,
  created_at   timestamptz not null default now()
);

-- ── 2. entities (de glossary die in de Claude-prompt landt) ────────
create table if not exists public.faq_entities (
  id          uuid primary key default gen_random_uuid(),
  naam        text not null unique,
  type        text not null check (type in
                ('klant','klant_tool','protocol','persoon','methode','project','ander')),
  abstractie  text,                              -- hoe het in de FAQ benoemd moet
  aliases     text[]      not null default '{}', -- ["Wistor BIM","WistorDB"]
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists faq_entities_type_idx on public.faq_entities (type);

-- ── 3. entries ─────────────────────────────────────────────────────
create table if not exists public.faq_entries (
  id                    uuid primary key default gen_random_uuid(),
  vraag                 text not null,
  antwoord              text not null,
  klant_quote           text,                                       -- bewijs (mag specifiek)
  status                text not null default 'active'
                        check (status in ('active','rejected','archived','superseded')),
  category_id           uuid references public.faq_categories(id) on delete set null,
  source_external_id    text unique,                                -- "mv-actie-faq-...-N"
  source_transcript_id  integer,                                    -- MegaVondr transcripts.id
  voted_by              text,                                       -- email goedkeurder
  voted_at              timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists faq_entries_status_idx   on public.faq_entries (status);
create index if not exists faq_entries_category_idx on public.faq_entries (category_id);

-- ── 4. Trigger: updated_at automatisch bijwerken ───────────────────
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists faq_entries_updated_at  on public.faq_entries;
create trigger faq_entries_updated_at  before update on public.faq_entries
  for each row execute function public.set_updated_at();

drop trigger if exists faq_entities_updated_at on public.faq_entities;
create trigger faq_entities_updated_at before update on public.faq_entities
  for each row execute function public.set_updated_at();

-- ── 5. RLS ─────────────────────────────────────────────────────────
alter table public.faq_categories enable row level security;
alter table public.faq_entities   enable row level security;
alter table public.faq_entries    enable row level security;

-- read voor iedereen die ingelogd is
drop policy if exists "auth read faq_categories" on public.faq_categories;
create policy "auth read faq_categories" on public.faq_categories
  for select using ( auth.role() = 'authenticated' );

drop policy if exists "auth read faq_entities" on public.faq_entities;
create policy "auth read faq_entities" on public.faq_entities
  for select using ( auth.role() = 'authenticated' );

drop policy if exists "auth read faq_entries" on public.faq_entries;
create policy "auth read faq_entries" on public.faq_entries
  for select using ( auth.role() = 'authenticated' );

-- (geen insert/update/delete-policy → alleen service-role kan schrijven)

-- ── 6. Seed: een paar bekende entiteiten zodat de prompt direct goed werkt ──
insert into public.faq_entities (naam, type, abstractie, aliases) values
  ('Wistor',   'klant_tool', 'jullie bestaande CDE',                  array['Wistor BIM','WistorDB']),
  ('ACC Build','klant_tool', 'jullie bestaande CDE',                  array['Autodesk Construction Cloud','ACC']),
  ('Relatix',  'klant_tool', 'jullie bestaande CDE',                  array[]::text[]),
  ('OTL',      'protocol',   'gestructureerde projectdata',           array['Object Type Library']),
  ('NLCS',     'protocol',   'standaard voor classificatie',          array[]::text[]),
  ('BAM',      'klant',      'de klant',                              array['BAM Infra','BAM Infra B.V.']),
  ('Strukton', 'klant',      'de klant',                              array[]::text[]),
  ('Heijmans', 'klant',      'de klant',                              array[]::text[]),
  ('TenneT',   'klant',      'de klant',                              array[]::text[])
on conflict (naam) do nothing;

insert into public.faq_categories (naam, beschrijving) values
  ('commercieel', 'pricing, contract, business case'),
  ('technisch',   'integratie, infrastructuur, security'),
  ('proces',      'pilot, onboarding, rolverdeling'),
  ('product',     'wat doet Vondr / wat doet het niet'),
  ('vertrouwen',  'datacontrole, training, compliance')
on conflict (naam) do nothing;
