begin;

create table if not exists public.ai_provider_data_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  system_reference text not null check (char_length(btrim(system_reference)) between 3 and 240),
  program_version integer not null default 1 check (program_version > 0),
  applicability text not null default 'uncertain' check (
    applicability in ('required', 'not_required', 'uncertain')
  ),
  provider_role text not null default 'uncertain' check (
    provider_role in ('provider', 'not_provider', 'uncertain')
  ),
  status text not null default 'draft' check (
    status in (
      'draft',
      'applicability_review',
      'inventory',
      'assessment',
      'mitigation',
      'validation',
      'approval',
      'approved',
      'blocked',
      'not_applicable',
      'retired'
    )
  ),
  dataset_count integer not null default 0 check (dataset_count >= 0),
  approved_dataset_count integer not null default 0 check (
    approved_dataset_count >= 0 and approved_dataset_count <= dataset_count
  ),
  open_high_findings integer not null default 0 check (open_high_findings >= 0),
  open_critical_findings integer not null default 0 check (open_critical_findings >= 0),
  uses_special_category_data boolean not null default false,
  owner_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  approver_user_id uuid references auth.users(id),
  legal_reviewed_by_user_id uuid references auth.users(id),
  program_digest text check (program_digest is null or program_digest ~ '^[a-f0-9]{64}$'),
  last_material_change_at timestamptz,
  reviewed_at timestamptz,
  legal_reviewed_at timestamptz,
  approved_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, system_reference, program_version),
  constraint ai_provider_data_program_actor_separation check (
    (reviewer_user_id is null or reviewer_user_id <> owner_user_id)
    and (approver_user_id is null or approver_user_id <> owner_user_id)
    and (
      approver_user_id is null
      or reviewer_user_id is null
      or approver_user_id <> reviewer_user_id
    )
  ),
  constraint ai_provider_data_program_approval_integrity check (
    status <> 'approved'
    or (
      applicability = 'required'
      and provider_role = 'provider'
      and dataset_count > 0
      and approved_dataset_count = dataset_count
      and open_high_findings = 0
      and open_critical_findings = 0
      and reviewer_user_id is not null
      and approver_user_id is not null
      and program_digest is not null
      and reviewed_at is not null
      and approved_at is not null
      and (last_material_change_at is null or reviewed_at >= last_material_change_at)
      and (
        uses_special_category_data = false
        or (
          legal_reviewed_by_user_id is not null
          and legal_reviewed_at is not null
        )
      )
    )
  ),
  constraint ai_provider_data_program_non_applicability_integrity check (
    status <> 'not_applicable'
    or (
      applicability = 'not_required'
      or provider_role = 'not_provider'
    )
    and legal_reviewed_by_user_id is not null
    and legal_reviewed_at is not null
  ),
  constraint ai_provider_data_program_retirement_integrity check (
    status <> 'retired' or retired_at is not null
  )
);

