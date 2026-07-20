begin;

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
alter table public.data_subject_requests enable row level security;
alter table public.audit_integrity_checkpoints enable row level security;

create policy "retention policies organization members read"
on public.data_retention_policies for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = data_retention_policies.organization_id and m.user_id = auth.uid()));

create policy "retention policies organization admins manage"
on public.data_retention_policies for all to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = data_retention_policies.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
with check (exists (select 1 from public.organization_members m where m.organization_id = data_retention_policies.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "retention policies organization admins delete"
on public.data_retention_policies for delete to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = data_retention_policies.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "data subjects read own requests"
on public.data_subject_requests for select to authenticated
using (requester_user_id = auth.uid() or exists (select 1 from public.organization_members m where m.organization_id = data_subject_requests.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "data subjects create own requests"
on public.data_subject_requests for insert to authenticated
with check (requester_user_id = auth.uid() and exists (select 1 from public.organization_members m where m.organization_id = data_subject_requests.organization_id and m.user_id = auth.uid()));

create policy "data subject admins process requests"
on public.data_subject_requests for update to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = data_subject_requests.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
with check (exists (select 1 from public.organization_members m where m.organization_id = data_subject_requests.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "data subject requesters cancel own pending requests"
on public.data_subject_requests for delete to authenticated
using (
  requester_user_id = auth.uid()
  and status in ('received','verified')
  or exists (
    select 1 from public.organization_members m
    where m.organization_id = data_subject_requests.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

create policy "audit checkpoints organization members read"
on public.audit_integrity_checkpoints for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = audit_integrity_checkpoints.organization_id and m.user_id = auth.uid()));

create policy "audit checkpoints admins create"
on public.audit_integrity_checkpoints for insert to authenticated
with check (exists (select 1 from public.organization_members m where m.organization_id = audit_integrity_checkpoints.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "audit checkpoints admins update"
on public.audit_integrity_checkpoints for update to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = audit_integrity_checkpoints.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
with check (exists (select 1 from public.organization_members m where m.organization_id = audit_integrity_checkpoints.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "audit checkpoints admins delete"
on public.audit_integrity_checkpoints for delete to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = audit_integrity_checkpoints.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create index if not exists data_subject_requests_org_status_due_idx on public.data_subject_requests (organization_id, status, due_at);
create index if not exists audit_integrity_checkpoints_org_generated_idx on public.audit_integrity_checkpoints (organization_id, generated_at desc);

commit;
