begin;

-- Forward execution identity for the reviewed 20260809135000 Enterprise core
-- runtime reconciliation. The historical migration remains byte-for-byte
-- immutable and unapplied; this newer identity stays strictly after the current
-- production migration ledger so the bounded lane never needs --include-all or
-- migration-history repair. The SQL is intentionally idempotent, fail-closed,
-- and contains no destructive data rewrite.
--
-- This forward identity deliberately carries no historical human-approval
-- marker. It also preserves later vendor-governance tenant-integrity hardening
-- that exists elsewhere in repository history instead of regressing it.

-- ---------------------------------------------------------------------------
-- 1. Intelligence runtime objects required by /api/intelligence/refresh.
-- ---------------------------------------------------------------------------
create table if not exists public.intelligence_items (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  title text not null,
  category text not null,
  jurisdiction text not null default 'European Union',
  source_name text not null,
  source_type text not null default 'official',
  author text,
  published_at timestamptz,
  reliability text not null default 'high',
  impact text not null default 'monitor',
  executive_summary text not null,
  internal_analysis text not null,
  affected_companies text[] not null default '{}'::text[],
  recommended_actions text[] not null default '{}'::text[],
  reference_label text,
  reference_url text,
  content_rights text not null default 'metadata_and_analysis_only',
  full_text_allowed boolean not null default false,
  full_text text,
  premium boolean not null default false,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intelligence_items_reliability_check check (reliability in ('high', 'medium', 'low')),
  constraint intelligence_items_impact_check check (impact in ('monitor', 'medium', 'high', 'critical')),
  constraint intelligence_items_status_check check (status in ('draft', 'published', 'archived')),
  constraint intelligence_items_full_text_rights_check check (full_text is null or full_text_allowed = true)
);

create table if not exists public.intelligence_calendar_suggestions (
  id uuid primary key default gen_random_uuid(),
  intelligence_item_id uuid not null references public.intelligence_items(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  priority text not null default 'medium',
  due_in_days integer not null default 30,
  suggested_action text not null,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intelligence_calendar_priority_check check (priority in ('low', 'medium', 'high', 'critical')),
  constraint intelligence_calendar_status_check check (status in ('suggested', 'accepted', 'ignored', 'created'))
);

create index if not exists intelligence_items_published_idx
  on public.intelligence_items (published_at desc nulls last, created_at desc);
create index if not exists intelligence_items_category_idx
  on public.intelligence_items (category);
create index if not exists intelligence_items_impact_idx
  on public.intelligence_items (impact);
create index if not exists intelligence_calendar_org_idx
  on public.intelligence_calendar_suggestions (organization_id, status);

create or replace function public.set_intelligence_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_intelligence_updated_at() from public, anon, authenticated;
grant execute on function public.set_intelligence_updated_at() to service_role;

drop trigger if exists set_intelligence_items_updated_at on public.intelligence_items;
create trigger set_intelligence_items_updated_at
before update on public.intelligence_items
for each row execute function public.set_intelligence_updated_at();

drop trigger if exists set_intelligence_calendar_updated_at on public.intelligence_calendar_suggestions;
create trigger set_intelligence_calendar_updated_at
before update on public.intelligence_calendar_suggestions
for each row execute function public.set_intelligence_updated_at();

alter table public.intelligence_items enable row level security;
alter table public.intelligence_calendar_suggestions enable row level security;

revoke all on table public.intelligence_items from public, anon;
revoke insert, update, delete on table public.intelligence_items from authenticated;
grant select on table public.intelligence_items to authenticated;
grant select, insert, update, delete on table public.intelligence_items to service_role;

revoke all on table public.intelligence_calendar_suggestions from public, anon;
revoke insert, update, delete on table public.intelligence_calendar_suggestions from authenticated;
grant select on table public.intelligence_calendar_suggestions to authenticated;
grant select, insert, update, delete on table public.intelligence_calendar_suggestions to service_role;

drop policy if exists "Authenticated users can read published intelligence" on public.intelligence_items;
create policy "Authenticated users can read published intelligence"
  on public.intelligence_items
  for select
  to authenticated
  using (status = 'published');

drop policy if exists "Organization members can read intelligence calendar suggestions" on public.intelligence_calendar_suggestions;
create policy "Organization members can read intelligence calendar suggestions"
  on public.intelligence_calendar_suggestions
  for select
  to authenticated
  using (organization_id is null or app_private.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- 2. Notification idempotency table used by compliance alert jobs.
-- ---------------------------------------------------------------------------
create table if not exists public.email_notification_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  recipient_email text not null,
  sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, event_type, entity_type, entity_id, recipient_email)
);