create table if not exists public.ai_provider_datasets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null,
  name text not null check (char_length(btrim(name)) between 3 and 240),
  purpose text not null check (char_length(btrim(purpose)) between 10 and 4000),
  lifecycle_role text not null check (
    lifecycle_role in (
      'training',
      'validation',
      'testing',
      'reference',
      'fine_tuning',
      'retrieval',
      'synthetic',
      'monitoring'
    )
  ),
  source_category text not null check (
    source_category in (
      'internal',
      'third_party',
      'public',
      'synthetic',
      'user_generated',
      'mixed'
    )
  ),
  dataset_version text not null check (char_length(btrim(dataset_version)) between 1 and 160),
  status text not null default 'draft' check (
    status in (
      'draft',
      'inventory',
      'assessment',
      'mitigation',
      'validation',
      'approved',
      'needs_update',
      'retired'
    )
  ),
  source_version text not null default '',
  provenance_digest text check (
    provenance_digest is null or provenance_digest ~ '^[a-f0-9]{64}$'
  ),
  schema_digest text check (schema_digest is null or schema_digest ~ '^[a-f0-9]{64}$'),
  required_assessment_count integer not null default 10 check (required_assessment_count > 0),
  approved_assessment_count integer not null default 0 check (
    approved_assessment_count >= 0
    and approved_assessment_count <= required_assessment_count
  ),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  open_high_findings integer not null default 0 check (open_high_findings >= 0),
  open_critical_findings integer not null default 0 check (open_critical_findings >= 0),
  owner_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  last_material_change_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, program_id, id),
  unique (organization_id, program_id, name, dataset_version),
  foreign key (organization_id, program_id)
    references public.ai_provider_data_programs(organization_id, id)
    on delete cascade,
  constraint ai_provider_dataset_reviewer_separation check (
    reviewer_user_id is null or reviewer_user_id <> owner_user_id
  ),
  constraint ai_provider_dataset_approval_integrity check (
    status <> 'approved'
    or (
      char_length(btrim(source_version)) >= 1
      and provenance_digest is not null
      and schema_digest is not null
      and approved_assessment_count = required_assessment_count
      and evidence_count > 0
      and open_high_findings = 0
      and open_critical_findings = 0
      and reviewer_user_id is not null
      and reviewed_at is not null
      and approved_at is not null
      and (last_material_change_at is null or reviewed_at >= last_material_change_at)
    )
  ),
  constraint ai_provider_dataset_retirement_integrity check (
    status <> 'retired' or retired_at is not null
  )
);

create table if not exists public.ai_provider_dataset_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null,
  dataset_id uuid not null,
  assessment_type text not null check (
    assessment_type in (
      'provenance',
      'relevance',
      'representativeness',
      'completeness',
      'accuracy',
      'statistical_properties',
      'protected_groups',
      'bias',
      'data_gaps',
      'leakage',
      'quality',
      'other'
    )
  ),
  assessment_version integer not null default 1 check (assessment_version > 0),
  status text not null default 'draft' check (
    status in ('draft', 'in_review', 'approved', 'needs_work', 'superseded')
  ),
  methodology text not null default '',
  findings text not null default '',
  residual_risk text not null default 'unknown' check (
    residual_risk in ('none', 'low', 'medium', 'high', 'critical', 'unknown')
  ),
  assessor_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  evidence_digest text check (
    evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'
  ),
  assessed_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, program_id, dataset_id, id),
  unique (
    organization_id,
    program_id,
    dataset_id,
    assessment_type,
    assessment_version
  ),
  foreign key (organization_id, program_id, dataset_id)
    references public.ai_provider_datasets(organization_id, program_id, id)
    on delete cascade,
  constraint ai_provider_dataset_assessment_reviewer_separation check (
    reviewer_user_id is null or reviewer_user_id <> assessor_user_id
  ),
  constraint ai_provider_dataset_assessment_approval_integrity check (
    status <> 'approved'
    or (
      char_length(btrim(methodology)) >= 10
      and char_length(btrim(findings)) >= 10
      and residual_risk <> 'unknown'
      and reviewer_user_id is not null
      and evidence_digest is not null
      and assessed_at is not null
      and reviewed_at is not null
      and approved_at is not null
    )
  )
);

