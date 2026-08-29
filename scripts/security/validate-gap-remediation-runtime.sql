\set ON_ERROR_STOP on

-- Read-only runtime proof for the forward-reconciled Gap Analysis, remediation,
-- task compatibility and Evidence Vault persistence boundary.
do $verify$
declare
  required_table text;
  required_column text;
  reconciled_rls_count integer;
  anon_privilege_count integer;
  personal_task_policy_count integer;
  permanent_mutation_guard_count integer;
  evidence_items_policy_count integer;
  compliance_evidence_policy_count integer;
  storage_policy_count integer;
begin
  foreach required_table in array array[
    'gap_assessments',
    'gap_answers',
    'compliance_findings',
    'compliance_tasks',
    'evidence_items',
    'compliance_evidence'
  ]
  loop
    if to_regclass(format('public.%I', required_table)) is null then
      raise exception 'gap/remediation runtime table public.% is missing', required_table;
    end if;
  end loop;

  select count(*)
    into reconciled_rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'gap_assessments',
      'gap_answers',
      'compliance_findings',
      'compliance_tasks',
      'evidence_items',
      'compliance_evidence'
    )
    and c.relrowsecurity
    and c.relforcerowsecurity;

  if reconciled_rls_count <> 6 then
    raise exception 'gap/remediation RLS/FORCE RLS posture is incomplete';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'compliance_tasks'
      and column_name = 'organization_id'
      and is_nullable = 'YES'
  ) then
    raise exception 'compliance_tasks.organization_id must remain nullable for the explicit personal scope';
  end if;

  foreach required_column in array array[
    'workspace_id',
    'finding_id',
    'user_id',
    'owner_id',
    'completed_at',
    'metadata'
  ]
  loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'compliance_tasks'
        and column_name = required_column
    ) then
      raise exception 'compliance_tasks compatibility column % is missing', required_column;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.compliance_tasks'::regclass
      and conname = 'compliance_tasks_requires_tenant_scope'
      and contype = 'c'
      and convalidated
  ) then
    raise exception 'compliance_tasks tenant-scope constraint is missing or unvalidated';
  end if;

  if exists (
    select 1
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid in (
      'public.gap_assessments'::regclass,
      'public.gap_answers'::regclass,
      'public.compliance_findings'::regclass,
      'public.compliance_tasks'::regclass,
      'public.evidence_items'::regclass,
      'public.compliance_evidence'::regclass
    )
      and c.contype = 'f'
      and a.attname = 'workspace_id'
  ) then
    raise exception 'legacy workspace_id foreign key is present in the reconciled runtime';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.compliance_tasks'::regclass
      and c.contype = 'f'
      and a.attname = 'finding_id'
      and c.confrelid = 'public.compliance_findings'::regclass
  ) or not exists (
    select 1
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.compliance_tasks'::regclass
      and c.contype = 'f'
      and a.attname = 'user_id'
      and c.confrelid = 'auth.users'::regclass
  ) then
    raise exception 'compliance_tasks personal-scope foreign keys are incomplete';
  end if;

  if not has_table_privilege('authenticated', 'public.compliance_tasks', 'SELECT')
     or not has_table_privilege('authenticated', 'public.compliance_tasks', 'INSERT') then
    raise exception 'authenticated compliance_tasks personal read/create privileges are incomplete';
  end if;

  if has_table_privilege('authenticated', 'public.compliance_tasks', 'UPDATE')
     or has_table_privilege('authenticated', 'public.compliance_tasks', 'DELETE') then
    raise exception 'authenticated compliance_tasks organization mutation boundary is not backend-only';
  end if;

  select count(*)
    into personal_task_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'compliance_tasks'
    and policyname in (
      'rls_compliance_tasks_select_personal',
      'rls_compliance_tasks_insert_personal'
    )
    and roles = array['authenticated']::name[];

  if personal_task_policy_count <> 2 then
    raise exception 'personal compliance_tasks read/create RLS policy set is incomplete';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname = 'restrict_authenticated_compliance_task_insert_to_personal'
      and permissive = 'RESTRICTIVE'
      and roles = array['authenticated']::name[]
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
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname = 'rls_compliance_tasks_select_member'
  ) then
    raise exception 'canonical organization compliance_tasks read policy was not preserved';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'compliance_tasks'
      and policyname in (
        'rls_compliance_tasks_insert_writer',
        'rls_compliance_tasks_update_writer',
        'rls_compliance_tasks_delete_admin',
        'rls_compliance_tasks_update_personal'
      )
  ) then
    raise exception 'direct compliance_tasks mutation policy unexpectedly remains active';
  end if;

  -- Evidence Vault metadata is intentionally organization-scoped after the
  -- forward reconciliation. Hard DELETE remains service-role/backend-only.
  select count(*)
    into evidence_items_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'evidence_items'
    and roles = array['authenticated']::name[]
    and (
      (policyname = 'rls_evidence_items_select_organization' and cmd = 'SELECT')
      or (policyname = 'rls_evidence_items_insert_organization' and cmd = 'INSERT')
      or (policyname = 'rls_evidence_items_update_organization' and cmd = 'UPDATE')
    );

  if evidence_items_policy_count <> 3 then
    raise exception 'canonical Evidence Vault organization RLS policy set is incomplete';
  end if;

  -- Payment-first is intentionally layered as a RESTRICTIVE AND-condition over
  -- the three organization policies above. It is canonical V23 state, not a
  -- stale Evidence Vault metadata policy.
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'evidence_items'
      and policyname = 'payment_first_commercial_authority'
      and permissive = 'RESTRICTIVE'
      and cmd = 'ALL'
      and roles = array['authenticated']::name[]
      and coalesce(qual, '') like '%has_commercial_authority%'
      and coalesce(with_check, '') like '%has_commercial_authority%'
  ) then
    raise exception 'Evidence Vault payment-first restrictive policy is incomplete';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'evidence_items'
      and policyname not in (
        'rls_evidence_items_select_organization',
        'rls_evidence_items_insert_organization',
        'rls_evidence_items_update_organization',
        'payment_first_commercial_authority'
      )
  ) then
    raise exception 'stale or unexpected Evidence Vault metadata policy remains active';
  end if;

  if not has_table_privilege('authenticated', 'public.evidence_items', 'SELECT')
     or not has_table_privilege('authenticated', 'public.evidence_items', 'INSERT')
     or not has_table_privilege('authenticated', 'public.evidence_items', 'UPDATE') then
    raise exception 'authenticated Evidence Vault metadata read/write privileges are incomplete';
  end if;

  if has_table_privilege('authenticated', 'public.evidence_items', 'DELETE') then
    raise exception 'authenticated must not have hard DELETE privilege on Evidence Vault metadata';
  end if;

  -- compliance_evidence remains on its established owner-scoped compatibility
  -- contract; it is intentionally validated separately from evidence_items.
  select count(*)
    into compliance_evidence_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'compliance_evidence'
    and policyname in (
      'rls_compliance_evidence_select_owner',
      'rls_compliance_evidence_insert_owner',
      'rls_compliance_evidence_update_owner',
      'rls_compliance_evidence_delete_owner'
    )
    and roles = array['authenticated']::name[];

  if compliance_evidence_policy_count <> 4 then
    raise exception 'compliance_evidence owner RLS policy set is incomplete';
  end if;

  select count(*)
    into anon_privilege_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'gap_assessments',
      'gap_answers',
      'compliance_findings',
      'compliance_tasks',
      'evidence_items',
      'compliance_evidence'
    )
    and grantee = 'anon';

  if anon_privilege_count <> 0 then
    raise exception 'anon unexpectedly retains gap/remediation table privileges';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'compliance-evidence'
      and public = false
  ) then
    raise exception 'compliance-evidence storage bucket is missing or public';
  end if;

  -- The canonical Evidence Vault permits authenticated SELECT/INSERT only;
  -- object UPDATE/DELETE is deliberately absent and remains fail-closed.
  select count(*)
    into storage_policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and roles = array['authenticated']::name[]
    and (
      (policyname = 'rls_compliance_evidence_objects_select_organization' and cmd = 'SELECT')
      or (policyname = 'rls_compliance_evidence_objects_insert_organization' and cmd = 'INSERT')
    );

  if storage_policy_count <> 2 then
    raise exception 'canonical compliance-evidence organization storage policy set is incomplete';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'users can update own compliance evidence files',
        'users can delete own compliance evidence files',
        'rls_compliance_evidence_objects_update_owner',
        'rls_compliance_evidence_objects_delete_owner',
        'rls_compliance_evidence_objects_update_organization',
        'rls_compliance_evidence_objects_delete_organization'
      )
  ) then
    raise exception 'authenticated Evidence Vault storage UPDATE/DELETE policy remains active';
  end if;
end
$verify$;

select 'gap_remediation_runtime_validation_passed' as status;