begin;

-- Harden the compatibility scope introduced by the Gap Analysis reconciliation.
-- Organization-scoped task mutations remain backend-only; authenticated browser
-- DML is limited to creation of a personal task that is cryptographically bound
-- by auth.uid() and cannot be moved into an organization scope.
--
-- This selected forward migration is not present in the production migration
-- ledger. It also closes the live compliance_metric_snapshots tenant-isolation
-- gap discovered during production audit without rewriting any applied history.

do $guard$
begin
  if to_regclass('public.compliance_tasks') is null then
    raise exception 'required canonical table public.compliance_tasks is missing';
  end if;
  if to_regclass('public.compliance_findings') is null then
    raise exception 'required reconciled table public.compliance_findings is missing';
  end if;
  if to_regclass('public.compliance_metric_snapshots') is null then
    raise exception 'required canonical table public.compliance_metric_snapshots is missing';
  end if;
end
$guard$;

-- Replace the broad OR scope check with mutually exclusive tenant shapes. New
-- compatibility columns must stay null on organization rows so a row cannot
-- carry both an organization authority and a personal/finding authority.
alter table public.compliance_tasks
  drop constraint if exists compliance_tasks_requires_tenant_scope;

alter table public.compliance_tasks
  add constraint compliance_tasks_requires_tenant_scope
  check (
    (
      organization_id is not null
      and user_id is null
      and workspace_id is null
      and finding_id is null
      and owner_id is null
    )
    or
    (
      organization_id is null
      and user_id is not null
      and workspace_id is null
    )
  ) not valid;

alter table public.compliance_tasks
  validate constraint compliance_tasks_requires_tenant_scope;

-- Reassert the 20260720061000 backend-only organization mutation boundary.
-- Personal Gap Analysis creation is the only direct authenticated mutation that
-- remains necessary for the current client flow. UPDATE/DELETE stay revoked.
revoke insert, update, delete on table public.compliance_tasks from anon;
revoke insert, update, delete on table public.compliance_tasks from authenticated;
grant select, insert on table public.compliance_tasks to authenticated;
grant select, insert, update, delete on table public.compliance_tasks to service_role;

-- Later RLS reconciliation recreated these organization mutation policies. They
-- are unnecessary for service_role server actions and would become dangerous as
-- soon as authenticated INSERT were granted for the personal compatibility path.
drop policy if exists "rls_compliance_tasks_insert_writer" on public.compliance_tasks;
drop policy if exists "rls_compliance_tasks_update_writer" on public.compliance_tasks;
drop policy if exists "rls_compliance_tasks_delete_admin" on public.compliance_tasks;

-- Personal updates are not used by the current Gap Analysis runtime. Keep them
-- behind the backend boundary instead of widening the browser mutation surface.
drop policy if exists "users can update own compliance tasks" on public.compliance_tasks;
drop policy if exists "rls_compliance_tasks_update_personal" on public.compliance_tasks;

-- The pre-reconciliation INSERT guard deliberately blocked every authenticated
-- insert while the compatibility migration ran. Release only that one guard now;
-- UPDATE/DELETE guards stay permanently restrictive as defense in depth.
drop policy if exists "restrict_authenticated_compliance_task_insert_during_reconciliation" on public.compliance_tasks;

-- Recreate the personal insert policy with every user-bearing relationship bound
-- to the current authenticated subject. A known UUID from another user/tenant is
-- not enough to create a cross-scope relationship.
drop policy if exists "rls_compliance_tasks_insert_personal" on public.compliance_tasks;
create policy "rls_compliance_tasks_insert_personal"
  on public.compliance_tasks
  for insert
  to authenticated
  with check (
    organization_id is null
    and workspace_id is null
    and user_id = auth.uid()
    and (owner_id is null or owner_id = auth.uid())
    and (created_by is null or created_by = auth.uid())
    and (assigned_to is null or assigned_to = auth.uid())
    and (
      finding_id is null
      or exists (
        select 1
        from public.compliance_findings cf
        where cf.id = compliance_tasks.finding_id
          and cf.user_id = auth.uid()
      )
    )
  );

-- Defense in depth: PostgreSQL ANDs RESTRICTIVE policies with the OR of all
-- permissive policies. This guard prevents a future permissive organization
-- insert policy from accidentally reopening direct organization writes while the
-- authenticated table-level INSERT grant exists for personal creation.
drop policy if exists "restrict_authenticated_compliance_task_insert_to_personal" on public.compliance_tasks;
create policy "restrict_authenticated_compliance_task_insert_to_personal"
  on public.compliance_tasks
  as restrictive
  for insert
  to authenticated
  with check (
    organization_id is null
    and workspace_id is null
    and user_id = auth.uid()
    and (owner_id is null or owner_id = auth.uid())
    and (created_by is null or created_by = auth.uid())
    and (assigned_to is null or assigned_to = auth.uid())
  );

-- compliance_metric_snapshots is written and read exclusively by server-side
-- administrative code. The live schema still carries a legacy authenticated
-- allow-all metric snapshot read policy, which would expose every tenant
-- snapshot to every authenticated browser once rows exist.
-- Fail closed instead: require a tenant id on every row, remove all browser RLS
-- policies and table privileges, and retain only explicit backend authority.
do $snapshot_preconditions$
begin
  if exists (
    select 1
    from public.compliance_metric_snapshots
    where organization_id is null
  ) then
    raise exception 'compliance_metric_snapshots contains rows without organization_id';
  end if;
