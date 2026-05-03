-- Vondr — Row Level Security policies

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.api_keys enable row level security;
alter table public.jobs enable row level security;
alter table public.job_assignees enable row level security;
alter table public.questions enable row level security;
alter table public.votes enable row level security;
alter table public.outcomes enable row level security;
alter table public.webhooks enable row level security;
alter table public.webhook_deliveries enable row level security;

-- ---------- helpers ----------

create or replace function public.current_org_ids()
returns setof uuid language sql stable security definer as $$
  select org_id from public.memberships where user_id = auth.uid()
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and org_id = org and role in ('admin','founder')
  )
$$;

-- ---------- organizations ----------
create policy org_select on public.organizations
  for select using (id in (select public.current_org_ids()));

-- ---------- memberships ----------
create policy mem_select_self on public.memberships
  for select using (user_id = auth.uid());

-- ---------- jobs ----------
create policy jobs_select on public.jobs
  for select using (
    org_id in (select public.current_org_ids())
    and exists (
      select 1 from public.job_assignees ja
      where ja.job_id = jobs.id and ja.user_id = auth.uid()
    )
  );

-- ---------- job_assignees ----------
create policy ja_select on public.job_assignees
  for select using (user_id = auth.uid()
    or job_id in (select id from public.jobs));

-- ---------- questions ----------
create policy q_select on public.questions
  for select using (job_id in (select id from public.jobs));

-- ---------- votes ----------
-- Insert: alleen voor jezelf, op een question die je mag zien
create policy votes_insert on public.votes
  for insert with check (
    user_id = auth.uid()
    and question_id in (select id from public.questions)
  );

-- Select eigen stem: altijd
create policy votes_select_own on public.votes
  for select using (user_id = auth.uid());

-- Select andermans stem: pas wanneer eigen stem is uitgebracht OF outcome bestaat
create policy votes_select_others on public.votes
  for select using (
    user_id <> auth.uid()
    and question_id in (select id from public.questions)
    and (
      exists (
        select 1 from public.votes v2
        where v2.question_id = votes.question_id and v2.user_id = auth.uid()
      )
      or exists (
        select 1 from public.outcomes o
        where o.question_id = votes.question_id
      )
    )
  );

-- ---------- outcomes ----------
create policy outcomes_select on public.outcomes
  for select using (question_id in (select id from public.questions));

-- ---------- api_keys / webhooks (alleen admin/founder) ----------
create policy api_keys_admin on public.api_keys
  for all using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy webhooks_admin on public.webhooks
  for all using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy deliveries_admin on public.webhook_deliveries
  for all using (
    webhook_id in (
      select id from public.webhooks where public.is_org_admin(org_id)
    )
  );
