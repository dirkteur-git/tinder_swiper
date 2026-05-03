-- Vondr swipe-PWA — initiële schema
-- Auth-users worden door Supabase beheerd in auth.users

create extension if not exists "pgcrypto";

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table public.memberships (
  user_id uuid references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  role text not null default 'member',
  primary key (user_id, org_id)
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  source_label text not null,
  hashed_key text not null,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  source text not null,
  title text not null,
  description text,
  approval_mode text not null default 'single' check (approval_mode in ('single','double','founders_unanimous')),
  deadline timestamptz,
  status text not null default 'open' check (status in ('open','done','cancelled')),
  created_at timestamptz default now()
);

create table public.job_assignees (
  job_id uuid references public.jobs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (job_id, user_id)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  external_id text,
  suggestion text not null,
  reason text not null,
  reason_long text,
  image_url text,
  deeplink text,
  metadata jsonb default '{}'::jsonb,
  position int not null,
  is_calibration boolean default false,
  created_at timestamptz default now()
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  decision text not null check (decision in ('yes','no','maybe')),
  created_at timestamptz default now(),
  unique (question_id, user_id)
);

create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade unique,
  outcome text not null check (outcome in ('matched_yes','rejected','conflict')),
  resolved_at timestamptz default now()
);

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  source text not null,
  url text not null,
  secret text not null,
  created_at timestamptz default now()
);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid references public.webhooks(id) on delete cascade,
  payload jsonb not null,
  status int,
  attempts int default 0,
  last_attempt_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index idx_jobs_org on public.jobs(org_id);
create index idx_questions_job on public.questions(job_id);
create index idx_votes_question on public.votes(question_id);
create index idx_votes_user on public.votes(user_id);
create index idx_deliveries_status on public.webhook_deliveries(status, attempts);