alter table public.email_notification_events
  alter column entity_id type text using entity_id::text;

create index if not exists email_notification_events_org_type_idx
  on public.email_notification_events (organization_id, event_type, sent_at desc);

alter table public.email_notification_events enable row level security;
revoke all on table public.email_notification_events from public, anon;
revoke insert, update, delete on table public.email_notification_events from authenticated;
grant select on table public.email_notification_events to authenticated;
grant select, insert, update, delete on table public.email_notification_events to service_role;

drop policy if exists "Members can read email notification events" on public.email_notification_events;
drop policy if exists rls_email_notification_events_select_member on public.email_notification_events;
create policy rls_email_notification_events_select_member
  on public.email_notification_events
  for select
  to authenticated
  using (app_private.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- 3. Vendor schema used by the reviewed server actions and alert job.
-- ---------------------------------------------------------------------------
alter table public.vendors
  add column if not exists country text,
  add column if not exists data_access_level text not null default 'unknown',
  add column if not exists dpa_signed boolean not null default false,
  add column if not exists last_reviewed_at date,
  add column if not exists next_review_at date,
  add column if not exists review_version integer not null default 1,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table public.vendors
  drop constraint if exists vendors_data_access_level_check,
  add constraint vendors_data_access_level_check
    check (data_access_level in ('unknown', 'none', 'low', 'medium', 'high')) not valid,
  drop constraint if exists vendors_risk_level_check,
  add constraint vendors_risk_level_check
    check (risk_level in ('low', 'medium', 'high')) not valid,
  drop constraint if exists vendors_review_status_check,
  add constraint vendors_review_status_check
    check (review_status in ('pending', 'in_review', 'approved', 'rejected')) not valid,
  drop constraint if exists vendors_review_dates_check,
  add constraint vendors_review_dates_check
    check (next_review_at is null or last_reviewed_at is null or next_review_at >= last_reviewed_at) not valid,
  drop constraint if exists vendors_approval_state_check,
  add constraint vendors_approval_state_check
    check (
      (review_status = 'approved' and approved_at is not null and approved_by is not null)
      or (review_status <> 'approved' and approved_at is null and approved_by is null)
    ) not valid;

create index if not exists vendors_org_review_due_idx
  on public.vendors (organization_id, next_review_at);
create index if not exists vendors_org_risk_status_idx
  on public.vendors (organization_id, risk_level, review_status);

-- Preserve the tenant-integrity checks introduced by the reviewed vendor
-- governance hardening while also providing the review-version bump required by
-- the active runtime. Service-role writes are not allowed to manufacture a
-- creator/approver from another organization.
create or replace function public.enforce_vendor_governance_integrity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.created_by is not null and not exists (
    select 1
    from public.organization_members om
    where om.organization_id = new.organization_id
      and om.user_id = new.created_by
  ) then
    raise exception 'vendor creator must belong to organization' using errcode = '23514';
  end if;

  if new.approved_by is not null and not exists (
    select 1
    from public.organization_members om
    where om.organization_id = new.organization_id
      and om.user_id = new.approved_by
      and om.role in ('owner', 'admin', 'compliance_manager')
  ) then
    raise exception 'vendor approver must be an authorized organization member' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.review_version = old.review_version + 1;
    new.updated_at = now();
  end if;

  return new;
end;
$$;
revoke all on function public.enforce_vendor_governance_integrity() from public, anon, authenticated;
grant execute on function public.enforce_vendor_governance_integrity() to service_role;

drop trigger if exists bump_vendor_review_version on public.vendors;
drop function if exists public.bump_vendor_review_version();
drop trigger if exists enforce_vendor_actor_scope on public.vendors;
drop trigger if exists enforce_vendor_governance_integrity on public.vendors;
create trigger enforce_vendor_governance_integrity
before insert or update on public.vendors
for each row execute function public.enforce_vendor_governance_integrity();

create table if not exists public.vendor_review_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  operation text not null check (operation in ('created', 'updated', 'deleted')),
  previous_record jsonb,
  current_record jsonb,
  review_version integer not null,
  created_at timestamptz not null default now()
);