create table if not exists public.ai_provider_dataset_mitigations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null,
  dataset_id uuid not null,
  assessment_id uuid,
  mitigation_type text not null check (
    mitigation_type in (
      'collection',
      'sampling',
      'rebalancing',
      'cleaning',
      'labeling',
      'augmentation',
      'restriction',
      'monitoring',
      'human_review',
      'other'
    )
  ),
  description text not null check (char_length(btrim(description)) between 10 and 4000),
  status text not null default 'planned' check (
    status in (
      'planned',
      'in_progress',
      'verification',
      'effective',
      'ineffective',
      'accepted_risk',
      'cancelled'
    )
  ),
  owner_user_id uuid not null references auth.users(id),
  verified_by_user_id uuid references auth.users(id),
  due_at timestamptz,
  evidence_digest text check (
    evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'
  ),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, program_id, dataset_id)
    references public.ai_provider_datasets(organization_id, program_id, id)
    on delete cascade,
  foreign key (organization_id, program_id, dataset_id, assessment_id)
    references public.ai_provider_dataset_assessments(
      organization_id,
      program_id,
      dataset_id,
      id
    )
    on delete set null,
  constraint ai_provider_dataset_mitigation_verifier_separation check (
    verified_by_user_id is null or verified_by_user_id <> owner_user_id
  ),
  constraint ai_provider_dataset_mitigation_effectiveness_integrity check (
    status not in ('effective', 'accepted_risk')
    or (
      verified_by_user_id is not null
      and evidence_digest is not null
      and verified_at is not null
    )
  )
);

create table if not exists public.ai_provider_dataset_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null,
  dataset_id uuid not null,
  evidence_type text not null check (
    evidence_type in (
      'source_manifest',
      'licence',
      'data_sheet',
      'quality_report',
      'bias_report',
      'statistical_report',
      'lineage_record',
      'test_report',
      'approval',
      'external_report',
      'other'
    )
  ),
  evidence_reference text not null check (
    char_length(btrim(evidence_reference)) between 3 and 1000
  ),
  evidence_digest text not null check (evidence_digest ~ '^[a-f0-9]{64}$'),
  source_version text not null check (char_length(btrim(source_version)) between 1 and 160),
  submitted_by_user_id uuid references auth.users(id),
  collected_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (organization_id, dataset_id, evidence_digest),
  foreign key (organization_id, program_id, dataset_id)
    references public.ai_provider_datasets(organization_id, program_id, id)
    on delete cascade
);

create table if not exists public.ai_provider_data_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null,
  decision_type text not null check (
    decision_type in (
      'applicability',
      'provider_role',
      'dataset_approval',
      'bias_mitigation',
      'special_category_review',
      'program_approval',
      'program_blocked',
      'not_applicable',
      'retired'
    )
  ),
  outcome text not null check (
    outcome in ('approved', 'rejected', 'needs_work', 'blocked', 'not_applicable', 'retired')
  ),
  rationale text not null check (char_length(btrim(rationale)) between 10 and 4000),
  actor_user_id uuid references auth.users(id),
  evidence_digest text check (
    evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'
  ),
  created_at timestamptz not null default now(),
  foreign key (organization_id, program_id)
    references public.ai_provider_data_programs(organization_id, id)
    on delete cascade
);

create index if not exists ai_provider_data_programs_queue_idx
  on public.ai_provider_data_programs (organization_id, status, updated_at desc);
create index if not exists ai_provider_datasets_review_idx
  on public.ai_provider_datasets (organization_id, program_id, status, reviewed_at);
create index if not exists ai_provider_dataset_assessments_queue_idx
  on public.ai_provider_dataset_assessments (
    organization_id,
    dataset_id,
    status,
    assessment_type
  );
create index if not exists ai_provider_dataset_mitigations_due_idx
  on public.ai_provider_dataset_mitigations (organization_id, status, due_at);
create index if not exists ai_provider_dataset_evidence_history_idx
  on public.ai_provider_dataset_evidence (organization_id, dataset_id, created_at desc);
create index if not exists ai_provider_data_decisions_history_idx
  on public.ai_provider_data_decisions (organization_id, program_id, created_at desc);

create or replace function public.ai_provider_data_actor_is_member(
  target_organization_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_user_id is null or exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = target_user_id
  );
$$;

revoke all on function public.ai_provider_data_actor_is_member(uuid, uuid) from public;
grant execute on function public.ai_provider_data_actor_is_member(uuid, uuid) to service_role;

