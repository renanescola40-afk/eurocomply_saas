begin;

create table if not exists public.vendor_due_diligence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_name text not null check (char_length(vendor_name) between 2 and 120),
  service_category text not null check (char_length(service_category) between 2 and 80),
  risk_tier text not null check (risk_tier in ('low','medium','high','critical')),
  security_review_status text not null default 'not_started' check (security_review_status in ('not_started','in_progress','approved','rejected','expired')),
  privacy_review_status text not null default 'not_started' check (privacy_review_status in ('not_started','in_progress','approved','rejected','expired')),
  dpa_status text not null default 'missing' check (dpa_status in ('missing','requested','signed','expired','not_required')),
  subprocessor_disclosed boolean not null default false,
  data_residency_region text,
  review_due_at timestamptz not null default (now() + interval '365 days'),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, vendor_name)
);

create table if not exists public.enterprise_procurement_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 2 and 160),
  request_type text not null check (request_type in ('security_questionnaire','dpa','sla','subprocessor_list','architecture_review','penetration_test','other')),
  status text not null default 'received' check (status in ('received','triaged','in_progress','waiting_customer','completed','rejected','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at timestamptz not null default (now() + interval '10 business days'),
  completed_at timestamptz,
  assigned_to uuid references auth.users(id),
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table if not exists public.trust_evidence_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  package_name text not null check (char_length(package_name) between 2 and 120),
  package_version text not null check (char_length(package_version) between 1 and 40),
  evidence_scope text[] not null default '{}',
  classification text not null default 'confidential' check (classification in ('public','internal','confidential','restricted')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  digest_sha256 text not null check (digest_sha256 ~ '^[a-f0-9]{64}$'),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (valid_until > valid_from),
  unique (organization_id, package_name, package_version)
);

alter table public.vendor_due_diligence enable row level security;
alter table public.enterprise_procurement_requests enable row level security;
alter table public.trust_evidence_packages enable row level security;

create policy "vendor diligence members read" on public.vendor_due_diligence for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = vendor_due_diligence.organization_id and m.user_id = auth.uid()));
create policy "vendor diligence admins insert" on public.vendor_due_diligence for insert to authenticated
with check (exists (select 1 from public.organization_members m where m.organization_id = vendor_due_diligence.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "vendor diligence admins update" on public.vendor_due_diligence for update to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = vendor_due_diligence.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
with check (exists (select 1 from public.organization_members m where m.organization_id = vendor_due_diligence.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "vendor diligence admins delete" on public.vendor_due_diligence for delete to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = vendor_due_diligence.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "procurement members read" on public.enterprise_procurement_requests for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = enterprise_procurement_requests.organization_id and m.user_id = auth.uid()));
create policy "procurement members create" on public.enterprise_procurement_requests for insert to authenticated
with check (requester_user_id = auth.uid() and exists (select 1 from public.organization_members m where m.organization_id = enterprise_procurement_requests.organization_id and m.user_id = auth.uid()));
create policy "procurement admins update" on public.enterprise_procurement_requests for update to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = enterprise_procurement_requests.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
with check (exists (select 1 from public.organization_members m where m.organization_id = enterprise_procurement_requests.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "procurement requester or admins delete" on public.enterprise_procurement_requests for delete to authenticated
using (requester_user_id = auth.uid() or exists (select 1 from public.organization_members m where m.organization_id = enterprise_procurement_requests.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "trust packages members read" on public.trust_evidence_packages for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = trust_evidence_packages.organization_id and m.user_id = auth.uid()));
create policy "trust packages admins insert" on public.trust_evidence_packages for insert to authenticated
with check (exists (select 1 from public.organization_members m where m.organization_id = trust_evidence_packages.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "trust packages admins update" on public.trust_evidence_packages for update to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = trust_evidence_packages.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
with check (exists (select 1 from public.organization_members m where m.organization_id = trust_evidence_packages.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "trust packages admins delete" on public.trust_evidence_packages for delete to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = trust_evidence_packages.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create index if not exists vendor_due_diligence_org_risk_due_idx on public.vendor_due_diligence (organization_id, risk_tier, review_due_at);
create index if not exists enterprise_procurement_org_status_due_idx on public.enterprise_procurement_requests (organization_id, status, due_at);
create index if not exists trust_evidence_packages_org_validity_idx on public.trust_evidence_packages (organization_id, valid_until);

commit;
