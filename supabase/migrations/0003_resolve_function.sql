-- Vondr — vote-resolutie state machine
-- Wordt na elke votes-insert getriggerd. Schrijft outcomes-row als resolutie definitief is.

create or replace function public.resolve_question(qid uuid)
returns void language plpgsql security definer as $$
declare
  job_mode text;
  v_yes int;
  v_no int;
  v_total int;
begin
  select j.approval_mode into job_mode
    from public.jobs j
    join public.questions q on q.job_id = j.id
    where q.id = qid;

  -- Schrijf alleen wanneer er nog geen outcome is
  if exists (select 1 from public.outcomes where question_id = qid) then
    return;
  end if;

  if job_mode = 'single' then
    select count(*) filter (where decision = 'yes'),
           count(*) filter (where decision = 'no'),
           count(*) filter (where decision in ('yes','no'))
      into v_yes, v_no, v_total
      from public.votes where question_id = qid;
    if v_total >= 1 then
      insert into public.outcomes (question_id, outcome)
        values (qid, case when v_yes >= 1 then 'matched_yes' else 'rejected' end);
    end if;
    return;
  end if;

  if job_mode = 'double' then
    -- twee non-maybe stemmen van verschillende users
    select count(*) filter (where decision = 'yes'),
           count(*) filter (where decision = 'no'),
           count(*) filter (where decision in ('yes','no'))
      into v_yes, v_no, v_total
      from public.votes where question_id = qid;
    if v_total >= 2 then
      insert into public.outcomes (question_id, outcome) values (
        qid,
        case
          when v_yes = 2 then 'matched_yes'
          when v_no = 2 then 'rejected'
          else 'conflict'
        end
      );
    end if;
    return;
  end if;

  -- founders_unanimous — buiten PoC scope
end;
$$;

create or replace function public.trg_resolve_after_vote()
returns trigger language plpgsql as $$
begin
  perform public.resolve_question(new.question_id);
  return new;
end;
$$;

drop trigger if exists votes_resolve on public.votes;
create trigger votes_resolve
  after insert on public.votes
  for each row execute function public.trg_resolve_after_vote();
