begin;

create table if not exists public.ai_prohibited_practice_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  system_reference text not null check (char_length(btrim(system_reference)) between 3 and 240),
  review_version integer not null default 1 check (review_version > 0),
  applicability text not null default 'uncertain' check (
    applicability in ('required','not_required','uncertain')
  ),
  status text not null default 'draft' check (
    status in ('draft','applicability_review','evidence_review','legal_review','approval_pending','approved','blocked','not_applicable','retired')
  ),
  owner_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  legal_reviewer_user_id uuid references auth.users(id),
  approver_user_id uuid references auth.users(id),
  positive_signal_count integer not null default 0 check (positive_signal_count between 0 and 8),
  unknown_signal_count integer not null default 8 check (unknown_signal_count between 0 and 8),
  prohibited_signal_count integer not null default 0 check (prohibited_signal_count between 0 and 8),
  unresolved_signal_count integer not null default 8 check (unresolved_signal_count between 0 and 8),
  supported_exception_count integer not null default 0 check (supported_exception_count between 0 and 8),
  open_high_findings integer not null default 0 check (open_high_findings >= 0),
  open_critical_findings integer not null default 0 check (open_critical_findings >= 0),
  review_digest text check (review_digest is null or review_digest ~ '^[a-f0-9]{64}$'),
  last_material_change_at timestamptz,
  reviewed_at timestamptz,
  legal_reviewed_at timestamptz,
  approved_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, system_reference, review_version),
  constraint ai_prohibited_review_actor_separation check (
    (reviewer_user_id is null or reviewer_user_id <> owner_user_id)
    and (legal_reviewer_user_id is null or legal_reviewer_user_id <> owner_user_id)
    and (approver_user_id is null or approver_user_id <> owner_user_id)
    and (approver_user_id is null or reviewer_user_id is null or approver_user_id <> reviewer_user_id)
  ),
  constraint ai_prohibited_review_approval_integrity check (
    status <> 'approved'
    or (
      applicability = 'required'
      and reviewer_user_id is not null
      and approver_user_id is not null
      and unknown_signal_count = 0
      and prohibited_signal_count = 0
      and unresolved_signal_count = 0
      and open_high_findings = 0
      and open_critical_findings = 0
      and review_digest is not null
      and reviewed_at is not null
      and approved_at is not null
      and (last_material_change_at is null or reviewed_at >= last_material_change_at)
    )
  ),
  constraint ai_prohibited_review_non_applicability_integrity check (
    status <> 'not_applicable'
    or (
      applicability = 'not_required'
      and legal_reviewer_user_id is not null
      and legal_reviewed_at is not null
      and approver_user_id is not null
      and approved_at is not null
      and review_digest is not null
    )
  ),
  constraint ai_prohibited_review_retirement_integrity check (
    status <> 'retired' or retired_at is not null
  )
);

create table if not exists public.ai_prohibited_practice_signal_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  signal_code text not null check (
    signal_code in (
      'subliminal_manipulation',
      'vulnerability_exploitation',
      'social_scoring',
      'criminal_risk_prediction',
      'untargeted_facial_scraping',
      'emotion_inference_workplace_education',
      'biometric_categorisation_sensitive_traits',
      'real_time_remote_biometric_public_space'
    )
  ),
  answer text not null default 'unknown' check (answer in ('yes','no','unknown')),
  legal_conclusion text not null default 'uncertain' check (
    legal_conclusion in ('not_prohibited','prohibited','exception_supported','uncertain')
  ),
  status text not null default 'draft' check (
    status in ('draft','evidence_review','legal_review','approved','prohibited','superseded')
  ),
  rationale text not null default '',
  deployment_context text not null default '',
  consequence_analysis text not null default '',
  exception_claimed boolean not null default false,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  owner_user_id uuid references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  legal_reviewer_user_id uuid references auth.users(id),
  content_digest text check (content_digest is null or content_digest ~ '^[a-f0-9]{64}$'),
  last_material_change_at timestamptz,
  reviewed_at timestamptz,
  legal_reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, review_id, id),
  unique (organization_id, review_id, signal_code),
  foreign key (organization_id, review_id)
    references public.ai_prohibited_practice_reviews(organization_id, id)
    on delete cascade,
  constraint ai_prohibited_signal_reviewer_separation check (
    (reviewer_user_id is null or owner_user_id is null or reviewer_user_id <> owner_user_id)
    and (legal_reviewer_user_id is null or owner_user_id is null or legal_reviewer_user_id <> owner_user_id)
  ),
  constraint ai_prohibited_signal_approval_integrity check (
    status <> 'approved'
    or (
      answer <> 'unknown'
      and char_length(btrim(rationale)) >= 10
      and char_length(btrim(deployment_context)) >= 10
      and char_length(btrim(consequence_analysis)) >= 10
      and evidence_count > 0
      and owner_user_id is not null
      and reviewer_user_id is not null
      and content_digest is not null
      and reviewed_at is not null
      and approved_at is not null
      and (last_material_change_at is null or reviewed_at >= last_material_change_at)
      and (
        answer = 'no'
        or (
          answer = 'yes'
          and legal_conclusion in ('not_prohibited','exception_supported')
          and legal_reviewer_user_id is not null
          and legal_reviewed_at is not null
        )
      )
    )
  ),
  constraint ai_prohibited_signal_prohibited_integrity check (
    status <> 'prohibited'
    or (
      answer = 'yes'
      and legal_conclusion = 'prohibited'
      and legal_reviewer_user_id is not null
      and legal_reviewed_at is not null
      and content_digest is not null
    )
  ),
  constraint ai_prohibited_signal_exception_integrity check (
    legal_conclusion <> 'exception_supported' or exception_claimed = true
  )
);

