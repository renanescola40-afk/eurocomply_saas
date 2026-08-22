begin;

-- Forward-only Enterprise reconciliation for the Evidence Vault introduced by
-- 20260816104500_reconcile_gap_remediation_persistence.sql.
--
-- The preceding migration intentionally preserves the historical personal
-- Gap Analysis contract. This tail migration makes organization_id the only
-- Evidence Vault tenant authority without rewriting any historical/applied
-- migration bytes. Existing rows are promoted only when ownership is
-- deterministic; ambiguous legacy bytes fail closed and require an explicit
-- operator-reviewed copy/re-hash plan.

create extension if not exists pgcrypto;

do $preconditions$
begin
  if to_regclass('public.evidence_items') is null then
    raise exception 'required compatibility table public.evidence_items is missing';
  end if;
  if to_regclass('public.organizations') is null then
    raise exception 'required canonical table public.organizations is missing';
  end if;
  if to_regclass('public.organization_members') is null then
    raise exception 'required canonical table public.organization_members is missing';
  end if;
  if to_regclass('public.compliance_findings') is null then
    raise exception 'required compatibility table public.compliance_findings is missing';
  end if;
  if to_regclass('public.compliance_tasks') is null then
    raise exception 'required canonical table public.compliance_tasks is missing';
  end if;
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'Supabase Storage schema is required for Enterprise Evidence Vault reconciliation';
  end if;
  if to_regprocedure('app_private.is_org_member(uuid)') is null then
    raise exception 'required tenant helper app_private.is_org_member(uuid) is missing';
  end if;
  if to_regprocedure('app_private.has_org_role(uuid,text[])') is null then
    raise exception 'required tenant role helper app_private.has_org_role(uuid,text[]) is missing';
  end if;
end
$preconditions$;

alter table public.evidence_items
  add column if not exists organization_id uuid,
  add column if not exists storage_bucket text not null default 'compliance-evidence',
  add column if not exists storage_object_path text,
  add column if not exists file_sha256 text,
  add column if not exists file_size_bytes bigint,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_subject text,
  add column if not exists delete_reason text;

-- Parse canonical object keys without ever throwing on attacker-controlled input.
-- Canonical key: <organization_uuid>/<evidence_uuid>/<sanitized_filename>
create or replace function app_private.evidence_storage_organization_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  segment text;
begin
  segment := split_part(coalesce(object_name, ''), '/', 1);
  if segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return segment::uuid;
  end if;
  return null;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function app_private.evidence_storage_evidence_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  segment text;
begin
  segment := split_part(coalesce(object_name, ''), '/', 2);
  if segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return segment::uuid;
  end if;
  return null;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke all on function app_private.evidence_storage_organization_id(text) from public, anon;
revoke all on function app_private.evidence_storage_evidence_id(text) from public, anon;
grant execute on function app_private.evidence_storage_organization_id(text) to authenticated, service_role;
grant execute on function app_private.evidence_storage_evidence_id(text) to authenticated, service_role;

-- Deterministic legacy tenant bridge. Never pick the first organization when an
-- actor belongs to multiple tenants.
with deterministic_membership as (
  select
    e.id as evidence_id,
    min(om.organization_id::text)::uuid as organization_id
  from public.evidence_items e
  join public.organization_members om
    on om.user_id = e.user_id
  where e.organization_id is null
  group by e.id
  having count(distinct om.organization_id) = 1
)
update public.evidence_items e
set organization_id = dm.organization_id
from deterministic_membership dm
where e.id = dm.evidence_id
  and e.organization_id is null;

do $tenant_backfill_guard$
declare
  unresolved bigint;
begin
  select count(*) into unresolved
  from public.evidence_items
  where organization_id is null;

  if unresolved > 0 then
    raise exception 'Enterprise Evidence Vault reconciliation refused: % evidence row(s) do not map to exactly one organization', unresolved;
  end if;
end
$tenant_backfill_guard$;

-- The legacy migration used <auth.uid()>/... object keys and did not persist a
-- cryptographic digest. SQL cannot safely relabel or re-hash those bytes. Any
-- existing file-backed row therefore blocks promotion until a reviewed Storage
-- copy/re-hash procedure has produced canonical organization/evidence keys.
do $legacy_object_guard$
declare
  legacy_files bigint;
