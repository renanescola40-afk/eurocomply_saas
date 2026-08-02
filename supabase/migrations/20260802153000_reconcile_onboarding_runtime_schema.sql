-- Reconcile environments where the onboarding activation table exists but the
-- additive organization columns from 20260629100000_b2b_onboarding_activation_flow.sql
-- were not applied. This migration is idempotent and backfills only from the
-- latest completed tenant-bound activation run.

begin;

alter table if exists public.organizations
  add column if not exists onboarding_status text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists selected_plan text;

-- Normalize pre-existing values before enforcing the canonical status domain.
update public.organizations
set onboarding_status = case
  when lower(trim(coalesce(onboarding_status, ''))) in ('not_started', 'in_progress', 'completed')
    then lower(trim(onboarding_status))
  else 'not_started'
end;

-- Backfill completion provenance only when the activation ledger exposes all
-- required columns. Dynamic SQL keeps this migration safe on older schemas.
do $migration$
begin
  if to_regclass('public.onboarding_activation_runs') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'onboarding_activation_runs'
        and column_name = 'organization_id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'onboarding_activation_runs'
        and column_name = 'status'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'onboarding_activation_runs'
        and column_name = 'selected_plan'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'onboarding_activation_runs'
        and column_name = 'created_at'
    ) then
    execute $sql$
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
      where organizations.id = latest_completed.organization_id
    $sql$;
  end if;
end
$migration$;

update public.organizations
set onboarding_status = 'not_started'
where onboarding_status is null;

alter table if exists public.organizations
  alter column onboarding_status set default 'not_started',
  alter column onboarding_status set not null;

alter table if exists public.organizations
  drop constraint if exists organizations_onboarding_status_check;

alter table if exists public.organizations
  add constraint organizations_onboarding_status_check
  check (onboarding_status in ('not_started', 'in_progress', 'completed'));

create index if not exists organizations_onboarding_status_idx
  on public.organizations (onboarding_status);

comment on column public.organizations.onboarding_status is
  'Canonical onboarding lifecycle state, reconciled from completed activation runs when legacy rollout columns were absent.';
comment on column public.organizations.onboarding_completed_at is
  'Timestamp of completed onboarding; backfilled from the latest completed activation run when available.';
comment on column public.organizations.selected_plan is
  'Canonical onboarding-selected plan, normalized to lowercase when reconciled from activation evidence.';

commit;

-- Rollback guidance:
-- Do not drop these columns while application code or runtime proofs depend on
-- them. To undo only the backfill, restore the affected organization rows from
-- a pre-migration backup and retain the additive schema.