create index if not exists vendor_review_history_vendor_idx
  on public.vendor_review_history (organization_id, vendor_id, review_version desc);

alter table public.vendor_review_history enable row level security;
revoke all on table public.vendor_review_history from public, anon;
revoke insert, update, delete on table public.vendor_review_history from authenticated;
grant select on table public.vendor_review_history to authenticated;
grant select, insert, update, delete on table public.vendor_review_history to service_role;

drop policy if exists "Members can read vendor review history" on public.vendor_review_history;
drop policy if exists rls_vendor_review_history_select_member on public.vendor_review_history;
create policy rls_vendor_review_history_select_member
  on public.vendor_review_history
  for select
  to authenticated
  using (app_private.is_org_member(organization_id));

create or replace function public.record_vendor_review_history()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org uuid := coalesce(new.organization_id, old.organization_id);
  v_vendor uuid := coalesce(new.id, old.id);
  v_version integer := coalesce(new.review_version, old.review_version, 1);
begin
  insert into public.vendor_review_history (
    organization_id,
    vendor_id,
    actor_user_id,
    operation,
    previous_record,
    current_record,
    review_version
  ) values (
    v_org,
    v_vendor,
    auth.uid(),
    case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    v_version
  );
  return coalesce(new, old);
end;
$$;
revoke all on function public.record_vendor_review_history() from public, anon, authenticated;
grant execute on function public.record_vendor_review_history() to service_role;

drop trigger if exists record_vendor_review_history on public.vendors;
create trigger record_vendor_review_history
after insert or update or delete on public.vendors
for each row execute function public.record_vendor_review_history();

alter table public.vendors enable row level security;
revoke insert, update, delete on table public.vendors from public, anon, authenticated;
grant select on table public.vendors to authenticated;
grant select, insert, update, delete on table public.vendors to service_role;

