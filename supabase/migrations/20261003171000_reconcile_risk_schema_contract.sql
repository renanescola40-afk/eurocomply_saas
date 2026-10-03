begin;

alter table public.risks
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists mitigation text,
  add column if not exists due_date date;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'risks'
      and column_name = 'owner_id'
  ) then
    execute 'update public.risks set owner_user_id = owner_id where owner_user_id is null and owner_id is not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'risks'
      and column_name = 'treatment_plan'
  ) then
    execute 'update public.risks set mitigation = treatment_plan where mitigation is null and treatment_plan is not null';
  end if;
end;
$$;

create index if not exists idx_risks_owner_user_id_fk
  on public.risks (owner_user_id);

create or replace function public.sync_legacy_risk_score()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.likelihood::text ~ '^[1-5]$'
     and new.impact::text ~ '^[1-5]$' then
    new.risk_score := new.likelihood::text::integer * new.impact::text::integer;
  end if;
  return new;
end;
$$;

do $$
declare
  score_generation text;
begin
  select is_generated
    into score_generation
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'risks'
    and column_name = 'risk_score';

  if score_generation = 'NEVER' then
    drop trigger if exists sync_legacy_risk_score on public.risks;
    create trigger sync_legacy_risk_score
      before insert or update of likelihood, impact
      on public.risks
      for each row
      execute function public.sync_legacy_risk_score();
  end if;
end;
$$;

commit;
