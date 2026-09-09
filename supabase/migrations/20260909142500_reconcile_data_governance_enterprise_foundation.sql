begin;

-- Forward-only Production reconciliation for the canonical data-governance
-- relations originally introduced by 20260720190000_data_governance_enterprise.
-- Production never recorded/applied that historical migration, so do not repair
-- migration history and do not create competing tables. Materialize the same
-- canonical public relations above the verified V41 ledger head, already under
-- the current least-privilege / FORCE RLS boundary. The following V42 migration
-- evolves public.data_subject_requests to the current GDPR lifecycle contract.

do $prerequisites$
begin
  if to_regclass('public.organizations') is null then
    raise exception 'public.organizations is required';
  end if;
  if to_regclass('public.organization_members') is null then
    raise exception 'public.organization_members is required';
  end if;
  if to_regclass('auth.users') is null then
    raise exception 'auth.users is required';
  end if;
end
$prerequisites$;

create table if not exists public.data_retention_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_category text not null check (char_length(data_category) between 2 and 80),
  retention_days integer not null check (retention_days between 1 and 3650),
  legal_basis text not null check (char_length(legal_basis) between 2 and 120),
  deletion_mode text not null default 'hard_delete' check (deletion_mode in ('hard_delete','anonymize','archive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, data_category)
);

create table if not exists public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('access','export','rectification','restriction','deletion','objection')),
  status text not null default 'received' check (status in ('received','verified','in_progress','completed','rejected','cancelled')),
  due_at timestamptz not null default (now() + interval '30 days'),
  completed_at timestamptz,
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table if not exists public.audit_integrity_checkpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_table text not null,
  range_started_at timestamptz not null,
  range_ended_at timestamptz not null,
  event_count bigint not null check (event_count >= 0),
  digest_sha256 text not null check (digest_sha256 ~ '^[a-f0-9]{64}$'),
  previous_digest_sha256 text check (previous_digest_sha256 is null or previous_digest_sha256 ~ '^[a-f0-9]{64}$'),
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id),
  check (range_ended_at >= range_started_at)
);

alter table public.data_retention_policies enable row level security;
alter table public.data_retention_policies force row level security;
alter table public.data_subject_requests enable row level security;
alter table public.data_subject_requests force row level security;
alter table public.audit_integrity_checkpoints enable row level security;
alter table public.audit_integrity_checkpoints force row level security;

-- New relations can inherit Supabase default table privileges. Remove browser
-- mutation authority explicitly before any policy is installed. Current server
-- code owns mutations through service-role reviewed APIs.
revoke all privileges on table public.data_retention_policies from anon, authenticated;
revoke all privileges on table public.data_subject_requests from anon, authenticated;
revoke all privileges on table public.audit_integrity_checkpoints from anon, authenticated;
grant select on table public.data_retention_policies to authenticated;
grant select on table public.data_subject_requests to authenticated;
grant select on table public.audit_integrity_checkpoints to authenticated;
grant all privileges on table public.data_retention_policies to service_role;
grant all privileges on table public.data_subject_requests to service_role;
grant all privileges on table public.audit_integrity_checkpoints to service_role;

drop policy if exists "retention policies organization members read" on public.data_retention_policies;
create policy "retention policies organization members read"
  on public.data_retention_policies
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members m
      where m.organization_id = data_retention_policies.organization_id
        and m.user_id = auth.uid()
        and coalesce(m.status, 'active') = 'active'
    )
  );

drop policy if exists "data subjects read own requests" on public.data_subject_requests;
create policy "data subjects read own requests"
  on public.data_subject_requests
  for select
  to authenticated
  using (
    requester_user_id = auth.uid()
    or exists (
      select 1
      from public.organization_members m
      where m.organization_id = data_subject_requests.organization_id
        and m.user_id = auth.uid()
        and coalesce(m.status, 'active') = 'active'
        and m.role in ('owner','admin')
    )
  );

drop policy if exists "audit checkpoints organization members read" on public.audit_integrity_checkpoints;
create policy "audit checkpoints organization members read"
  on public.audit_integrity_checkpoints
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members m
      where m.organization_id = audit_integrity_checkpoints.organization_id
        and m.user_id = auth.uid()
        and coalesce(m.status, 'active') = 'active'
    )
  );

create index if not exists data_subject_requests_org_status_due_idx
  on public.data_subject_requests (organization_id, status, due_at);
create index if not exists audit_integrity_checkpoints_org_generated_idx
  on public.audit_integrity_checkpoints (organization_id, generated_at desc);

do $verify$
declare
  target_table text;
begin
  foreach target_table in array array[
    'data_retention_policies',
    'data_subject_requests',
    'audit_integrity_checkpoints'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      raise exception 'data-governance reconciliation failed: public.% missing', target_table;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception 'data-governance reconciliation failed: RLS/FORCE RLS missing on public.%', target_table;
    end if;

    if has_table_privilege('anon', format('public.%I', target_table), 'SELECT')
       or has_table_privilege('anon', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('anon', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('anon', format('public.%I', target_table), 'DELETE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'DELETE')
       or not has_table_privilege('authenticated', format('public.%I', target_table), 'SELECT') then
      raise exception 'data-governance reconciliation failed: browser ACL boundary malformed on public.%', target_table;
    end if;
  end loop;
end
$verify$;

commit;
