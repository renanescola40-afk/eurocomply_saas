begin;

-- Forward-only Enterprise reconciliation for the Evidence Vault introduced by
-- 20260816104500_reconcile_gap_remediation_persistence.sql.
--
-- The earlier forward migration intentionally preserved the historical
-- user_id/workspace_id Gap Analysis contract. This tail migration upgrades only
-- the Evidence Vault boundary to the canonical organizations model. It never
-- guesses tenant ownership: legacy evidence rows must map to exactly one
-- organization membership or promotion fails closed.

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

-- Deterministic legacy ownership bridge. A user may belong to zero or many
-- organizations, so only a single distinct organization is safe to infer.
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
    raise exception 'Enterprise Evidence Vault reconciliation refused: % evidence_items row(s) do not map to exactly one organization', unresolved;
  end if;
end
$tenant_backfill_guard$;

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

-- Existing legacy object references cannot be moved safely by SQL alone. If a
-- row already points to a user-scoped object key, promotion stops so an operator
-- can perform an explicit object-copy/re-hash plan instead of silently relabeling
-- another tenant's bytes.
do $legacy_object_guard$
declare
  unsafe_objects bigint;
begin
  select count(*) into unsafe_objects
  from public.evidence_items
  where file_path is not null
    and btrim(file_path) <> ''
    and file_path not like organization_id::text || '/%';

  if unsafe_objects > 0 then
    raise exception 'Enterprise Evidence Vault reconciliation refused: % legacy object path(s) require explicit tenant-safe Storage migration', unsafe_objects;
  end if;
end
$legacy_object_guard$;

update public.evidence_items
set storage_object_path = coalesce(storage_object_path, nullif(btrim(file_path), ''))
where storage_object_path is null;

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
      and conname = 'evidence_items_storage_path_tenant_check'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_storage_path_tenant_check
      check (
        storage_object_path is null
        or storage_object_path like organization_id::text || '/%'
      ) not valid;
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
      and conname = 'evidence_items_soft_delete_check'
  ) then
    alter table public.evidence_items
      add constraint evidence_items_soft_delete_check
      check (
        (deleted_at is null and deleted_by_subject is null and delete_reason is null)
        or (deleted_at is not null and deleted_by_subject is not null and nullif(btrim(delete_reason), '') is not null)
      ) not valid;
  end if;
end
$constraints$;

alter table public.evidence_items validate constraint evidence_items_storage_bucket_check;
alter table public.evidence_items validate constraint evidence_items_storage_path_tenant_check;
alter table public.evidence_items validate constraint evidence_items_file_sha256_check;
alter table public.evidence_items validate constraint evidence_items_file_size_bytes_check;
alter table public.evidence_items validate constraint evidence_items_soft_delete_check;

create index if not exists evidence_items_organization_created_idx
  on public.evidence_items(organization_id, created_at desc);
create index if not exists evidence_items_organization_status_idx
  on public.evidence_items(organization_id, status, created_at desc)
  where deleted_at is null;
create unique index if not exists evidence_items_storage_object_unique_idx
  on public.evidence_items(storage_bucket, storage_object_path)
  where storage_object_path is not null and deleted_at is null;

-- Append-only audit trail. Direct authenticated writes are denied; an internal
-- trigger records creation, updates and soft-deletes with before/after state.
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

-- Replace the historical user-scoped Evidence Vault policies with canonical
-- organization-scoped policies. The legacy columns remain compatibility fields,
-- but they are no longer the authorization boundary.
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
        select 1
        from public.compliance_findings cf
        where cf.id = evidence_items.finding_id
          and cf.user_id = evidence_items.user_id
      )
    )
    and (
      task_id is null
      or exists (
        select 1
        from public.compliance_tasks ct
        where ct.id = evidence_items.task_id
          and ct.organization_id = evidence_items.organization_id
      )
    )
  );

create policy "rls_evidence_items_update_organization"
  on public.evidence_items for update to authenticated
  using (app_private.has_org_role(organization_id, array['owner','admin','member']::text[]))
  with check (
    app_private.has_org_role(organization_id, array['owner','admin','member']::text[])
    and (
      finding_id is null
      or exists (
        select 1
        from public.compliance_findings cf
        where cf.id = evidence_items.finding_id
          and cf.user_id = evidence_items.user_id
      )
    )
    and (
      task_id is null
      or exists (
        select 1
        from public.compliance_tasks ct
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

drop trigger if exists evidence_items_audit_change on public.evidence_items;
create trigger evidence_items_audit_change
after insert or update on public.evidence_items
for each row execute function app_private.audit_evidence_item_change();

drop trigger if exists evidence_items_reject_hard_delete on public.evidence_items;
create trigger evidence_items_reject_hard_delete
before delete on public.evidence_items
for each row execute function app_private.reject_evidence_item_hard_delete();

revoke all on function app_private.audit_evidence_item_change() from public, anon, authenticated;
revoke all on function app_private.reject_evidence_item_hard_delete() from public, anon, authenticated;
grant execute on function app_private.audit_evidence_item_change() to service_role;
grant execute on function app_private.reject_evidence_item_hard_delete() to service_role;

-- Private bucket. The object key's first segment is the organization UUID.
insert into storage.buckets (id, name, public)
values ('compliance-evidence', 'compliance-evidence', false)
on conflict (id) do update set public = false;

create or replace function app_private.evidence_storage_organization_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  first_segment text;
begin
  first_segment := split_part(object_name, '/', 1);
  if first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return first_segment::uuid;
  end if;
  return null;
exception
  when invalid_text_representation then
    return null;
end;
$$;

grant execute on function app_private.evidence_storage_organization_id(text) to authenticated, service_role;

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
        'rls_compliance_evidence_objects_update_organization'
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
    and app_private.is_org_member(app_private.evidence_storage_organization_id(name))
  );

create policy "rls_compliance_evidence_objects_insert_organization"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'compliance-evidence'
    and app_private.has_org_role(
      app_private.evidence_storage_organization_id(name),
      array['owner','admin','member']::text[]
    )
  );

create policy "rls_compliance_evidence_objects_update_organization"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'compliance-evidence'
    and app_private.has_org_role(
      app_private.evidence_storage_organization_id(name),
      array['owner','admin','member']::text[]
    )
  )
  with check (
    bucket_id = 'compliance-evidence'
    and app_private.has_org_role(
      app_private.evidence_storage_organization_id(name),
      array['owner','admin','member']::text[]
    )
  );

-- Final fail-closed dependency-spine and Evidence Vault postconditions. These
-- assertions make a partial bounded rollout observable instead of silently
-- accepting a materially incomplete Enterprise data plane.
do $postconditions$
declare
  dependency_table text;
  browser_delete boolean;
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

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'rls_compliance_evidence_objects_select_organization',
        'rls_compliance_evidence_objects_insert_organization',
        'rls_compliance_evidence_objects_update_organization'
      )
  ) <> 3 then
    raise exception 'Enterprise Evidence Vault Storage policies are incomplete';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'rls_compliance_evidence_objects_delete_owner',
        'users can delete own compliance evidence files'
      )
  ) then
    raise exception 'legacy authenticated Evidence Storage delete policy remains present';
  end if;

  browser_delete := has_table_privilege('authenticated', 'public.evidence_items', 'DELETE');
  if browser_delete then
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
end
$postconditions$;

notify pgrst, 'reload schema';

commit;