drop policy if exists "Managers can manage vendors" on public.vendors;
drop policy if exists "Members can read vendors" on public.vendors;
drop policy if exists rls_vendors_select_member on public.vendors;
create policy rls_vendors_select_member
  on public.vendors
  for select
  to authenticated
  using (app_private.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- 4. Backend-only atomic organization bootstrap used by onboarding.
-- ---------------------------------------------------------------------------
create or replace function public.create_organization_with_owner_atomic(
  p_name text,
  p_slug text,
  p_user_id uuid
)
returns table (
  outcome text,
  organization_id uuid,
  organization_name text,
  organization_slug text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_organization public.organizations%rowtype;
  v_name text := trim(coalesce(p_name, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if p_user_id is null
    or char_length(v_name) < 2
    or char_length(v_name) > 120
    or char_length(v_slug) < 3
    or char_length(v_slug) > 80
    or v_slug !~ '^[a-z0-9-]+$' then
    return query select
      'invalid_input'::text,
      null::uuid,
      null::text,
      null::text,
      null::uuid,
      null::timestamptz,
      null::timestamptz;
    return;
  end if;

  insert into public.organizations (name, slug, created_by)
  values (v_name, v_slug, p_user_id)
  returning * into v_organization;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization.id, p_user_id, 'owner');

  return query select
    'created'::text,
    v_organization.id,
    v_organization.name,
    v_organization.slug,
    v_organization.created_by,
    v_organization.created_at,
    v_organization.updated_at;
end;
$$;

revoke all on function public.create_organization_with_owner_atomic(text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_organization_with_owner_atomic(text, text, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- 5. Remove temporary live-validation RLS policies and restore canonical names.
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;
drop policy if exists rls_tasks_select_member on public.tasks;
drop policy if exists rls_tasks_insert_writer on public.tasks;
drop policy if exists rls_tasks_update_writer on public.tasks;
drop policy if exists rls_tasks_delete_admin on public.tasks;
create policy rls_tasks_select_member
  on public.tasks for select to authenticated
  using (app_private.is_org_member(organization_id));
create policy rls_tasks_insert_writer
  on public.tasks for insert to authenticated
  with check (app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager']));
create policy rls_tasks_update_writer
  on public.tasks for update to authenticated
  using (app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager']))
  with check (app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager']));
create policy rls_tasks_delete_admin
  on public.tasks for delete to authenticated
  using (app_private.has_org_role(organization_id, array['owner','admin']));

alter table public.ai_incidents enable row level security;
alter table public.ai_incidents force row level security;
do $ai_incident_policy_cleanup$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_incidents'
      and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
      and roles && array['public', 'anon', 'authenticated']::name[]
  loop
    execute format('drop policy if exists %I on public.ai_incidents', policy_record.policyname);
  end loop;
end
$ai_incident_policy_cleanup$;

drop policy if exists "Organization members can read ai incidents" on public.ai_incidents;
drop policy if exists rls_ai_incidents_select_member on public.ai_incidents;
create policy rls_ai_incidents_select_member
  on public.ai_incidents for select to authenticated
  using (app_private.is_org_member(organization_id));
create policy rls_ai_incidents_insert_backend_only
  on public.ai_incidents for insert to authenticated with check (false);
create policy rls_ai_incidents_update_backend_only
  on public.ai_incidents for update to authenticated using (false) with check (false);
create policy rls_ai_incidents_delete_backend_only
  on public.ai_incidents for delete to authenticated using (false);
revoke insert, update, delete on table public.ai_incidents from public, anon, authenticated;
grant select on table public.ai_incidents to authenticated;
grant select, insert, update, delete on table public.ai_incidents to service_role;

drop policy if exists "Editors can insert AI systems" on public.ai_systems;
drop policy if exists "Editors can update AI systems" on public.ai_systems;
drop policy if exists "Members can read AI systems" on public.ai_systems;
drop policy if exists "Owners and admins can delete AI systems" on public.ai_systems;

drop policy if exists "Owners can manage subscriptions" on public.subscriptions;
drop policy if exists "Members can view subscriptions" on public.subscriptions;
revoke insert, update, delete on table public.subscriptions from public, anon, authenticated;
grant select on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.subscriptions to service_role;

do $live_policy_cleanup$
declare
  policy_record record;
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname like 'live_rls_%'
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
  end loop;
end
$live_policy_cleanup$;

drop function if exists public.live_rls_validation_apply_backend_only(text);
drop function if exists public.live_rls_validation_apply_org_scoped(text);
drop function if exists public.live_rls_validation_has_column(text, text);
drop function if exists app_private.live_rls_validation_is_org_member(uuid);

-- ---------------------------------------------------------------------------
-- 6. Fail-closed postconditions.
-- ---------------------------------------------------------------------------
do $enterprise_core_guard$
declare
  required_object text;
  required_policy record;
begin
  foreach required_object in array array[
    'public.intelligence_items',
    'public.intelligence_calendar_suggestions',
    'public.email_notification_events',
    'public.vendor_review_history'
  ]
  loop
    if to_regclass(required_object) is null then
      raise exception 'Required production object % is missing after reconciliation', required_object;
    end if;
  end loop;

  if to_regprocedure('public.create_organization_with_owner_atomic(text,text,uuid)') is null then
    raise exception 'Atomic organization creation RPC is missing after reconciliation';
  end if;

  if to_regprocedure('public.enforce_vendor_governance_integrity()') is null then
    raise exception 'Vendor governance tenant-integrity function is missing after reconciliation';
  end if;

  if has_function_privilege('anon', 'public.enforce_vendor_governance_integrity()'::regprocedure, 'EXECUTE')
    or has_function_privilege('authenticated', 'public.enforce_vendor_governance_integrity()'::regprocedure, 'EXECUTE')
    or not has_function_privilege('service_role', 'public.enforce_vendor_governance_integrity()'::regprocedure, 'EXECUTE') then
    raise exception 'Vendor governance tenant-integrity function privileges are not canonical';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.vendors'::regclass
      and tgname = 'enforce_vendor_governance_integrity'
      and not tgisinternal
  ) then
    raise exception 'Vendor governance tenant-integrity trigger is missing after reconciliation';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.vendors'::regclass
      and conname = 'vendors_risk_level_check'
  ) then
    raise exception 'Vendor risk-level constraint is missing after reconciliation';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and policyname like 'live_rls_%'
  ) then
    raise exception 'Temporary live_rls validation policy remains after reconciliation';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'Owners can manage subscriptions'
  ) then
    raise exception 'Legacy direct subscription mutation policy remains after reconciliation';
  end if;

  if to_regprocedure('public.live_rls_validation_apply_backend_only(text)') is not null
    or to_regprocedure('public.live_rls_validation_apply_org_scoped(text)') is not null
    or to_regprocedure('public.live_rls_validation_has_column(text,text)') is not null
    or to_regprocedure('app_private.live_rls_validation_is_org_member(uuid)') is not null then
    raise exception 'Temporary live RLS validation helper remains after reconciliation';
  end if;

  for required_policy in
    select *
    from (values
      ('subscriptions', 'rls_subscriptions_select_member'),
      ('subscriptions', 'rls_subscriptions_insert_backend_only'),
      ('subscriptions', 'rls_subscriptions_update_backend_only'),
      ('subscriptions', 'rls_subscriptions_delete_backend_only'),
      ('notifications', 'rls_notifications_select_recipient'),
      ('notifications', 'rls_notifications_insert_backend_only'),
      ('monitoring_preferences', 'rls_monitoring_preferences_select_self_or_admin'),
      ('monitoring_preferences', 'rls_monitoring_preferences_update_self_or_admin'),
      ('onboarding_activation_runs', 'rls_onboarding_activation_runs_select_member'),
      ('onboarding_activation_runs', 'rls_onboarding_activation_runs_insert_writer'),
      ('audit_events', 'rls_audit_events_select_member'),
      ('audit_events', 'rls_audit_events_insert_backend_only'),
      ('invitations', 'rls_invitations_select_member'),
      ('invitations', 'rls_invitations_insert_backend_only'),
      ('regulatory_updates', 'rls_regulatory_updates_select_authenticated'),
      ('regulatory_updates', 'rls_regulatory_updates_insert_backend_only'),
      ('tasks', 'rls_tasks_select_member'),
      ('tasks', 'rls_tasks_insert_writer'),
      ('tasks', 'rls_tasks_update_writer'),
      ('tasks', 'rls_tasks_delete_admin'),
      ('ai_systems', 'rls_ai_systems_select_member'),
      ('ai_systems', 'rls_ai_systems_insert_writer'),
      ('ai_systems', 'rls_ai_systems_update_writer'),
      ('ai_systems', 'rls_ai_systems_delete_admin'),
      ('ai_incidents', 'rls_ai_incidents_select_member'),
      ('ai_incidents', 'rls_ai_incidents_insert_backend_only'),
      ('ai_incidents', 'rls_ai_incidents_update_backend_only'),
      ('ai_incidents', 'rls_ai_incidents_delete_backend_only')
    ) as expected(table_name, policy_name)
  loop
    if not exists (
      select 1 from pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = required_policy.table_name
        and policy.policyname = required_policy.policy_name
    ) then
      raise exception 'Required canonical RLS policy %.% is missing',
        required_policy.table_name,
        required_policy.policy_name;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.subscriptions', 'INSERT')
    or has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE')
    or has_table_privilege('authenticated', 'public.subscriptions', 'DELETE')
    or has_table_privilege('authenticated', 'public.vendors', 'INSERT')
    or has_table_privilege('authenticated', 'public.vendors', 'UPDATE')
    or has_table_privilege('authenticated', 'public.vendors', 'DELETE') then
    raise exception 'Backend-only table still grants direct authenticated DML';
  end if;
end
$enterprise_core_guard$;

notify pgrst, 'reload schema';
commit;