create or replace function public.enforce_ai_provider_data_program_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_provider_data_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_provider_data_actor_is_member(new.organization_id, new.reviewer_user_id)
    or not public.ai_provider_data_actor_is_member(new.organization_id, new.approver_user_id)
    or not public.ai_provider_data_actor_is_member(
      new.organization_id,
      new.legal_reviewed_by_user_id
    ) then
    raise exception 'Provider data program actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_provider_dataset_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_provider_data_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_provider_data_actor_is_member(new.organization_id, new.reviewer_user_id) then
    raise exception 'Provider dataset actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_provider_dataset_assessment_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_provider_data_actor_is_member(new.organization_id, new.assessor_user_id)
    or not public.ai_provider_data_actor_is_member(new.organization_id, new.reviewer_user_id) then
    raise exception 'Provider dataset assessment actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_provider_dataset_mitigation_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_provider_data_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_provider_data_actor_is_member(
      new.organization_id,
      new.verified_by_user_id
    ) then
    raise exception 'Provider dataset mitigation actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_provider_dataset_evidence_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_provider_data_actor_is_member(
    new.organization_id,
    new.submitted_by_user_id
  ) then
    raise exception 'Provider dataset evidence submitter must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_provider_data_decision_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_provider_data_actor_is_member(new.organization_id, new.actor_user_id) then
    raise exception 'Provider data decision actor must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_ai_provider_data_append_only_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Provider data governance evidence and decisions are append-only';
end;
$$;

drop trigger if exists ai_provider_data_program_actor_scope
  on public.ai_provider_data_programs;
create trigger ai_provider_data_program_actor_scope
before insert or update on public.ai_provider_data_programs
for each row execute function public.enforce_ai_provider_data_program_actor_scope();

drop trigger if exists ai_provider_dataset_actor_scope
  on public.ai_provider_datasets;
create trigger ai_provider_dataset_actor_scope
before insert or update on public.ai_provider_datasets
for each row execute function public.enforce_ai_provider_dataset_actor_scope();

drop trigger if exists ai_provider_dataset_assessment_actor_scope
  on public.ai_provider_dataset_assessments;
create trigger ai_provider_dataset_assessment_actor_scope
before insert or update on public.ai_provider_dataset_assessments
for each row execute function public.enforce_ai_provider_dataset_assessment_actor_scope();

drop trigger if exists ai_provider_dataset_mitigation_actor_scope
  on public.ai_provider_dataset_mitigations;
create trigger ai_provider_dataset_mitigation_actor_scope
before insert or update on public.ai_provider_dataset_mitigations
for each row execute function public.enforce_ai_provider_dataset_mitigation_actor_scope();

drop trigger if exists ai_provider_dataset_evidence_actor_scope
  on public.ai_provider_dataset_evidence;
create trigger ai_provider_dataset_evidence_actor_scope
before insert on public.ai_provider_dataset_evidence
for each row execute function public.enforce_ai_provider_dataset_evidence_actor_scope();

drop trigger if exists ai_provider_dataset_evidence_immutable
  on public.ai_provider_dataset_evidence;
create trigger ai_provider_dataset_evidence_immutable
before update or delete on public.ai_provider_dataset_evidence
for each row execute function public.prevent_ai_provider_data_append_only_mutation();

drop trigger if exists ai_provider_data_decision_actor_scope
  on public.ai_provider_data_decisions;
create trigger ai_provider_data_decision_actor_scope
before insert on public.ai_provider_data_decisions
for each row execute function public.enforce_ai_provider_data_decision_actor_scope();

drop trigger if exists ai_provider_data_decision_immutable
  on public.ai_provider_data_decisions;
create trigger ai_provider_data_decision_immutable
before update or delete on public.ai_provider_data_decisions
for each row execute function public.prevent_ai_provider_data_append_only_mutation();