create table if not exists public.ai_prohibited_practice_exception_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  signal_assessment_id uuid not null,
  exception_type text not null check (
    exception_type in ('human_objective_facts_support','medical_or_safety','law_enforcement_authorised_use','biometric_filtering_or_labelling','other_reviewed_basis')
  ),
  status text not null default 'pending' check (
    status in ('pending','supported','rejected','expired','withdrawn')
  ),
  legal_basis text not null default '',
  scope_and_purpose text not null default '',
  safeguards_and_conditions text not null default '',
  authorization_reference text not null default '',
  necessity_and_proportionality text not null default '',
  owner_user_id uuid not null references auth.users(id),
  legal_reviewer_user_id uuid references auth.users(id),
  approver_user_id uuid references auth.users(id),
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  valid_from timestamptz,
  valid_until timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, review_id, signal_assessment_id, id),
  foreign key (organization_id, review_id, signal_assessment_id)
    references public.ai_prohibited_practice_signal_assessments(organization_id, review_id, id)
    on delete restrict,
  constraint ai_prohibited_exception_actor_separation check (
    (legal_reviewer_user_id is null or legal_reviewer_user_id <> owner_user_id)
    and (approver_user_id is null or approver_user_id <> owner_user_id)
  ),
  constraint ai_prohibited_exception_supported_integrity check (
    status <> 'supported'
    or (
      char_length(btrim(legal_basis)) >= 10
      and char_length(btrim(scope_and_purpose)) >= 10
      and char_length(btrim(safeguards_and_conditions)) >= 10
      and char_length(btrim(authorization_reference)) >= 3
      and char_length(btrim(necessity_and_proportionality)) >= 10
      and legal_reviewer_user_id is not null
      and approver_user_id is not null
      and evidence_digest is not null
      and reviewed_at is not null
      and approved_at is not null
      and valid_from is not null
      and (valid_until is null or valid_until > valid_from)
    )
  )
);

create table if not exists public.ai_prohibited_practice_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  signal_assessment_id uuid not null,
  exception_claim_id uuid,
  evidence_type text not null check (
    evidence_type in ('intended_purpose','context_record','capability_inventory','data_source_inventory','harm_analysis','rights_assessment','legal_analysis','authorization','necessity_proportionality','audit_record','external_report','other')
  ),
  evidence_reference text not null check (char_length(btrim(evidence_reference)) between 3 and 1000),
  source_version text not null check (char_length(btrim(source_version)) between 1 and 160),
  evidence_digest text not null check (evidence_digest ~ '^[a-f0-9]{64}$'),
  submitted_by_user_id uuid references auth.users(id),
  reviewed_by_user_id uuid references auth.users(id),
  collected_at timestamptz not null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, review_id, signal_assessment_id, evidence_digest),
  foreign key (organization_id, review_id, signal_assessment_id)
    references public.ai_prohibited_practice_signal_assessments(organization_id, review_id, id)
    on delete restrict,
  foreign key (organization_id, review_id, signal_assessment_id, exception_claim_id)
    references public.ai_prohibited_practice_exception_claims(organization_id, review_id, signal_assessment_id, id)
    on delete restrict,
  constraint ai_prohibited_evidence_reviewer_separation check (
    reviewed_by_user_id is null
    or submitted_by_user_id is null
    or reviewed_by_user_id <> submitted_by_user_id
  ),
  constraint ai_prohibited_evidence_review_integrity check (
    reviewed_by_user_id is null or reviewed_at is not null
  )
);

