begin;

-- Harden the compatibility scope introduced by the Gap Analysis reconciliation.
-- Organization-scoped task mutations remain backend-only; authenticated browser
-- DML is limited to creation of a personal task that is cryptographically bound
-- by auth.uid() and cannot be moved into an organization scope.

do $guard$
begin
  if to_regclass('public.compliance_tasks') is null then
    raise exception 'required canonical table public.compliance_tasks is missing';
  end if;
  if to_regclass('public.compliance_findings') is null then
    raise exception 'required reconciled table public.compliance_findings is missing';
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

-- Retire all transitional rollout guards only after the compatibility schema and
-- privileges are ready. Permanent backend-only UPDATE/DELETE guards are recreated
-- immediately below with names that describe their steady-state purpose.
drop policy if exists "restrict_authenticated_compliance_task_insert_during_reconciliation" on public.compliance_tasks;
drop policy if exists "restrict_authenticated_compliance_task_update_during_reconciliation" on public.compliance_tasks;
drop policy if exists "restrict_authenticated_compliance_task_delete_during_reconciliation" on public.compliance_tasks;

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
-- permissive policies. The insert guard prevents a future permissive organization
-- insert policy from reopening direct organization writes. UPDATE/DELETE remain
-- backend-only even if table privileges are broadened accidentally later.
drop policy if exists "restrict_authenticated_compliance_task_insert_to_personal" on public.compliance_tasks;
drop policy if exists "restrict_authenticated_compliance_task_update_backend_only" on public.compliance_tasks;
drop policy if exists "restrict_authenticated_compliance_task_delete_backend_only" on public.compliance_tasks;

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

create policy "restrict_authenticated_compliance_task_update_backend_only"
  on public.compliance_tasks
  as restrictive
  for update
  to authenticated
  using (false)
  with check (false);

create policy "restrict_authenticated_compliance_task_delete_backend_only"
  on public.compliance_tasks
  as restrictive
  for delete
  to authenticated
  using (false);

-- Fail closed on the exact privilege/policy posture required by the client and
-- the audited/rate-limited organization task server actions.
do $verify$
declare
  permanent_mutation_guard_count integer;
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
      and policyname in (
        'restrict_authenticated_compliance_task_insert_during_reconciliation',
        'restrict_authenticated_compliance_task_update_during_reconciliation',
        'restrict_authenticated_compliance_task_delete_during_reconciliation'
      )
  ) then
    raise exception 'transitional compliance_tasks mutation guard was not retired';
  end if;

  select count(*)
    into permanent_mutation_guard_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'compliance_tasks'
    and policyname in (
      'restrict_authenticated_compliance_task_update_backend_only',
      'restrict_authenticated_compliance_task_delete_backend_only'
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
end
$verify$;

commit;