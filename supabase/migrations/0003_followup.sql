-- V3: multi-user afstem-flow
--
-- Als beide reviewers hun batch hebben verzonden, vergelijkt de MegaVondr per
-- candidate de twee laatste committed votes:
--   ja+ja   → match, FAQ aanmaken, candidate.status = 'resolved'
--   nee+nee → match, archiveren, candidate.status = 'resolved'
--   alle andere combinaties (incl. één of beide 'pas/maybe') → CONFLICT
--     → er wordt een nieuwe batch (is_followup=true) gemaakt met
--       *kopieën* van de conflict-candidates (origin_candidate_id verwijst
--       naar de oorspronkelijke). Originele candidate wordt 'resolved'
--       gemarkeerd zodat de Swiper 'm niet meer toont in de oude batch.
--
-- Achterwaarts compatibel: bestaande batches/candidates blijven werken;
-- nieuwe velden zijn nullable of hebben sensible defaults.

-- ── swipe_batches: koppelvelden + reviewers + compared-flag ──────────

alter table public.swipe_batches
  add column if not exists parent_batch_id uuid
    references public.swipe_batches(id) on delete set null;

alter table public.swipe_batches
  add column if not exists is_followup boolean not null default false;

alter table public.swipe_batches
  add column if not exists reviewers text[] not null
    default array['dirk@vondr.ai','milan@vondr.ai']::text[];

-- Tijdstip waarop de MegaVondr deze batch heeft vergeleken (en eventueel een
-- followup heeft gemaakt). NULL = nog niet vergeleken.
alter table public.swipe_batches
  add column if not exists compared_at timestamptz;

create index if not exists idx_swipe_batches_parent
  on public.swipe_batches(parent_batch_id);

create index if not exists idx_swipe_batches_compared
  on public.swipe_batches(compared_at) where compared_at is null;

-- ── swipe_candidates: origin-link voor afstem-kopieën ─────────────────

alter table public.swipe_candidates
  add column if not exists origin_candidate_id uuid
    references public.swipe_candidates(id) on delete set null;

create index if not exists idx_swipe_candidates_origin
  on public.swipe_candidates(origin_candidate_id);

-- Geen nieuwe RLS-policies nodig: de bestaande "auth read" policies
-- werken vanzelf op de nieuwe kolommen. Schrijfacties (followup
-- aanmaken, compared_at zetten) gebeuren door service-role en bypassen
-- RLS sowieso.