create table if not exists public.ai_prohibited_practice_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null,
  signal_assessment_id uuid,
  decision_type text not null check (
    decision_type in ('applicability','signal_clearance','prohibited','exception_supported','exception_rejected','review_approved','review_blocked','not_applicable','retired')
  ),
  outcome text not null check (
    outcome in ('approved','rejected','blocked','needs_work','not_applicable','retired')
  ),
  rationale text not null check (char_length(btrim(rationale)) between 10 and 4000),
  actor_user_id uuid references auth.users(id),
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (organization_id, review_id)
    references public.ai_prohibited_practice_reviews(organization_id, id)
    on delete restrict,
  foreign key (organization_id, review_id, signal_assessment_id)
    references public.ai_prohibited_practice_signal_assessments(organization_id, review_id, id)
    on delete restrict
);

create index if not exists ai_prohibited_reviews_queue_idx
  on public.ai_prohibited_practice_reviews (organization_id, status, updated_at desc);
create index if not exists ai_prohibited_signals_review_idx
  on public.ai_prohibited_practice_signal_assessments (organization_id, review_id, status, signal_code);
create index if not exists ai_prohibited_exceptions_queue_idx
  on public.ai_prohibited_practice_exception_claims (organization_id, status, valid_until);
create index if not exists ai_prohibited_evidence_signal_idx
  on public.ai_prohibited_practice_evidence (organization_id, review_id, signal_assessment_id, created_at desc);
create index if not exists ai_prohibited_decisions_history_idx
  on public.ai_prohibited_practice_decisions (organization_id, review_id, created_at desc);

