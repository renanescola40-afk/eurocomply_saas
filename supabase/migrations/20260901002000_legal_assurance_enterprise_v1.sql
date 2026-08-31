begin;

-- RISCK COMPLY Legal Assurance Enterprise V1
-- Repository-side schema only. This migration does not authorize a Production push.
-- External counsel validation, partner activation and public enablement remain external gates.

do $preconditions$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.ai_systems') is null then
    raise exception 'legal assurance dependency spine is incomplete';
  end if;

  if to_regprocedure('app_private.is_org_member(uuid)') is null
     or to_regprocedure('app_private.has_org_role(uuid,text[])') is null
     or to_regprocedure('public.current_legacy_user_id()') is null
     or to_regprocedure('public.current_clerk_user_id()') is null then
    raise exception 'canonical tenant identity helpers are missing';
  end if;
end
$preconditions$;

create table if not exists public.law_firms (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (char_length(btrim(legal_name)) between 2 and 240),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 160),
  country text not null check (char_length(btrim(country)) between 2 and 120),
  registration_reference text,
  website text,
  status text not null default 'PENDING_VERIFICATION'
    check (status in ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','INACTIVE')),
  commercial_mode text not null default 'DIRECT_COUNSEL'
    check (commercial_mode in ('DIRECT_COUNSEL','CONTRACTUAL_BUNDLE','PLATFORM_COORDINATED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.counsel_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  clerk_user_id text,
  law_firm_id uuid not null references public.law_firms(id) on delete restrict,
  professional_name text not null check (char_length(btrim(professional_name)) between 2 and 200),
  professional_registration text,
  jurisdictions text[] not null default '{}'::text[],
  specialties text[] not null default '{}'::text[],
  verification_status text not null default 'PENDING_VERIFICATION'
    check (verification_status in ('PENDING_VERIFICATION','VERIFIED','REJECTED','SUSPENDED')),
  verified_at timestamptz,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(user_id, clerk_user_id) = 1),
  check ((verification_status = 'VERIFIED' and verified_at is not null) or verification_status <> 'VERIFIED')
);

create unique index if not exists counsel_profiles_user_id_unique
  on public.counsel_profiles(user_id) where user_id is not null;
create unique index if not exists counsel_profiles_clerk_user_id_unique
  on public.counsel_profiles(clerk_user_id) where clerk_user_id is not null;
create index if not exists counsel_profiles_law_firm_idx on public.counsel_profiles(law_firm_id, active, verification_status);

create table if not exists public.law_firm_capabilities (
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  capability text not null check (char_length(btrim(capability)) between 2 and 120),
  jurisdiction text not null check (char_length(btrim(jurisdiction)) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (law_firm_id, capability, jurisdiction)
);

create table if not exists public.legal_review_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  ai_system_id uuid references public.ai_systems(id) on delete restrict,
  requested_by_user_id uuid,
  requested_by_clerk_user_id text,
  law_firm_id uuid references public.law_firms(id) on delete restrict,
  assigned_counsel_id uuid references public.counsel_profiles(id) on delete restrict,
  review_type text not null check (char_length(btrim(review_type)) between 2 and 120),
  jurisdiction text not null check (char_length(btrim(jurisdiction)) between 2 and 120),
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  status text not null default 'REQUESTED' check (status in (
    'DRAFT','REQUESTED','CONFLICT_CHECK_PENDING','DECLINED','ENGAGEMENT_PENDING',
    'ACCEPTED_FOR_REVIEW','PACKAGE_PREPARING','READY_FOR_REVIEW','IN_REVIEW',
    'INFORMATION_REQUESTED','REMEDIATION_REQUIRED','RESUBMITTED','COMPLETED',
    'CANCELLED','EXPIRED','SUPERSEDED'
  )),
  priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  conflict_check_status text not null default 'PENDING'
    check (conflict_check_status in ('PENDING','ACCEPTED','DECLINED')),
  conflict_checked_at timestamptz,
  engagement_status text not null default 'NOT_STARTED'
    check (engagement_status in ('NOT_STARTED','PENDING','ACCEPTED','DECLINED')),
  engagement_reference text,
  engagement_accepted_at timestamptz,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,
  supersedes_review_id uuid references public.legal_review_requests(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(requested_by_user_id, requested_by_clerk_user_id) = 1),
  check (assigned_counsel_id is null or law_firm_id is not null)
);

create index if not exists legal_review_requests_org_status_idx
  on public.legal_review_requests(organization_id, status, updated_at desc);
create index if not exists legal_review_requests_counsel_status_idx
  on public.legal_review_requests(assigned_counsel_id, status, updated_at desc)
  where assigned_counsel_id is not null;
create index if not exists legal_review_requests_firm_idx
  on public.legal_review_requests(law_firm_id, updated_at desc)
  where law_firm_id is not null;

create table if not exists public.legal_review_access_grants (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.legal_review_requests(id) on delete cascade,
  law_firm_id uuid not null references public.law_firms(id) on delete restrict,
  counsel_profile_id uuid not null references public.counsel_profiles(id) on delete restrict,
  grant_scope text not null default 'REVIEW' check (grant_scope in ('CONFLICT_CHECK','ENGAGEMENT','REVIEW')),
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (review_id, counsel_profile_id, grant_scope),
  check ((active and revoked_at is null) or (not active))
);

create index if not exists legal_review_access_grants_counsel_idx
  on public.legal_review_access_grants(counsel_profile_id, active, review_id);

create table if not exists public.legal_review_packages (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.legal_review_requests(id) on delete restrict,
  package_version integer not null check (package_version > 0),
  product_release_sha text not null check (product_release_sha ~ '^[a-f0-9]{40}$'),
  methodology_version text not null check (char_length(btrim(methodology_version)) between 1 and 120),
  regulatory_rules_version text not null check (char_length(btrim(regulatory_rules_version)) between 1 and 120),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  package_manifest_digest text not null check (package_manifest_digest ~ '^[a-f0-9]{64}$'),
  created_by_user_id uuid,
  created_by_clerk_user_id text,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (review_id, package_version),
  unique (review_id, package_manifest_digest),
  check (num_nonnulls(created_by_user_id, created_by_clerk_user_id) = 1)
);

create index if not exists legal_review_packages_review_idx
  on public.legal_review_packages(review_id, package_version desc);

create table if not exists public.legal_review_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.legal_review_packages(id) on delete cascade,
  stable_identifier text not null check (char_length(btrim(stable_identifier)) between 1 and 240),
  content_reference text,
  content_snapshot jsonb,
  content_digest text not null check (content_digest ~ '^[a-f0-9]{64}$'),
  source_version text not null check (char_length(btrim(source_version)) between 1 and 120),
  captured_at timestamptz not null default now(),
  unique (package_id, stable_identifier),
  check (num_nonnulls(content_reference, content_snapshot) >= 1)
);