begin
  select count(*) into legacy_files
  from public.evidence_items
  where nullif(btrim(file_path), '') is not null
     or nullif(btrim(storage_object_path), '') is not null;

  if legacy_files > 0 then
    raise exception 'Enterprise Evidence Vault reconciliation refused: % legacy file-backed row(s) require explicit object copy and SHA-256 reconciliation', legacy_files;
  end if;
end
$legacy_object_guard$;

do $organization_fk$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.evidence_items'::regclass
      and conname = 'evidence_items_organization_id_fkey'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete restrict
      not valid;
  end if;
end
$organization_fk$;

alter table public.evidence_items
  validate constraint evidence_items_organization_id_fkey;
alter table public.evidence_items
  alter column organization_id set not null;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.evidence_items'::regclass
      and conname = 'evidence_items_storage_bucket_check'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_storage_bucket_check
      check (storage_bucket = 'compliance-evidence') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.evidence_items'::regclass
      and conname = 'evidence_items_storage_path_contract_check'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_storage_path_contract_check
      check (
        storage_object_path is null
        or (
          app_private.evidence_storage_organization_id(storage_object_path) = organization_id
          and app_private.evidence_storage_evidence_id(storage_object_path) = id
          and nullif(split_part(storage_object_path, '/', 3), '') is not null
          and split_part(storage_object_path, '/', 4) = ''
        )
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.evidence_items'::regclass
      and conname = 'evidence_items_legacy_path_consistency_check'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_legacy_path_consistency_check
      check (file_path is null or file_path = storage_object_path) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.evidence_items'::regclass
      and conname = 'evidence_items_file_sha256_check'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_file_sha256_check
      check (file_sha256 is null or file_sha256 ~ '^[0-9a-f]{64}$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.evidence_items'::regclass
      and conname = 'evidence_items_file_size_bytes_check'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_file_size_bytes_check
      check (file_size_bytes is null or file_size_bytes >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.evidence_items'::regclass
      and conname = 'evidence_items_attachment_completeness_check'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_attachment_completeness_check
      check (
        (
          storage_object_path is null
          and file_path is null
          and file_sha256 is null
          and file_size_bytes is null
        )
        or (
          storage_object_path is not null
          and file_path = storage_object_path
          and file_sha256 is not null
          and file_size_bytes is not null
          and nullif(btrim(file_name), '') is not null
        )
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.evidence_items'::regclass
      and conname = 'evidence_items_soft_delete_check'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_soft_delete_check
      check (
        (deleted_at is null and deleted_by_subject is null and delete_reason is null)
        or (
          deleted_at is not null
          and deleted_by_subject is not null
          and nullif(btrim(delete_reason), '') is not null
          and status = 'archived'
        )
      ) not valid;
  end if;
end
$constraints$;

alter table public.evidence_items validate constraint evidence_items_storage_bucket_check;
alter table public.evidence_items validate constraint evidence_items_storage_path_contract_check;
alter table public.evidence_items validate constraint evidence_items_legacy_path_consistency_check;
alter table public.evidence_items validate constraint evidence_items_file_sha256_check;
alter table public.evidence_items validate constraint evidence_items_file_size_bytes_check;
alter table public.evidence_items validate constraint evidence_items_attachment_completeness_check;
alter table public.evidence_items validate constraint evidence_items_soft_delete_check;

create index if not exists evidence_items_organization_created_idx
  on public.evidence_items(organization_id, created_at desc);
create index if not exists evidence_items_organization_status_idx
  on public.evidence_items(organization_id, status, created_at desc)
  where deleted_at is null;
create unique index if not exists evidence_items_storage_object_unique_idx
  on public.evidence_items(storage_bucket, storage_object_path)
  where storage_object_path is not null;

create table if not exists public.evidence_item_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  evidence_item_id uuid not null references public.evidence_items(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'updated', 'soft_deleted')),
  actor_subject text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists evidence_item_audit_events_org_item_created_idx
  on public.evidence_item_audit_events(organization_id, evidence_item_id, created_at desc);

alter table public.evidence_items enable row level security;
alter table public.evidence_items force row level security;
alter table public.evidence_item_audit_events enable row level security;
alter table public.evidence_item_audit_events force row level security;

-- Forensic invariants run before RLS-approved updates are persisted. Tenant,
-- creator and creation time can never be rebound. Once attachment metadata has
-- been recorded it is write-once, and a soft-deleted row cannot be resurrected
-- or edited by browser/runtime paths.
create or replace function app_private.enforce_evidence_item_invariants()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  actor text;
  jwt_role text;
begin
  actor := coalesce(auth.jwt() ->> 'sub', auth.uid()::text);
  jwt_role := coalesce(auth.role(), '');

  if tg_op = 'INSERT' then
    if jwt_role = 'authenticated' and new.user_id is distinct from auth.uid() then
      raise exception using errcode = '42501', message = 'Evidence creator must match the authenticated actor';
    end if;
    if new.deleted_at is not null or new.deleted_by_subject is not null or new.delete_reason is not null then
      raise exception using errcode = '42501', message = 'Evidence cannot be created in a deleted state';
    end if;
    new.storage_bucket := 'compliance-evidence';
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if old.deleted_at is not null then
    raise exception using errcode = '42501', message = 'Soft-deleted Evidence Vault records are immutable';
  end if;

  if new.id is distinct from old.id
     or new.organization_id is distinct from old.organization_id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at
     or new.storage_bucket is distinct from old.storage_bucket then
    raise exception using errcode = '42501', message = 'Evidence tenant, creator, identity and creation boundary are immutable';
  end if;

  if old.storage_object_path is not null
     or old.file_path is not null
     or old.file_sha256 is not null
     or old.file_size_bytes is not null then
    if new.storage_object_path is distinct from old.storage_object_path
       or new.file_path is distinct from old.file_path
       or new.file_sha256 is distinct from old.file_sha256
       or new.file_size_bytes is distinct from old.file_size_bytes
       or new.file_name is distinct from old.file_name
       or new.file_mime_type is distinct from old.file_mime_type then
      raise exception using errcode = '42501', message = 'Evidence attachment metadata is write-once';
    end if;
  end if;

  if new.deleted_at is not null then
    if new.status <> 'archived' or nullif(btrim(new.delete_reason), '') is null then
      raise exception using errcode = '23514', message = 'Soft-delete requires archived status and a reason';
    end if;
    if jwt_role = 'authenticated' and new.deleted_by_subject is distinct from actor then
      raise exception using errcode = '42501', message = 'Soft-delete actor must match the authenticated subject';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function app_private.audit_evidence_item_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  actor text;
  event_name text;
begin
  actor := coalesce(auth.jwt() ->> 'sub', auth.uid()::text, 'system');

  if tg_op = 'INSERT' then
    event_name := 'created';
    insert into public.evidence_item_audit_events (
      organization_id, evidence_item_id, event_type, actor_subject, before_state, after_state
    ) values (
      new.organization_id, new.id, event_name, actor, null, to_jsonb(new)
    );
    return new;
  end if;

  event_name := case
    when old.deleted_at is null and new.deleted_at is not null then 'soft_deleted'
    else 'updated'
  end;

  insert into public.evidence_item_audit_events (
    organization_id, evidence_item_id, event_type, actor_subject, before_state, after_state
  ) values (
    new.organization_id, new.id, event_name, actor, to_jsonb(old), to_jsonb(new)
  );
  return new;
end;
$$;

create or replace function app_private.reject_evidence_item_hard_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'Evidence Vault records are append-audited and must be soft-deleted';
end;
$$;

drop trigger if exists evidence_items_enforce_invariants on public.evidence_items;
create trigger evidence_items_enforce_invariants
before insert or update on public.evidence_items
for each row execute function app_private.enforce_evidence_item_invariants();

drop trigger if exists evidence_items_audit_change on public.evidence_items;
create trigger evidence_items_audit_change
after insert or update on public.evidence_items
for each row execute function app_private.audit_evidence_item_change();

drop trigger if exists evidence_items_reject_hard_delete on public.evidence_items;
create trigger evidence_items_reject_hard_delete
before delete on public.evidence_items
for each row execute function app_private.reject_evidence_item_hard_delete();

revoke all on function app_private.enforce_evidence_item_invariants() from public, anon, authenticated;
revoke all on function app_private.audit_evidence_item_change() from public, anon, authenticated;
revoke all on function app_private.reject_evidence_item_hard_delete() from public, anon, authenticated;
grant execute on function app_private.enforce_evidence_item_invariants() to service_role;
grant execute on function app_private.audit_evidence_item_change() to service_role;
grant execute on function app_private.reject_evidence_item_hard_delete() to service_role;

-- Replace every historical user-scoped Evidence metadata policy with canonical
-- organization-scoped authorization. Legacy user/workspace columns remain only
-- for compatibility and are not tenant authority.
do $drop_evidence_policies$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'evidence_items'
  loop
    execute format('drop policy if exists %I on public.evidence_items', policy_record.policyname);
  end loop;
end
$drop_evidence_policies$;

revoke all on table public.evidence_items from public, anon, authenticated;
grant select, insert, update on table public.evidence_items to authenticated;
grant all on table public.evidence_items to service_role;

create policy "rls_evidence_items_select_organization"
  on public.evidence_items for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy "rls_evidence_items_insert_organization"
  on public.evidence_items for insert to authenticated
  with check (
    app_private.has_org_role(organization_id, array['owner','admin','member']::text[])
    and user_id = auth.uid()
    and (
      finding_id is null
      or exists (
        select 1 from public.compliance_findings cf
        where cf.id = evidence_items.finding_id
          and cf.user_id = evidence_items.user_id
      )
    )
    and (
      task_id is null
      or exists (
        select 1 from public.compliance_tasks ct
        where ct.id = evidence_items.task_id
          and ct.organization_id = evidence_items.organization_id
      )
    )
  );

create policy "rls_evidence_items_update_organization"
  on public.evidence_items for update to authenticated
  using (
    deleted_at is null
    and app_private.has_org_role(organization_id, array['owner','admin','member']::text[])
  )
  with check (
    app_private.has_org_role(organization_id, array['owner','admin','member']::text[])
    and (
      finding_id is null
      or exists (
        select 1 from public.compliance_findings cf
        where cf.id = evidence_items.finding_id
          and cf.user_id = evidence_items.user_id
      )
    )
    and (
      task_id is null
      or exists (
        select 1 from public.compliance_tasks ct
        where ct.id = evidence_items.task_id
          and ct.organization_id = evidence_items.organization_id
      )
    )
  );

revoke all on table public.evidence_item_audit_events from public, anon, authenticated;
grant select on table public.evidence_item_audit_events to authenticated;
grant all on table public.evidence_item_audit_events to service_role;

create policy "rls_evidence_item_audit_events_select_organization"
  on public.evidence_item_audit_events for select to authenticated
  using (app_private.is_org_member(organization_id));

-- Keep the historical bucket identifier for compatibility, but close it into a
-- private organization/evidence-keyed Vault.
insert into storage.buckets (id, name, public)
values ('compliance-evidence', 'compliance-evidence', false)
on conflict (id) do update set public = false;

do $drop_storage_policies$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'users can upload own compliance evidence files',
        'users can read own compliance evidence files',
        'users can update own compliance evidence files',
        'users can delete own compliance evidence files',
        'rls_compliance_evidence_objects_insert_owner',
        'rls_compliance_evidence_objects_select_owner',
        'rls_compliance_evidence_objects_update_owner',
        'rls_compliance_evidence_objects_delete_owner',
        'rls_compliance_evidence_objects_insert_organization',
        'rls_compliance_evidence_objects_select_organization',
        'rls_compliance_evidence_objects_update_organization',
        'rls_compliance_evidence_objects_delete_organization'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', policy_record.policyname);
  end loop;
end
$drop_storage_policies$;

create policy "rls_compliance_evidence_objects_select_organization"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'compliance-evidence'
    and exists (
      select 1
      from public.evidence_items e
      where e.organization_id = app_private.evidence_storage_organization_id(storage.objects.name)
        and e.id = app_private.evidence_storage_evidence_id(storage.objects.name)
        and e.storage_bucket = storage.objects.bucket_id
        and e.storage_object_path = storage.objects.name
        and e.deleted_at is null
        and app_private.is_org_member(e.organization_id)
    )
  );

create policy "rls_compliance_evidence_objects_insert_organization"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'compliance-evidence'
    and exists (
      select 1
      from public.evidence_items e
      where e.organization_id = app_private.evidence_storage_organization_id(storage.objects.name)
        and e.id = app_private.evidence_storage_evidence_id(storage.objects.name)
        and e.storage_bucket = storage.objects.bucket_id
        and e.storage_object_path = storage.objects.name
        and e.deleted_at is null
        and app_private.has_org_role(e.organization_id, array['owner','admin','member']::text[])
    )
  );

-- Final fail-closed dependency-spine and Evidence Vault postconditions. A
-- partial bounded rollout must stop rather than silently advertising closure.
do $postconditions$
declare
  dependency_table text;
  trigger_count integer;
  storage_policy_count integer;
begin
  foreach dependency_table in array array[
    'enterprise_break_glass_requests',
    'enterprise_break_glass_approvals',
    'enterprise_break_glass_events',
    'platform_admin_users',
    'enterprise_contracts',
    'organization_entitlements',
    'enterprise_service_accounts',
    'enterprise_api_keys',
    'enterprise_webhook_subscriptions',
    'enterprise_webhook_deliveries',
    'enterprise_identity_connections',
    'enterprise_scim_tokens',
    'enterprise_scim_identities',
    'enterprise_integration_audit_events'
  ]
  loop
    if to_regclass(format('public.%I', dependency_table)) is null then
      raise exception 'Enterprise data-plane dependency public.% is missing before Evidence Vault closure', dependency_table;
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
    raise exception 'Evidence Vault metadata must have RLS and FORCE RLS';
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
    raise exception 'Evidence Vault audit events must have RLS and FORCE RLS';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'evidence_items'
      and column_name = 'organization_id'
      and is_nullable = 'NO'
  ) then
    raise exception 'Evidence Vault organization_id must be NOT NULL';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'compliance-evidence' and public = false
  ) then
    raise exception 'Enterprise Evidence Vault private bucket is missing';
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
    raise exception 'Enterprise Evidence Vault forensic trigger set is incomplete';
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
    raise exception 'Enterprise Evidence Vault Storage policy set is incomplete';
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
    raise exception 'authenticated Evidence Storage UPDATE/DELETE policy remains present';
  end if;

  if has_table_privilege('authenticated', 'public.evidence_items', 'DELETE') then
    raise exception 'authenticated must not have hard DELETE privilege on Evidence Vault metadata';
  end if;

  if has_table_privilege('anon', 'public.evidence_items', 'SELECT')
     or has_table_privilege('anon', 'public.evidence_items', 'INSERT')
     or has_table_privilege('anon', 'public.evidence_items', 'UPDATE')
     or has_table_privilege('anon', 'public.evidence_items', 'DELETE') then
    raise exception 'anon retains Evidence Vault metadata privileges';
  end if;

  if has_table_privilege('authenticated', 'public.evidence_item_audit_events', 'INSERT')
     or has_table_privilege('authenticated', 'public.evidence_item_audit_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.evidence_item_audit_events', 'DELETE') then
    raise exception 'authenticated must not mutate Evidence Vault audit events directly';
  end if;

  if to_regprocedure('app_private.enforce_evidence_item_invariants()') is null
     or to_regprocedure('app_private.audit_evidence_item_change()') is null
     or to_regprocedure('app_private.reject_evidence_item_hard_delete()') is null
     or to_regprocedure('app_private.evidence_storage_organization_id(text)') is null
     or to_regprocedure('app_private.evidence_storage_evidence_id(text)') is null then
    raise exception 'Enterprise Evidence Vault helper/function spine is incomplete';
  end if;
end
$postconditions$;

notify pgrst, 'reload schema';

commit;