create or replace function public.ai_prohibited_actor_is_member(
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

revoke all on function public.ai_prohibited_actor_is_member(uuid, uuid) from public;
grant execute on function public.ai_prohibited_actor_is_member(uuid, uuid) to service_role;

create or replace function public.enforce_ai_prohibited_review_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_prohibited_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_prohibited_actor_is_member(new.organization_id, new.reviewer_user_id)
    or not public.ai_prohibited_actor_is_member(new.organization_id, new.legal_reviewer_user_id)
    or not public.ai_prohibited_actor_is_member(new.organization_id, new.approver_user_id) then
    raise exception 'Prohibited-practice review actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_prohibited_signal_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_prohibited_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_prohibited_actor_is_member(new.organization_id, new.reviewer_user_id)
    or not public.ai_prohibited_actor_is_member(new.organization_id, new.legal_reviewer_user_id) then
    raise exception 'Prohibited-practice signal actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_prohibited_exception_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_prohibited_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_prohibited_actor_is_member(new.organization_id, new.legal_reviewer_user_id)
    or not public.ai_prohibited_actor_is_member(new.organization_id, new.approver_user_id) then
    raise exception 'Prohibited-practice exception actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_prohibited_evidence_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_prohibited_actor_is_member(new.organization_id, new.submitted_by_user_id)
    or not public.ai_prohibited_actor_is_member(new.organization_id, new.reviewed_by_user_id) then
    raise exception 'Prohibited-practice evidence actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_prohibited_decision_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_prohibited_actor_is_member(new.organization_id, new.actor_user_id) then
    raise exception 'Prohibited-practice decision actor must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_ai_prohibited_immutable_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Prohibited-practice evidence and decisions are append-only';
end;
$$;

drop trigger if exists ai_prohibited_review_actor_scope on public.ai_prohibited_practice_reviews;
create trigger ai_prohibited_review_actor_scope
before insert or update on public.ai_prohibited_practice_reviews
for each row execute function public.enforce_ai_prohibited_review_actor_scope();

drop trigger if exists ai_prohibited_signal_actor_scope on public.ai_prohibited_practice_signal_assessments;
create trigger ai_prohibited_signal_actor_scope
before insert or update on public.ai_prohibited_practice_signal_assessments
for each row execute function public.enforce_ai_prohibited_signal_actor_scope();

drop trigger if exists ai_prohibited_exception_actor_scope on public.ai_prohibited_practice_exception_claims;
create trigger ai_prohibited_exception_actor_scope
before insert or update on public.ai_prohibited_practice_exception_claims
for each row execute function public.enforce_ai_prohibited_exception_actor_scope();

drop trigger if exists ai_prohibited_evidence_actor_scope on public.ai_prohibited_practice_evidence;
create trigger ai_prohibited_evidence_actor_scope
before insert on public.ai_prohibited_practice_evidence
for each row execute function public.enforce_ai_prohibited_evidence_actor_scope();

drop trigger if exists ai_prohibited_decision_actor_scope on public.ai_prohibited_practice_decisions;
create trigger ai_prohibited_decision_actor_scope
before insert on public.ai_prohibited_practice_decisions
for each row execute function public.enforce_ai_prohibited_decision_actor_scope();

drop trigger if exists ai_prohibited_evidence_immutable on public.ai_prohibited_practice_evidence;
create trigger ai_prohibited_evidence_immutable
before update or delete on public.ai_prohibited_practice_evidence
for each row execute function public.prevent_ai_prohibited_immutable_mutation();

drop trigger if exists ai_prohibited_decision_immutable on public.ai_prohibited_practice_decisions;
create trigger ai_prohibited_decision_immutable
before update or delete on public.ai_prohibited_practice_decisions
for each row execute function public.prevent_ai_prohibited_immutable_mutation();

alter table public.ai_prohibited_practice_reviews enable row level security;
alter table public.ai_prohibited_practice_reviews force row level security;
alter table public.ai_prohibited_practice_signal_assessments enable row level security;
alter table public.ai_prohibited_practice_signal_assessments force row level security;
alter table public.ai_prohibited_practice_exception_claims enable row level security;
alter table public.ai_prohibited_practice_exception_claims force row level security;
alter table public.ai_prohibited_practice_evidence enable row level security;
alter table public.ai_prohibited_practice_evidence force row level security;
alter table public.ai_prohibited_practice_decisions enable row level security;
alter table public.ai_prohibited_practice_decisions force row level security;

create policy ai_prohibited_reviews_member_select on public.ai_prohibited_practice_reviews
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_prohibited_practice_reviews.organization_id
    and member.user_id = auth.uid()
));

create policy ai_prohibited_signals_member_select on public.ai_prohibited_practice_signal_assessments
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_prohibited_practice_signal_assessments.organization_id
    and member.user_id = auth.uid()
));

create policy ai_prohibited_exceptions_member_select on public.ai_prohibited_practice_exception_claims
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_prohibited_practice_exception_claims.organization_id
    and member.user_id = auth.uid()
));

create policy ai_prohibited_evidence_member_select on public.ai_prohibited_practice_evidence
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_prohibited_practice_evidence.organization_id
    and member.user_id = auth.uid()
));

create policy ai_prohibited_decisions_member_select on public.ai_prohibited_practice_decisions
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_prohibited_practice_decisions.organization_id
    and member.user_id = auth.uid()
));

revoke all on public.ai_prohibited_practice_reviews from anon, authenticated;
revoke all on public.ai_prohibited_practice_signal_assessments from anon, authenticated;
revoke all on public.ai_prohibited_practice_exception_claims from anon, authenticated;
revoke all on public.ai_prohibited_practice_evidence from anon, authenticated;
revoke all on public.ai_prohibited_practice_decisions from anon, authenticated;

grant select on public.ai_prohibited_practice_reviews to authenticated;
grant select on public.ai_prohibited_practice_signal_assessments to authenticated;
grant select on public.ai_prohibited_practice_exception_claims to authenticated;
grant select on public.ai_prohibited_practice_evidence to authenticated;
grant select on public.ai_prohibited_practice_decisions to authenticated;

grant select, insert, update, delete on public.ai_prohibited_practice_reviews to service_role;
grant select, insert, update, delete on public.ai_prohibited_practice_signal_assessments to service_role;
grant select, insert, update, delete on public.ai_prohibited_practice_exception_claims to service_role;
grant select, insert on public.ai_prohibited_practice_evidence to service_role;
grant select, insert on public.ai_prohibited_practice_decisions to service_role;

commit;
