\set ON_ERROR_STOP on

-- Read-only live validator for the Enterprise Evidence Vault data plane.
-- This script performs no schema/data mutation. It validates the canonical
-- organization tenant authority, forensic metadata boundary and private
-- Storage policy contract after bounded production promotion.
do $evidence_vault_runtime$
declare
  required_constraint text;
  trigger_count integer;
  metadata_policy_count integer;
  audit_policy_count integer;
  storage_policy_count integer;
  browser_audit_dml integer;
  helper_oid oid;
begin
  if to_regclass('public.evidence_items') is null then
    raise exception 'Evidence Vault metadata table is missing';
  end if;
  if to_regclass('public.evidence_item_audit_events') is null then
    raise exception 'Evidence Vault audit table is missing';
  end if;
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'Supabase Storage runtime is missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'evidence_items'
      and column_name = 'organization_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) then
    raise exception 'Evidence Vault organization_id is not canonical NOT NULL uuid tenant authority';
  end if;

  if exists (
    select 1
    from public.evidence_items
    where organization_id is null
  ) then
    raise exception 'Evidence Vault contains unbound tenant metadata rows';
  end if;

  foreach required_constraint in array array[
    'evidence_items_organization_id_fkey',
    'evidence_items_storage_bucket_check',
    'evidence_items_storage_path_contract_check',
    'evidence_items_legacy_path_consistency_check',
    'evidence_items_file_sha256_check',
    'evidence_items_file_size_bytes_check',
    'evidence_items_attachment_completeness_check',
    'evidence_items_soft_delete_check'
  ] loop
    if not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.evidence_items'::regclass
        and conname = required_constraint
        and convalidated
    ) then
      raise exception 'Evidence Vault required validated constraint is missing: %', required_constraint;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'evidence_items'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'Evidence Vault metadata RLS/FORCE RLS is incomplete';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'evidence_item_audit_events'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'Evidence Vault audit RLS/FORCE RLS is incomplete';
  end if;

  select count(*) into metadata_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'evidence_items'
    and policyname in (
      'rls_evidence_items_select_organization',
      'rls_evidence_items_insert_organization',
      'rls_evidence_items_update_organization'
    );
  if metadata_policy_count <> 3 then
    raise exception 'Evidence Vault metadata policy set is incomplete';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'evidence_items'
      and cmd = 'DELETE'
  ) then
    raise exception 'Evidence Vault metadata exposes a DELETE RLS policy';
  end if;

  select count(*) into audit_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'evidence_item_audit_events'
    and policyname = 'rls_evidence_item_audit_events_select_organization'
    and cmd = 'SELECT';
  if audit_policy_count <> 1 then
    raise exception 'Evidence Vault audit SELECT policy is incomplete';
  end if;

  if has_table_privilege('anon', 'public.evidence_items', 'SELECT')
     or has_table_privilege('anon', 'public.evidence_items', 'INSERT')
     or has_table_privilege('anon', 'public.evidence_items', 'UPDATE')
     or has_table_privilege('anon', 'public.evidence_items', 'DELETE') then
    raise exception 'anon retains Evidence Vault metadata privileges';
  end if;

  if has_table_privilege('authenticated', 'public.evidence_items', 'DELETE') then
    raise exception 'authenticated retains Evidence Vault hard-delete privilege';
  end if;

  select count(*) into browser_audit_dml
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'evidence_item_audit_events'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE');
  if browser_audit_dml <> 0 then
    raise exception 'browser roles can mutate Evidence Vault audit events';
  end if;

  select count(*) into trigger_count
  from pg_trigger
  where tgrelid = 'public.evidence_items'::regclass
    and not tgisinternal
    and tgname in (
      'evidence_items_enforce_invariants',
      'evidence_items_audit_change',
      'evidence_items_reject_hard_delete'
    );
  if trigger_count <> 3 then
    raise exception 'Evidence Vault forensic trigger set is incomplete';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'compliance-evidence'
      and name = 'compliance-evidence'
      and public = false
  ) then
    raise exception 'Evidence Vault bucket is missing or public';
  end if;

  select count(*) into storage_policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'rls_compliance_evidence_objects_select_organization',
      'rls_compliance_evidence_objects_insert_organization'
    );
  if storage_policy_count <> 2 then
    raise exception 'Evidence Vault Storage policy set is incomplete';
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
    raise exception 'Evidence Vault Storage mutating legacy policy remains present';
  end if;

  helper_oid := to_regprocedure('app_private.evidence_storage_organization_id(text)');
  if helper_oid is null
     or has_function_privilege('anon', helper_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', helper_oid, 'EXECUTE')
     or not has_function_privilege('service_role', helper_oid, 'EXECUTE') then
    raise exception 'Evidence Vault organization path helper privileges are not canonical';
  end if;

  helper_oid := to_regprocedure('app_private.evidence_storage_evidence_id(text)');
  if helper_oid is null
     or has_function_privilege('anon', helper_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', helper_oid, 'EXECUTE')
     or not has_function_privilege('service_role', helper_oid, 'EXECUTE') then
    raise exception 'Evidence Vault evidence-id path helper privileges are not canonical';
  end if;

  helper_oid := to_regprocedure('app_private.audit_evidence_item_change()');
  if helper_oid is null
     or has_function_privilege('anon', helper_oid, 'EXECUTE')
     or has_function_privilege('authenticated', helper_oid, 'EXECUTE')
     or not has_function_privilege('service_role', helper_oid, 'EXECUTE') then
    raise exception 'Evidence Vault audit helper privilege boundary is not canonical';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = helper_oid
      and p.prosecdef
      and setting = 'search_path=pg_catalog'
  ) then
    raise exception 'Evidence Vault audit helper SECURITY DEFINER search_path is not fixed';
  end if;
end
$evidence_vault_runtime$;

select 'enterprise_evidence_vault_runtime_passed' as status;
