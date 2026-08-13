\set ON_ERROR_STOP on

-- Read-only postcondition proof for the selected forward reconciliation set.
-- This file performs no schema or data mutation; it raises if any expected
-- runtime boundary is absent after rehearsal or production migration apply.
do $verify$
declare
  document_runtime_columns integer;
  controlled_policy_count integer;
  step_up_function_oid oid := to_regprocedure('public.touch_step_up_challenges_updated_at()');
  uploader_function_oid oid := to_regprocedure('public.enforce_document_uploader_member_scope()');
begin
  if not exists (
    select 1
    from pg_policy policy
    where policy.polrelid = 'public.organization_add_ons'::regclass
      and policy.polname = 'organization members can read add-ons'
      and policy.polcmd = 'r'
      and exists (
        select 1
        from pg_roles role
        where role.rolname = 'authenticated'
          and role.oid = any(policy.polroles)
      )
      and pg_get_expr(policy.polqual, policy.polrelid) ~* 'members\.user_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)'
  ) then
    raise exception 'organization_add_ons SELECT policy is not using the statement-scoped auth initplan';
  end if;

  if to_regclass('public.step_up_challenges') is null then
    raise exception 'step_up_challenges is missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'step_up_challenges'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'step_up_challenges RLS/FORCE RLS is incomplete';
  end if;

  if step_up_function_oid is null
     or has_function_privilege('anon', step_up_function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', step_up_function_oid, 'EXECUTE')
     or not has_function_privilege('service_role', step_up_function_oid, 'EXECUTE') then
    raise exception 'step_up_challenges trigger function privileges are not canonical';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'subscriptions'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'subscriptions RLS/FORCE RLS is incomplete';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_plan_check'
      and convalidated
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_tier_check'
      and convalidated
  ) then
    raise exception 'subscription canonical constraints are incomplete';
  end if;

  select count(*)
    into document_runtime_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'documents'
    and column_name in (
      'uploaded_by',
      'storage_path',
      'checksum_sha256',
      'mime_type',
      'size_bytes',
      'scan_status',
      'scan_provider',
      'scan_required',
      'scan_checked_at',
      'file_hash',
      'file_size',
      'mime_detected',
      'upload_security_metadata'
    );

  if document_runtime_columns <> 13 then
    raise exception 'controlled document runtime columns are incomplete';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'documents'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'documents RLS/FORCE RLS is incomplete';
  end if;

  if uploader_function_oid is null
     or has_function_privilege('anon', uploader_function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', uploader_function_oid, 'EXECUTE')
     or not has_function_privilege('service_role', uploader_function_oid, 'EXECUTE') then
    raise exception 'document uploader function privileges are not canonical';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.documents'::regclass
      and tgname = 'enforce_document_uploader_member_scope'
      and not tgisinternal
  ) then
    raise exception 'document uploader membership trigger is missing';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'controlled-documents'
      and public = false
      and file_size_limit = 10485760
  ) then
    raise exception 'controlled document bucket boundary is not canonical';
  end if;

  select count(*)
    into controlled_policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'No direct controlled document reads',
      'No direct controlled document uploads',
      'No direct controlled document updates',
      'No direct controlled document deletes'
    )
    and roles = array['authenticated']::name[];

  if controlled_policy_count <> 4 then
    raise exception 'controlled document direct-browser deny policies are incomplete';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'tasks'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'tasks RLS/FORCE RLS is incomplete';
  end if;
end
$verify$;

select 'forward_reconciliation_postconditions_passed' as status;