create table if not exists public.legal_review_decisions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.legal_review_requests(id) on delete restrict,
  package_id uuid not null references public.legal_review_packages(id) on delete restrict,
  law_firm_id uuid not null references public.law_firms(id) on delete restrict,
  counsel_id uuid not null references public.counsel_profiles(id) on delete restrict,
  decision text not null check (decision in ('ACCEPTED','ACCEPTED_WITH_CONDITIONS','REMEDIATION_REQUIRED','REJECTED','OUTSIDE_SCOPE')),
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  jurisdiction text not null check (char_length(btrim(jurisdiction)) between 2 and 120),
  rationale text not null check (char_length(btrim(rationale)) between 10 and 20000),
  conditions jsonb not null default '[]'::jsonb check (jsonb_typeof(conditions) = 'array'),
  exclusions jsonb not null default '[]'::jsonb check (jsonb_typeof(exclusions) = 'array'),
  issued_at timestamptz not null default now(),
  valid_until timestamptz,
  signed_artifact_reference text,
  decision_digest text not null check (decision_digest ~ '^[a-f0-9]{64}$'),
  supersedes_decision_id uuid references public.legal_review_decisions(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (review_id, decision_digest),
  check (valid_until is null or valid_until > issued_at)
);

create index if not exists legal_review_decisions_review_idx
  on public.legal_review_decisions(review_id, issued_at desc);

