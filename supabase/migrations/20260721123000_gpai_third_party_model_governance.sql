begin;

create table if not exists public.ai_model_registry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_system_id uuid references public.ai_systems(id) on delete set null,
  model_name text not null check (char_length(model_name) between 1 and 200),
  provider_name text not null check (char_length(provider_name) between 1 and 200),
  model_version text not null check (char_length(model_version) between 1 and 160),
  organization_role text not null check (organization_role in ('provider','downstream_provider','deployer','importer','distributor','product_manufacturer','unknown')),
  role_rationale text,
  intended_use text not null,
  downstream_integration text not null,
  systemic_risk_profile text not null default 'unknown' check (systemic_risk_profile in ('standard','systemic_risk_possible','systemic_risk_confirmed','unknown')),
  lifecycle_status text not null default 'draft' check (lifecycle_status in ('draft','review_required','evidence_required','approval_required','approved','blocked','retired')),
  accountable_owner_id uuid not null references auth.users(id),
  reviewer_id uuid references auth.users(id),
  approver_id uuid references auth.users(id),
  approved_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, model_name, model_version),
  check (reviewer_id is null or reviewer_id <> accountable_owner_id),
  check (approver_id is null or approver_id <> accountable_owner_id),
  check ((lifecycle_status <> 'approved') or (approver_id is not null and approved_at is not null)),
  check ((lifecycle_status <> 'blocked') or approved_at is null)
);

create table if not exists public.ai_model_governance_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  model_id uuid not null references public.ai_model_registry(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('provider_documentation','limitations','acceptable_use','copyright_policy','training_content_summary','risk_information','systemic_risk_review','contract','change_notice','incident_link','legal_review','approval')),
  status text not null default 'missing' check (status in ('missing','requested','received','reviewed','accepted','rejected','expired')),
  evidence_reference text,
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz,
  expires_at timestamptz,
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  notes text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique (model_id, evidence_type, version),
  check ((status not in ('reviewed','accepted','rejected')) or (reviewer_id is not null and reviewed_at is not null)),
  check (expires_at is null or issued_at is null or expires_at > issued_at)
);

create table if not exists public.ai_model_governance_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  model_id uuid not null references public.ai_model_registry(id) on delete cascade,
  decision_type text not null check (decision_type in ('role_classification','systemic_risk_scope','evidence_acceptance','approval','rejection','block','retirement','reassessment')),
  outcome text not null check (outcome in ('approved','rejected','needs_review','blocked','superseded')),
  rationale text not null check (char_length(rationale) between 1 and 8000),
  methodology_version text not null,
  legal_reference text,
  requires_legal_review boolean not null default false,
  decision_maker_id uuid not null references auth.users(id),
  decided_at timestamptz not null default now(),
  supersedes_decision_id uuid references public.ai_model_governance_decisions(id),
  created_at timestamptz not null default now()
);

create index if not exists ai_model_registry_org_status_idx on public.ai_model_registry (organization_id, lifecycle_status);
create index if not exists ai_model_registry_review_idx on public.ai_model_registry (organization_id, systemic_risk_profile, updated_at desc);
create index if not exists ai_model_evidence_model_status_idx on public.ai_model_governance_evidence (model_id, status, evidence_type);
create index if not exists ai_model_decisions_model_time_idx on public.ai_model_governance_decisions (model_id, decided_at desc);

alter table public.ai_model_registry enable row level security;
alter table public.ai_model_registry force row level security;
alter table public.ai_model_governance_evidence enable row level security;
alter table public.ai_model_governance_evidence force row level security;
alter table public.ai_model_governance_decisions enable row level security;
alter table public.ai_model_governance_decisions force row level security;

create policy ai_model_registry_select on public.ai_model_registry
for select to authenticated
using (public.is_organization_member(organization_id));

create policy ai_model_registry_manage on public.ai_model_registry
for all to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

create policy ai_model_evidence_select on public.ai_model_governance_evidence
for select to authenticated
using (public.is_organization_member(organization_id));

create policy ai_model_evidence_manage on public.ai_model_governance_evidence
for all to authenticated
using (public.is_organization_admin(organization_id))
with check (
  public.is_organization_admin(organization_id)
  and exists (
    select 1 from public.ai_model_registry registry
    where registry.id = model_id and registry.organization_id = organization_id
  )
);

create policy ai_model_decisions_select on public.ai_model_governance_decisions
for select to authenticated
using (public.is_organization_member(organization_id));

create policy ai_model_decisions_insert on public.ai_model_governance_decisions
for insert to authenticated
with check (
  public.is_organization_admin(organization_id)
  and decision_maker_id = auth.uid()
  and exists (
    select 1 from public.ai_model_registry registry
    where registry.id = model_id and registry.organization_id = organization_id
  )
);

revoke update, delete on public.ai_model_governance_decisions from anon, authenticated;

grant select, insert, update, delete on public.ai_model_registry to authenticated;
grant select, insert, update, delete on public.ai_model_governance_evidence to authenticated;
grant select, insert on public.ai_model_governance_decisions to authenticated;

commit;
