-- Vondr — voorbeeld-job voor first-login demo
-- Pas de user_id aan zodra je een Supabase-user hebt aangemaakt voor dirk@vondr.ai

do $$
declare
  org_id uuid;
  job_id uuid;
begin
  insert into public.organizations (name) values ('Vondr')
    returning id into org_id;

  insert into public.jobs (org_id, source, title, description, approval_mode, deadline)
  values (
    org_id,
    'nextbim',
    'Datakwaliteit — Project Westflank, fase ramen',
    'Het BIM-model heeft 12 objecten met afwijkende naamgeving. Bekijk per object of de voorgestelde naam klopt en accepteer of wijs af.',
    'single',
    now() + interval '5 days'
  )
  returning id into job_id;

  insert into public.questions (job_id, external_id, suggestion, reason, position) values
    (job_id, 'WND-3F-021', 'Object ''WND-3F-021'' hernoemen naar ''WND-03-021''',
      'Andere ramen op dezelfde verdieping volgen het patroon WND-{verdieping}-{nummer}.', 1),
    (job_id, 'DR-G-007', 'Deur ''DR-G-007'' classificeren als ''binnendeur'' i.p.v. ''buitendeur''',
      'De deur grenst aan twee verwarmde ruimtes — niet aan buitenklimaat.', 2),
    (job_id, 'WL-2-014', 'Wandtype ''WL-2-014'' aanpassen van ''gipsplaat'' naar ''kalkzandsteen''',
      'Naastliggende wanden zijn allemaal kalkzandsteen 100mm.', 3);
end $$;
