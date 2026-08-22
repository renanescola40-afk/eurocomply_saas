begin;

-- Forward-only rollout guard for production onboarding state.
-- This identity intentionally precedes the active onboarding RPC reconciliation
-- so a later migration failure cannot leave previously completed tenants
-- downgraded to a synthetic not_started state.

do $preflight$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.onboarding_activation_runs') is null then
    raise exception 'onboarding state preservation prerequisites are incomplete';
  end if;
end
$preflight$;

alter table public.organizations
  add column if not exists country text,
  add column if not exists company_type text,
  add column if not exists sector text,
  add column if not exists ai_usage_summary text,
  add column if not exists onboarding_status text,
  add column if not exists onboarding_step text,
  add column if not exists selected_plan text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists readiness_score integer,
  add column if not exists trial_started_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

-- Normalize only explicit valid historical values first. Completed activation
-- evidence is then authoritative for organizations whose profile columns did not
-- yet exist when onboarding originally ran.
update public.organizations
set onboarding_status = lower(trim(onboarding_status))
where onboarding_status is not null
  and lower(trim(onboarding_status)) in ('not_started', 'in_progress', 'completed');

with latest_completed as (
  select distinct on (organization_id)
    organization_id,
    nullif(lower(trim(selected_plan)), '') as selected_plan,
    created_at
  from public.onboarding_activation_runs
  where lower(coalesce(status, '')) = 'completed'
  order by organization_id, created_at desc
)
update public.organizations as organizations
set
  onboarding_status = 'completed',
  onboarding_completed_at = coalesce(
    organizations.onboarding_completed_at,
    latest_completed.created_at
  ),
  selected_plan = coalesce(
    nullif(lower(trim(organizations.selected_plan)), ''),
    latest_completed.selected_plan
  )
from latest_completed
where organizations.id = latest_completed.organization_id;

update public.organizations
set onboarding_status = 'not_started'
where onboarding_status is null
   or onboarding_status not in ('not_started', 'in_progress', 'completed');

alter table public.organizations
  alter column onboarding_status set default 'not_started',
  alter column onboarding_status set not null;

do $verify$
begin
  if exists (
    select 1
    from public.onboarding_activation_runs as run
    join public.organizations as organization
      on organization.id = run.organization_id
    where lower(coalesce(run.status, '')) = 'completed'
      and organization.onboarding_status <> 'completed'
  ) then
    raise exception 'completed onboarding evidence was not preserved';
  end if;

  if exists (
    select 1
    from public.organizations
    where onboarding_status is null
       or onboarding_status not in ('not_started', 'in_progress', 'completed')
  ) then
    raise exception 'organization onboarding status normalization is incomplete';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