alter table public.ai_provider_data_programs enable row level security;
alter table public.ai_provider_data_programs force row level security;
alter table public.ai_provider_datasets enable row level security;
alter table public.ai_provider_datasets force row level security;
alter table public.ai_provider_dataset_assessments enable row level security;
alter table public.ai_provider_dataset_assessments force row level security;
alter table public.ai_provider_dataset_mitigations enable row level security;
alter table public.ai_provider_dataset_mitigations force row level security;
alter table public.ai_provider_dataset_evidence enable row level security;
alter table public.ai_provider_dataset_evidence force row level security;
alter table public.ai_provider_data_decisions enable row level security;
alter table public.ai_provider_data_decisions force row level security;

drop policy if exists ai_provider_data_programs_member_select
  on public.ai_provider_data_programs;
create policy ai_provider_data_programs_member_select
on public.ai_provider_data_programs
for select to authenticated
using (exists (
  select 1
  from public.organization_members member
  where member.organization_id = ai_provider_data_programs.organization_id
    and member.user_id = auth.uid()
));

drop policy if exists ai_provider_datasets_member_select
  on public.ai_provider_datasets;
create policy ai_provider_datasets_member_select
on public.ai_provider_datasets
for select to authenticated
using (exists (
  select 1
  from public.organization_members member
  where member.organization_id = ai_provider_datasets.organization_id
    and member.user_id = auth.uid()
));

drop policy if exists ai_provider_dataset_assessments_member_select
  on public.ai_provider_dataset_assessments;
create policy ai_provider_dataset_assessments_member_select
on public.ai_provider_dataset_assessments
for select to authenticated
using (exists (
  select 1
  from public.organization_members member
  where member.organization_id = ai_provider_dataset_assessments.organization_id
    and member.user_id = auth.uid()
));

drop policy if exists ai_provider_dataset_mitigations_member_select
  on public.ai_provider_dataset_mitigations;
create policy ai_provider_dataset_mitigations_member_select
on public.ai_provider_dataset_mitigations
for select to authenticated
using (exists (
  select 1
  from public.organization_members member
  where member.organization_id = ai_provider_dataset_mitigations.organization_id
    and member.user_id = auth.uid()
));

drop policy if exists ai_provider_dataset_evidence_member_select
  on public.ai_provider_dataset_evidence;
create policy ai_provider_dataset_evidence_member_select
on public.ai_provider_dataset_evidence
for select to authenticated
using (exists (
  select 1
  from public.organization_members member
  where member.organization_id = ai_provider_dataset_evidence.organization_id
    and member.user_id = auth.uid()
));

drop policy if exists ai_provider_data_decisions_member_select
  on public.ai_provider_data_decisions;
create policy ai_provider_data_decisions_member_select
on public.ai_provider_data_decisions
for select to authenticated
using (exists (
  select 1
  from public.organization_members member
  where member.organization_id = ai_provider_data_decisions.organization_id
    and member.user_id = auth.uid()
));

revoke all on public.ai_provider_data_programs from anon, authenticated;
revoke all on public.ai_provider_datasets from anon, authenticated;
revoke all on public.ai_provider_dataset_assessments from anon, authenticated;
revoke all on public.ai_provider_dataset_mitigations from anon, authenticated;
revoke all on public.ai_provider_dataset_evidence from anon, authenticated;
revoke all on public.ai_provider_data_decisions from anon, authenticated;

grant select on public.ai_provider_data_programs to authenticated;
grant select on public.ai_provider_datasets to authenticated;
grant select on public.ai_provider_dataset_assessments to authenticated;
grant select on public.ai_provider_dataset_mitigations to authenticated;
grant select on public.ai_provider_dataset_evidence to authenticated;
grant select on public.ai_provider_data_decisions to authenticated;

grant select, insert, update, delete on public.ai_provider_data_programs to service_role;
grant select, insert, update, delete on public.ai_provider_datasets to service_role;
grant select, insert, update, delete on public.ai_provider_dataset_assessments to service_role;
grant select, insert, update, delete on public.ai_provider_dataset_mitigations to service_role;
grant select, insert on public.ai_provider_dataset_evidence to service_role;
grant select, insert on public.ai_provider_data_decisions to service_role;

commit;