end
$snapshot_preconditions$;

alter table public.compliance_metric_snapshots
  alter column organization_id set not null;
alter table public.compliance_metric_snapshots enable row level security;
alter table public.compliance_metric_snapshots force row level security;

do $drop_snapshot_policies$
declare
  snapshot_policy record;
begin
  for snapshot_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_metric_snapshots'
  loop
    execute format(
      'drop policy if exists %I on public.compliance_metric_snapshots',
      snapshot_policy.policyname
    );
  end loop;
end
$drop_snapshot_policies$;

revoke all on table public.compliance_metric_snapshots from public, anon, authenticated;
grant select, insert, update, delete on table public.compliance_metric_snapshots to service_role;

-- Fail closed on the exact privilege/policy posture required by the client and
-- the audited/rate-limited organization task server actions.
do $verify$
declare
  permanent_mutation_guard_count integer;
  snapshots_rls_enabled boolean;
  snapshots_force_rls boolean;
begin
  if not has_table_privilege('authenticated', 'public.compliance_tasks', 'SELECT') then
    raise exception 'authenticated compliance_tasks SELECT privilege is missing';
  end if;

  if not has_table_privilege('authenticated', 'public.compliance_tasks', 'INSERT') then
    raise exception 'authenticated personal compliance_tasks INSERT privilege is missing';
  end if;

  if has_table_privilege('authenticated', 'public.compliance_tasks', 'UPDATE')
     or has_table_privilege('authenticated', 'public.compliance_tasks', 'DELETE') then
    raise exception 'authenticated compliance_tasks UPDATE/DELETE must remain backend-only';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname in (
        'rls_compliance_tasks_insert_writer',
        'rls_compliance_tasks_update_writer',
        'rls_compliance_tasks_delete_admin'
      )
  ) then
    raise exception 'organization compliance_tasks mutation policy unexpectedly remains active';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname = 'rls_compliance_tasks_select_member'
  ) then
    raise exception 'organization compliance_tasks read policy is missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname = 'rls_compliance_tasks_select_personal'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname = 'rls_compliance_tasks_insert_personal'
  ) then
    raise exception 'personal compliance_tasks RLS policy set is incomplete';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname = 'restrict_authenticated_compliance_task_insert_to_personal'
      and permissive = 'RESTRICTIVE'
  ) then
    raise exception 'restrictive personal compliance_tasks insert guard is missing';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname = 'restrict_authenticated_compliance_task_insert_during_reconciliation'
  ) then
    raise exception 'transitional compliance_tasks insert guard was not retired';
  end if;

  select count(*)
    into permanent_mutation_guard_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'compliance_tasks'
    and policyname in (
      'restrict_authenticated_compliance_task_update_during_reconciliation',
      'restrict_authenticated_compliance_task_delete_during_reconciliation'
    )
    and permissive = 'RESTRICTIVE'
    and roles = array['authenticated']::name[];

  if permanent_mutation_guard_count <> 2 then
    raise exception 'authenticated compliance_tasks permanent update/delete guard is incomplete';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.compliance_tasks'::regclass
      and conname = 'compliance_tasks_requires_tenant_scope'
      and contype = 'c'
      and convalidated
  ) then
    raise exception 'exclusive compliance_tasks tenant-scope constraint is missing or unvalidated';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_metric_snapshots'
  ) then
    raise exception 'compliance_metric_snapshots must not expose browser RLS policies';
  end if;

  if has_table_privilege('anon', 'public.compliance_metric_snapshots', 'SELECT')
     or has_table_privilege('anon', 'public.compliance_metric_snapshots', 'INSERT')
     or has_table_privilege('anon', 'public.compliance_metric_snapshots', 'UPDATE')
     or has_table_privilege('anon', 'public.compliance_metric_snapshots', 'DELETE')
     or has_table_privilege('authenticated', 'public.compliance_metric_snapshots', 'SELECT')
     or has_table_privilege('authenticated', 'public.compliance_metric_snapshots', 'INSERT')
     or has_table_privilege('authenticated', 'public.compliance_metric_snapshots', 'UPDATE')
     or has_table_privilege('authenticated', 'public.compliance_metric_snapshots', 'DELETE') then
    raise exception 'compliance_metric_snapshots browser privileges are not fully revoked';
  end if;

  if not has_table_privilege('service_role', 'public.compliance_metric_snapshots', 'SELECT')
     or not has_table_privilege('service_role', 'public.compliance_metric_snapshots', 'INSERT') then
    raise exception 'compliance_metric_snapshots service-role runtime privileges are incomplete';
  end if;

  select c.relrowsecurity, c.relforcerowsecurity
    into snapshots_rls_enabled, snapshots_force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'compliance_metric_snapshots'
    and c.relkind in ('r', 'p');

  if not coalesce(snapshots_rls_enabled, false)
     or not coalesce(snapshots_force_rls, false) then
    raise exception 'compliance_metric_snapshots RLS/FORCE RLS boundary is incomplete';
  end if;

  if not exists (
    select 1
    from pg_attribute a
    where a.attrelid = 'public.compliance_metric_snapshots'::regclass
      and a.attname = 'organization_id'
      and a.attnotnull
      and not a.attisdropped
  ) then
    raise exception 'compliance_metric_snapshots.organization_id must be NOT NULL';
  end if;
end
$verify$;

commit;