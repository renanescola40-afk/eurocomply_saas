begin;

-- Extend the existing canonical data_subject_requests table. Do not create a
-- competing DSR/DSAR data plane. The original 2026-07 migration used a fixed
-- 30-day default; GDPR Article 12(3) is expressed as one month, with a possible
-- extension of up to two further months where the statutory conditions are met.
do $prerequisite$
begin
  if to_regclass('public.data_subject_requests') is null then
    raise exception 'Canonical public.data_subject_requests table is required';
  end if;
end
$prerequisite$;

alter table public.data_subject_requests
  add column if not exists received_at timestamptz,
  add column if not exists initial_due_at timestamptz,
  add column if not exists identity_verification_state text not null default 'pending',
  add column if not exists identity_verification_requested_at timestamptz,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists role_route text not null default 'under_review',
  add column if not exists customer_controller_reference text,
  add column if not exists extension_reason text,
  add column if not exists extension_notified_at timestamptz,
  add column if not exists extended_due_at timestamptz,
  add column if not exists decision text,
  add column if not exists decision_reason text,
  add column if not exists evidence_refs jsonb not null default '[]'::jsonb;

update public.data_subject_requests
set received_at = coalesce(received_at, created_at, now())
where received_at is null;

-- Historical requests may already have exposed/operated on the old +30-day due
-- date. Preserve that exact historical deadline as their initial baseline rather
-- than silently rewriting history. New requests are created server-side with an
-- explicit one-calendar-month target after this migration.
update public.data_subject_requests
set initial_due_at = coalesce(initial_due_at, due_at, received_at + interval '1 month')
where initial_due_at is null;

alter table public.data_subject_requests
  alter column received_at set default now(),
  alter column received_at set not null,
  alter column initial_due_at set not null,
  alter column due_at drop default;

alter table public.data_subject_requests
  drop constraint if exists data_subject_requests_request_type_check,
  drop constraint if exists data_subject_requests_status_check,
  drop constraint if exists data_subject_requests_identity_verification_state_check,
  drop constraint if exists data_subject_requests_role_route_check,
  drop constraint if exists data_subject_requests_decision_check,
  drop constraint if exists data_subject_requests_deadline_order_check,
  drop constraint if exists data_subject_requests_extension_integrity_check,
  drop constraint if exists data_subject_requests_evidence_refs_array_check;

alter table public.data_subject_requests
  add constraint data_subject_requests_request_type_check
    check (request_type in (
      'access',
      'export',
      'rectification',
      'restriction',
      'deletion',
      'objection',
      'portability',
      'consent_withdrawal'
    )),
  add constraint data_subject_requests_status_check
    check (status in (
      'received',
      'awaiting_identity',
      'verified',
      'in_progress',
      'routed_to_controller',
      'completed',
      'rejected',
      'cancelled'
    )),
  add constraint data_subject_requests_identity_verification_state_check
    check (identity_verification_state in ('pending','not_required','verified','failed')),
  add constraint data_subject_requests_role_route_check
    check (role_route in ('controller','processor','mixed','under_review')),
  add constraint data_subject_requests_decision_check
    check (decision is null or decision in ('fulfilled','partially_fulfilled','refused','withdrawn','routed_to_controller')),
  add constraint data_subject_requests_deadline_order_check
    check (initial_due_at >= received_at and due_at >= initial_due_at),
  add constraint data_subject_requests_extension_integrity_check
    check (
      (extended_due_at is null and extension_reason is null and extension_notified_at is null)
      or (
        extended_due_at is not null
        and extension_reason is not null
        and char_length(trim(extension_reason)) between 2 and 1000
        and extension_notified_at is not null
        and extended_due_at = due_at
        and extended_due_at <= initial_due_at + interval '2 months'
      )
    ),
  add constraint data_subject_requests_evidence_refs_array_check
    check (jsonb_typeof(evidence_refs) = 'array');

-- A completed request must keep completion evidence. Recreate the historical
-- unnamed check with an explicit stable name and permit rejected/cancelled rows
-- to remain without completed_at.
alter table public.data_subject_requests
  drop constraint if exists data_subject_requests_check,
  drop constraint if exists data_subject_requests_completion_check;

alter table public.data_subject_requests
  add constraint data_subject_requests_completion_check
    check ((status = 'completed' and completed_at is not null) or status <> 'completed');

alter table public.data_subject_requests enable row level security;
alter table public.data_subject_requests force row level security;

-- Keep tenant-scoped/self reads but move every mutation behind reviewed server
-- APIs. Historical permissive mutation policies are removed and table ACLs are
-- fail-closed for browsers.
drop policy if exists "data subjects create own requests" on public.data_subject_requests;
drop policy if exists "data subject admins process requests" on public.data_subject_requests;
drop policy if exists "data subject requesters cancel own pending requests" on public.data_subject_requests;

revoke insert, update, delete on table public.data_subject_requests from anon, authenticated;
grant select on table public.data_subject_requests to authenticated;

-- Defense in depth in case a future migration accidentally restores a table
-- grant. Service-role/server processing remains authoritative.
drop policy if exists "restrict_data_subject_requests_insert_server_only" on public.data_subject_requests;
create policy "restrict_data_subject_requests_insert_server_only"
  on public.data_subject_requests
  as restrictive
  for insert
  to authenticated
  with check (false);

drop policy if exists "restrict_data_subject_requests_update_server_only" on public.data_subject_requests;
create policy "restrict_data_subject_requests_update_server_only"
  on public.data_subject_requests
  as restrictive
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "restrict_data_subject_requests_delete_server_only" on public.data_subject_requests;
create policy "restrict_data_subject_requests_delete_server_only"
  on public.data_subject_requests
  as restrictive
  for delete
  to authenticated
  using (false);

create index if not exists data_subject_requests_org_received_idx
  on public.data_subject_requests (organization_id, received_at desc);
create index if not exists data_subject_requests_org_due_open_idx
  on public.data_subject_requests (organization_id, due_at)
  where status not in ('completed','rejected','cancelled');

-- Forward-only postcondition. This verifies structure and authority without
-- asserting that any request has been legally decided.
do $verify$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'data_subject_requests'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ) then
    raise exception 'data_subject_requests RLS/FORCE RLS postcondition failed';
  end if;

  if has_table_privilege('anon', 'public.data_subject_requests', 'INSERT')
     or has_table_privilege('anon', 'public.data_subject_requests', 'UPDATE')
     or has_table_privilege('anon', 'public.data_subject_requests', 'DELETE')
     or has_table_privilege('authenticated', 'public.data_subject_requests', 'INSERT')
     or has_table_privilege('authenticated', 'public.data_subject_requests', 'UPDATE')
     or has_table_privilege('authenticated', 'public.data_subject_requests', 'DELETE')
     or not has_table_privilege('authenticated', 'public.data_subject_requests', 'SELECT') then
    raise exception 'data_subject_requests browser privilege boundary is not least privilege';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='data_subject_requests' and column_name='received_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='data_subject_requests' and column_name='role_route'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='data_subject_requests' and column_name='extended_due_at'
  ) then
    raise exception 'data_subject_requests lifecycle columns missing';
  end if;
end
$verify$;

commit;