create table if not exists public.legal_review_remediation_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.legal_review_requests(id) on delete cascade,
  decision_id uuid references public.legal_review_decisions(id) on delete restrict,
  stable_finding_id text not null check (char_length(btrim(stable_finding_id)) between 1 and 240),
  title text not null check (char_length(btrim(title)) between 2 and 240),
  required_action text not null check (char_length(btrim(required_action)) between 2 and 10000),
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','READY_FOR_RESUBMISSION','RESUBMITTED','ACCEPTED','REJECTED','CLOSED')),
  customer_response jsonb not null default '{}'::jsonb check (jsonb_typeof(customer_response) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_id, stable_finding_id)
);

create table if not exists public.legal_review_information_requests (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.legal_review_requests(id) on delete cascade,
  requested_by_counsel_id uuid not null references public.counsel_profiles(id) on delete restrict,
  prompt text not null check (char_length(btrim(prompt)) between 2 and 10000),
  status text not null default 'OPEN' check (status in ('OPEN','ANSWERED','CLOSED','SUPERSEDED')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create table if not exists public.legal_review_information_responses (
  id uuid primary key default gen_random_uuid(),
  information_request_id uuid not null references public.legal_review_information_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  submitted_by_user_id uuid,
  submitted_by_clerk_user_id text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(submitted_by_user_id, submitted_by_clerk_user_id) = 1)
);

create table if not exists public.legal_review_artifacts (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.legal_review_requests(id) on delete cascade,
  decision_id uuid references public.legal_review_decisions(id) on delete restrict,
  artifact_reference text not null check (char_length(btrim(artifact_reference)) between 1 and 2048),
  artifact_digest text not null check (artifact_digest ~ '^[a-f0-9]{64}$'),
  artifact_type text not null check (char_length(btrim(artifact_type)) between 2 and 120),
  issuer text not null check (char_length(btrim(issuer)) between 2 and 240),
  issued_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (review_id, artifact_digest)
);

create or replace function app_private.is_current_counsel_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select target_profile_id is not null
    and exists (
      select 1
      from public.counsel_profiles cp
      where cp.id = target_profile_id
        and cp.active = true
        and cp.verification_status = 'VERIFIED'
        and (
          (public.current_legacy_user_id() is not null and cp.user_id = public.current_legacy_user_id())
          or
          (public.current_clerk_user_id() is not null and cp.clerk_user_id = public.current_clerk_user_id())
        )
    );
$$;

create or replace function app_private.can_access_legal_review(target_review_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select target_review_id is not null
    and exists (
      select 1
      from public.legal_review_requests lr
      where lr.id = target_review_id
        and (
          app_private.is_org_member(lr.organization_id)
          or exists (
            select 1
            from public.legal_review_access_grants lag
            join public.counsel_profiles cp on cp.id = lag.counsel_profile_id
            where lag.review_id = lr.id
              and lag.active = true
              and lag.revoked_at is null
              and lag.law_firm_id = cp.law_firm_id
              and app_private.is_current_counsel_profile(cp.id)
          )
        )
    );
$$;

revoke all on function app_private.is_current_counsel_profile(uuid) from public, anon;
revoke all on function app_private.can_access_legal_review(uuid) from public, anon;
grant execute on function app_private.is_current_counsel_profile(uuid) to authenticated, service_role;
grant execute on function app_private.can_access_legal_review(uuid) to authenticated, service_role;

create or replace function app_private.guard_frozen_legal_review_package()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.finalized_at is not null then
    raise exception 'finalized legal review packages are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create or replace function app_private.guard_legal_review_package_item_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_package_id uuid;
  is_finalized boolean;
begin
  target_package_id := case when tg_op = 'DELETE' then old.package_id else new.package_id end;
  select p.finalized_at is not null into is_finalized
  from public.legal_review_packages p
  where p.id = target_package_id;

  if coalesce(is_finalized, true) then
    raise exception 'finalized or missing legal review package cannot be mutated';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create or replace function app_private.guard_issued_legal_review_decision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  raise exception 'issued legal review decisions are immutable; create a superseding decision';
end
$$;

drop trigger if exists legal_review_packages_immutable_after_finalization on public.legal_review_packages;
create trigger legal_review_packages_immutable_after_finalization
before update or delete on public.legal_review_packages
for each row execute function app_private.guard_frozen_legal_review_package();

drop trigger if exists legal_review_package_items_frozen_with_package on public.legal_review_package_items;
create trigger legal_review_package_items_frozen_with_package
before insert or update or delete on public.legal_review_package_items
for each row execute function app_private.guard_legal_review_package_item_mutation();

drop trigger if exists legal_review_decisions_immutable on public.legal_review_decisions;
create trigger legal_review_decisions_immutable
before update or delete on public.legal_review_decisions
for each row execute function app_private.guard_issued_legal_review_decision();

create or replace function public.transition_legal_review_atomic(
  p_review_id uuid,
  p_expected_updated_at timestamptz,
  p_next_status text
)
returns table(outcome text, review_id uuid, review_status text, review_updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_row public.legal_review_requests%rowtype;
  transition_allowed boolean := false;
begin
  if p_review_id is null or p_expected_updated_at is null or p_next_status is null then
    return query select 'invalid_input'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select * into current_row
  from public.legal_review_requests
  where id = p_review_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  if current_row.updated_at <> p_expected_updated_at then
    return query select 'state_changed'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  transition_allowed := case current_row.status
    when 'DRAFT' then p_next_status in ('REQUESTED','CANCELLED')
    when 'REQUESTED' then p_next_status in ('CONFLICT_CHECK_PENDING','CANCELLED')
    when 'CONFLICT_CHECK_PENDING' then p_next_status in ('DECLINED','ENGAGEMENT_PENDING','CANCELLED')
    when 'ENGAGEMENT_PENDING' then p_next_status in ('ACCEPTED_FOR_REVIEW','DECLINED','CANCELLED')
    when 'ACCEPTED_FOR_REVIEW' then p_next_status in ('PACKAGE_PREPARING','CANCELLED')
    when 'PACKAGE_PREPARING' then p_next_status in ('READY_FOR_REVIEW','CANCELLED')
    when 'READY_FOR_REVIEW' then p_next_status in ('IN_REVIEW','CANCELLED','EXPIRED')
    when 'IN_REVIEW' then p_next_status in ('INFORMATION_REQUESTED','REMEDIATION_REQUIRED','COMPLETED','CANCELLED','EXPIRED')
    when 'INFORMATION_REQUESTED' then p_next_status in ('IN_REVIEW','CANCELLED','EXPIRED')
    when 'REMEDIATION_REQUIRED' then p_next_status in ('RESUBMITTED','CANCELLED','EXPIRED')
    when 'RESUBMITTED' then p_next_status in ('PACKAGE_PREPARING','CANCELLED','EXPIRED')
    when 'COMPLETED' then p_next_status in ('EXPIRED','SUPERSEDED')
    else false
  end;

  if not transition_allowed then
    return query select 'invalid_transition'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  if p_next_status in ('READY_FOR_REVIEW','IN_REVIEW','COMPLETED')
     and not exists (
       select 1 from public.legal_review_packages p
       where p.review_id = current_row.id and p.finalized_at is not null
     ) then
    return query select 'package_required'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  if p_next_status = 'COMPLETED'
     and not exists (
       select 1 from public.legal_review_decisions d
       where d.review_id = current_row.id
         and d.package_id in (
           select p.id from public.legal_review_packages p
           where p.review_id = current_row.id and p.finalized_at is not null
         )
     ) then
    return query select 'decision_required'::text, current_row.id, current_row.status, current_row.updated_at;
    return;
  end if;

  update public.legal_review_requests
  set status = p_next_status,
      accepted_at = case when p_next_status = 'ACCEPTED_FOR_REVIEW' then coalesce(accepted_at, now()) else accepted_at end,
      completed_at = case when p_next_status = 'COMPLETED' then coalesce(completed_at, now()) else completed_at end,
      cancelled_at = case when p_next_status = 'CANCELLED' then coalesce(cancelled_at, now()) else cancelled_at end,
      updated_at = now()
  where id = current_row.id
  returning id, status, updated_at into current_row.id, current_row.status, current_row.updated_at;

  return query select 'transitioned'::text, current_row.id, current_row.status, current_row.updated_at;
end
$$;

revoke all on function public.transition_legal_review_atomic(uuid,timestamptz,text) from public, anon, authenticated;
grant execute on function public.transition_legal_review_atomic(uuid,timestamptz,text) to service_role;

-- Browser clients may only read rows proven by tenant/matter RLS. Mutations remain backend-only.
revoke insert, update, delete on table public.law_firms from authenticated;
revoke insert, update, delete on table public.counsel_profiles from authenticated;
revoke insert, update, delete on table public.law_firm_capabilities from authenticated;
revoke insert, update, delete on table public.legal_review_requests from authenticated;
revoke insert, update, delete on table public.legal_review_access_grants from authenticated;
revoke insert, update, delete on table public.legal_review_packages from authenticated;
revoke insert, update, delete on table public.legal_review_package_items from authenticated;
revoke insert, update, delete on table public.legal_review_decisions from authenticated;
revoke insert, update, delete on table public.legal_review_remediation_items from authenticated;
revoke insert, update, delete on table public.legal_review_information_requests from authenticated;
revoke insert, update, delete on table public.legal_review_information_responses from authenticated;
revoke insert, update, delete on table public.legal_review_artifacts from authenticated;

grant select on table public.law_firms to authenticated;
grant select on table public.counsel_profiles to authenticated;
grant select on table public.law_firm_capabilities to authenticated;
grant select on table public.legal_review_requests to authenticated;
grant select on table public.legal_review_access_grants to authenticated;
grant select on table public.legal_review_packages to authenticated;
grant select on table public.legal_review_package_items to authenticated;
grant select on table public.legal_review_decisions to authenticated;
grant select on table public.legal_review_remediation_items to authenticated;
grant select on table public.legal_review_information_requests to authenticated;
grant select on table public.legal_review_information_responses to authenticated;
grant select on table public.legal_review_artifacts to authenticated;

do $rls$
declare
  table_name text;
begin
  foreach table_name in array array[
    'law_firms','counsel_profiles','law_firm_capabilities','legal_review_requests',
    'legal_review_access_grants','legal_review_packages','legal_review_package_items',
    'legal_review_decisions','legal_review_remediation_items','legal_review_information_requests',
    'legal_review_information_responses','legal_review_artifacts'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end
$rls$;

drop policy if exists legal_review_requests_matter_read on public.legal_review_requests;
create policy legal_review_requests_matter_read on public.legal_review_requests
for select to authenticated
using (app_private.can_access_legal_review(id));

drop policy if exists legal_review_access_grants_matter_read on public.legal_review_access_grants;
create policy legal_review_access_grants_matter_read on public.legal_review_access_grants
for select to authenticated
using (app_private.can_access_legal_review(review_id));

drop policy if exists legal_review_packages_matter_read on public.legal_review_packages;
create policy legal_review_packages_matter_read on public.legal_review_packages
for select to authenticated
using (app_private.can_access_legal_review(review_id));

drop policy if exists legal_review_package_items_matter_read on public.legal_review_package_items;
create policy legal_review_package_items_matter_read on public.legal_review_package_items
for select to authenticated
using (exists (
  select 1 from public.legal_review_packages p
  where p.id = legal_review_package_items.package_id
    and app_private.can_access_legal_review(p.review_id)
));

drop policy if exists legal_review_decisions_matter_read on public.legal_review_decisions;
create policy legal_review_decisions_matter_read on public.legal_review_decisions
for select to authenticated
using (app_private.can_access_legal_review(review_id));

drop policy if exists legal_review_remediation_matter_read on public.legal_review_remediation_items;
create policy legal_review_remediation_matter_read on public.legal_review_remediation_items
for select to authenticated
using (app_private.can_access_legal_review(review_id));

drop policy if exists legal_review_information_requests_matter_read on public.legal_review_information_requests;
create policy legal_review_information_requests_matter_read on public.legal_review_information_requests
for select to authenticated
using (app_private.can_access_legal_review(review_id));

drop policy if exists legal_review_information_responses_matter_read on public.legal_review_information_responses;
create policy legal_review_information_responses_matter_read on public.legal_review_information_responses
for select to authenticated
using (exists (
  select 1 from public.legal_review_information_requests ir
  where ir.id = legal_review_information_responses.information_request_id
    and app_private.can_access_legal_review(ir.review_id)
));

drop policy if exists legal_review_artifacts_matter_read on public.legal_review_artifacts;
create policy legal_review_artifacts_matter_read on public.legal_review_artifacts
for select to authenticated
using (app_private.can_access_legal_review(review_id));

drop policy if exists counsel_profiles_scoped_read on public.counsel_profiles;
create policy counsel_profiles_scoped_read on public.counsel_profiles
for select to authenticated
using (
  app_private.is_current_counsel_profile(id)
  or exists (
    select 1 from public.legal_review_requests lr
    where lr.assigned_counsel_id = counsel_profiles.id
      and app_private.is_org_member(lr.organization_id)
  )
);

drop policy if exists law_firms_scoped_read on public.law_firms;
create policy law_firms_scoped_read on public.law_firms
for select to authenticated
using (
  exists (
    select 1 from public.counsel_profiles cp
    where cp.law_firm_id = law_firms.id
      and app_private.is_current_counsel_profile(cp.id)
  )
  or exists (
    select 1 from public.legal_review_requests lr
    where lr.law_firm_id = law_firms.id
      and app_private.is_org_member(lr.organization_id)
  )
);

drop policy if exists law_firm_capabilities_scoped_read on public.law_firm_capabilities;
create policy law_firm_capabilities_scoped_read on public.law_firm_capabilities
for select to authenticated
using (exists (
  select 1 from public.law_firms lf
  where lf.id = law_firm_capabilities.law_firm_id
));

-- Postconditions: fail the migration if a future edit accidentally opens a mutation path.
do $postconditions$
declare
  table_name text;
  rls_enabled boolean;
  rls_forced boolean;
  mutation_policy_count integer;
begin
  foreach table_name in array array[
    'law_firms','counsel_profiles','law_firm_capabilities','legal_review_requests',
    'legal_review_access_grants','legal_review_packages','legal_review_package_items',
    'legal_review_decisions','legal_review_remediation_items','legal_review_information_requests',
    'legal_review_information_responses','legal_review_artifacts'
  ] loop
    select c.relrowsecurity, c.relforcerowsecurity
    into rls_enabled, rls_forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = table_name;

    if not coalesce(rls_enabled, false) or not coalesce(rls_forced, false) then
      raise exception 'legal assurance RLS/FORCE RLS is incomplete for %', table_name;
    end if;

    select count(*) into mutation_policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename = table_name
      and cmd in ('INSERT','UPDATE','DELETE','ALL')
      and 'authenticated' = any(roles);

    if mutation_policy_count <> 0 then
      raise exception 'authenticated legal assurance mutation policy unexpectedly exists for %', table_name;
    end if;
  end loop;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'transition_legal_review_atomic'
      and p.prosecdef = true
  ) then
    raise exception 'legal review atomic transition authority is missing';
  end if;
end
$postconditions$;

commit;
