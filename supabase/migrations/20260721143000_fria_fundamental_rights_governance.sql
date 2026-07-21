create table if not exists public.ai_fria_assessments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, ai_system_id uuid not null,
  version integer not null default 1 check (version > 0), applicability text not null check (applicability in ('required','not_required','uncertain')),
  stage text not null check (stage in ('draft','applicability_review','assessment','mitigation','approval','approved','blocked','retired')),
  context jsonb not null default '{}'::jsonb, affected_groups jsonb not null default '[]'::jsonb,
  rights_map jsonb not null default '[]'::jsonb, impact_analysis jsonb not null default '{}'::jsonb,
  mitigation_plan jsonb not null default '{}'::jsonb, oversight_plan jsonb not null default '{}'::jsonb,
  complaints_redress jsonb not null default '{}'::jsonb, monitoring_plan_id uuid,
  highest_residual_impact text not null default 'unknown' check (highest_residual_impact in ('none','low','medium','high','critical','unknown')),
  owner_id uuid not null, reviewer_id uuid, approver_id uuid, legal_review_required boolean not null default false,
  legal_review_completed_at timestamptz, approved_at timestamptz, review_due_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, ai_system_id, version), check (reviewer_id is null or reviewer_id <> owner_id),
  check (approver_id is null or (approver_id <> owner_id and approver_id is distinct from reviewer_id)),
  check (stage <> 'approved' or (approver_id is not null and approved_at is not null))
);
create table if not exists public.ai_fria_evidence (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, assessment_id uuid not null,
  control_id text not null, evidence_type text not null, storage_reference text, sha256_digest text,
  status text not null default 'submitted' check (status in ('submitted','accepted','rejected','expired')),
  submitted_by uuid not null, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz not null default now(),
  check (sha256_digest is null or sha256_digest ~ '^[0-9a-f]{64}$'),
  foreign key (organization_id, assessment_id) references public.ai_fria_assessments(organization_id, id)
);
create table if not exists public.ai_fria_decisions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, assessment_id uuid not null,
  decision text not null check (decision in ('applicability_confirmed','mitigation_required','approved','rejected','reassessment_required','retired')),
  rationale text not null, actor_id uuid not null, evidence_digest text, created_at timestamptz not null default now(),
  check (evidence_digest is null or evidence_digest ~ '^[0-9a-f]{64}$'),
  foreign key (organization_id, assessment_id) references public.ai_fria_assessments(organization_id, id)
);
create unique index if not exists ai_fria_assessments_org_id_id on public.ai_fria_assessments(organization_id,id);
create index if not exists ai_fria_assessments_due_idx on public.ai_fria_assessments(organization_id,stage,review_due_at);
create index if not exists ai_fria_evidence_assessment_idx on public.ai_fria_evidence(organization_id,assessment_id,control_id);
create index if not exists ai_fria_decisions_assessment_idx on public.ai_fria_decisions(organization_id,assessment_id,created_at desc);
alter table public.ai_fria_assessments enable row level security; alter table public.ai_fria_assessments force row level security;
alter table public.ai_fria_evidence enable row level security; alter table public.ai_fria_evidence force row level security;
alter table public.ai_fria_decisions enable row level security; alter table public.ai_fria_decisions force row level security;
revoke update, delete on public.ai_fria_decisions from anon, authenticated;
