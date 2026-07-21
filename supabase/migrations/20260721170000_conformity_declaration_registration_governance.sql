begin;

create table if not exists public.ai_conformity_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_system_id uuid not null,
  version integer not null default 1 check (version > 0),
  title text not null check (char_length(btrim(title)) between 3 and 240),
  applicability text not null default 'uncertain' check (
    applicability in ('required','not_required','uncertain')
  ),
  provider_role text not null default 'uncertain' check (
    provider_role in ('provider','product_manufacturer','authorised_representative','importer','deployer','uncertain')
  ),
  conformity_route text not null default 'uncertain' check (
    conformity_route in ('internal_control','notified_body','product_safety_legislation','uncertain')
  ),
  route_rationale text not null default '',
  status text not null default 'draft' check (
    status in ('draft','applicability_review','evidence_collection','assessment','external_review','declaration_ready','registration_ready','market_release_review','approved','blocked','retired')
  ),
  owner_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  approver_user_id uuid references auth.users(id),
  legal_reviewer_user_id uuid references auth.users(id),
  notified_body_required boolean not null default false,
  notified_body_certificate_valid boolean not null default false,
  declaration_signed boolean not null default false,
  ce_marking_control_complete boolean not null default false,
  eu_registration_required boolean not null default true,
  eu_registration_complete boolean not null default false,
  substantial_modification_reviewed boolean not null default false,
  open_severe_nonconformities integer not null default 0 check (open_severe_nonconformities >= 0),
  expired_certificates integer not null default 0 check (expired_certificates >= 0),
  approved_at timestamptz,
  retired_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, ai_system_id, version),
  constraint ai_conformity_assessment_actor_separation check (
    (reviewer_user_id is null or reviewer_user_id <> owner_user_id)
    and (approver_user_id is null or approver_user_id <> owner_user_id)
    and (approver_user_id is null or reviewer_user_id is null or approver_user_id <> reviewer_user_id)
    and (legal_reviewer_user_id is null or legal_reviewer_user_id <> owner_user_id)
  ),
  constraint ai_conformity_assessment_approval_integrity check (
    status <> 'approved'
    or (
      applicability <> 'uncertain'
      and provider_role <> 'uncertain'
      and conformity_route <> 'uncertain'
      and reviewer_user_id is not null
      and approver_user_id is not null
      and declaration_signed
      and ce_marking_control_complete
      and substantial_modification_reviewed
      and open_severe_nonconformities = 0
      and expired_certificates = 0
      and (not notified_body_required or notified_body_certificate_valid)
      and (not eu_registration_required or eu_registration_complete)
      and approved_at is not null
    )
  ),
  constraint ai_conformity_assessment_retirement_integrity check (
    status <> 'retired' or retired_at is not null
  )
);

create table if not exists public.ai_conformity_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null,
  control_code text not null check (control_code ~ '^CONF-[0-9]{2,3}$'),
  category text not null check (
    category in ('applicability','qms','risk','data','technical_documentation','logging','transparency','human_oversight','accuracy_robustness_cybersecurity','post_market','incidents','standards','notified_body','declaration','ce_marking','registration','modification','approval')
  ),
  status text not null default 'missing' check (
    status in ('missing','draft','submitted','reviewed','accepted','rejected','expired','not_applicable')
  ),
  owner_user_id uuid references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  evidence_reference text,
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz,
  expires_at timestamptz,
  reviewed_at timestamptz,
  rationale text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, assessment_id, control_code),
  foreign key (organization_id, assessment_id)
    references public.ai_conformity_assessments(organization_id, id)
    on delete cascade,
  constraint ai_conformity_evidence_actor_separation check (
    reviewer_user_id is null or owner_user_id is null or reviewer_user_id <> owner_user_id
  ),
  constraint ai_conformity_evidence_acceptance_integrity check (
    status <> 'accepted'
    or (
      evidence_digest is not null
      and reviewer_user_id is not null
      and reviewed_at is not null
    )
  )
);

create table if not exists public.ai_eu_declarations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (
    status in ('draft','review','signed','superseded','withdrawn')
  ),
  provider_legal_name text not null default '',
  provider_address text not null default '',
  ai_system_name text not null default '',
  ai_system_identifier text not null default '',
  declaration_statement text not null default '',
  legislation_references text[] not null default '{}',
  standards_references text[] not null default '{}',
  notified_body_reference text,
  signed_by_user_id uuid references auth.users(id),
  signed_at timestamptz,
  declaration_digest text check (declaration_digest is null or declaration_digest ~ '^[a-f0-9]{64}$'),
  superseded_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, assessment_id, version),
  foreign key (organization_id, assessment_id)
    references public.ai_conformity_assessments(organization_id, id)
    on delete cascade,
  constraint ai_eu_declaration_signature_integrity check (
    status <> 'signed'
    or (
      char_length(btrim(provider_legal_name)) >= 2
      and char_length(btrim(provider_address)) >= 5
      and char_length(btrim(ai_system_name)) >= 2
      and char_length(btrim(ai_system_identifier)) >= 2
      and char_length(btrim(declaration_statement)) >= 20
      and cardinality(legislation_references) > 0
      and signed_by_user_id is not null
      and signed_at is not null
      and declaration_digest is not null
    )
  ),
  constraint ai_eu_declaration_superseded_integrity check (
    status <> 'superseded' or superseded_at is not null
  ),
  constraint ai_eu_declaration_withdrawn_integrity check (
    status <> 'withdrawn' or withdrawn_at is not null
  )
);

create table if not exists public.ai_eu_registrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null,
  status text not null default 'preparing' check (
    status in ('not_required','preparing','ready','submitted','registered','rejected','withdrawn')
  ),
  database_scope text not null default 'eu_high_risk_database' check (
    database_scope in ('eu_high_risk_database','national_database','sector_registry','other')
  ),
  dataset_complete boolean not null default false,
  dataset_digest text check (dataset_digest is null or dataset_digest ~ '^[a-f0-9]{64}$'),
  submitted_by_user_id uuid references auth.users(id),
  submitted_at timestamptz,
  registration_identifier text,
  registered_at timestamptz,
  rejection_reason text,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, assessment_id, database_scope),
  foreign key (organization_id, assessment_id)
    references public.ai_conformity_assessments(organization_id, id)
    on delete cascade,
  constraint ai_eu_registration_submission_integrity check (
    status not in ('submitted','registered')
    or (
      dataset_complete
      and dataset_digest is not null
      and submitted_by_user_id is not null
      and submitted_at is not null
    )
  ),
  constraint ai_eu_registration_registered_integrity check (
    status <> 'registered'
    or (
      registration_identifier is not null
      and char_length(btrim(registration_identifier)) >= 3
      and registered_at is not null
    )
  ),
  constraint ai_eu_registration_rejection_integrity check (
    status <> 'rejected' or char_length(btrim(coalesce(rejection_reason, ''))) >= 10
  ),
  constraint ai_eu_registration_withdrawn_integrity check (
    status <> 'withdrawn' or withdrawn_at is not null
  )
);

create table if not exists public.ai_conformity_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null,
  decision_type text not null check (
    decision_type in ('applicability','route_selection','evidence_acceptance','notified_body_review','declaration_approval','ce_marking_review','registration_review','market_release','blocked','retired')
  ),
  outcome text not null check (
    outcome in ('approved','rejected','needs_work','blocked','not_applicable','retired')
  ),
  rationale text not null check (char_length(btrim(rationale)) between 10 and 4000),
  actor_user_id uuid references auth.users(id),
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (organization_id, assessment_id)
    references public.ai_conformity_assessments(organization_id, id)
    on delete cascade
);

create index if not exists ai_conformity_assessments_org_status_idx
  on public.ai_conformity_assessments (organization_id, status, next_review_at);
create index if not exists ai_conformity_evidence_queue_idx
  on public.ai_conformity_evidence (organization_id, status, expires_at);
create index if not exists ai_eu_declarations_status_idx
  on public.ai_eu_declarations (organization_id, status, signed_at);
create index if not exists ai_eu_registrations_status_idx
  on public.ai_eu_registrations (organization_id, status, submitted_at);
create index if not exists ai_conformity_decisions_history_idx
  on public.ai_conformity_decisions (organization_id, assessment_id, created_at desc);

create or replace function public.ai_conformity_actor_is_member(
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

revoke all on function public.ai_conformity_actor_is_member(uuid, uuid) from public;
grant execute on function public.ai_conformity_actor_is_member(uuid, uuid) to service_role;

create or replace function public.enforce_ai_conformity_assessment_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_conformity_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_conformity_actor_is_member(new.organization_id, new.reviewer_user_id)
    or not public.ai_conformity_actor_is_member(new.organization_id, new.approver_user_id)
    or not public.ai_conformity_actor_is_member(new.organization_id, new.legal_reviewer_user_id) then
    raise exception 'Conformity assessment actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_conformity_evidence_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_conformity_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_conformity_actor_is_member(new.organization_id, new.reviewer_user_id) then
    raise exception 'Conformity evidence actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_eu_declaration_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_conformity_actor_is_member(new.organization_id, new.signed_by_user_id) then
    raise exception 'EU declaration signer must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_eu_registration_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_conformity_actor_is_member(new.organization_id, new.submitted_by_user_id) then
    raise exception 'EU registration submitter must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_conformity_decision_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_conformity_actor_is_member(new.organization_id, new.actor_user_id) then
    raise exception 'Conformity decision actor must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_ai_conformity_decision_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Conformity decisions are append-only';
end;
$$;

drop trigger if exists ai_conformity_assessment_actor_scope on public.ai_conformity_assessments;
create trigger ai_conformity_assessment_actor_scope
before insert or update on public.ai_conformity_assessments
for each row execute function public.enforce_ai_conformity_assessment_actor_scope();

drop trigger if exists ai_conformity_evidence_actor_scope on public.ai_conformity_evidence;
create trigger ai_conformity_evidence_actor_scope
before insert or update on public.ai_conformity_evidence
for each row execute function public.enforce_ai_conformity_evidence_actor_scope();

drop trigger if exists ai_eu_declaration_actor_scope on public.ai_eu_declarations;
create trigger ai_eu_declaration_actor_scope
before insert or update on public.ai_eu_declarations
for each row execute function public.enforce_ai_eu_declaration_actor_scope();

drop trigger if exists ai_eu_registration_actor_scope on public.ai_eu_registrations;
create trigger ai_eu_registration_actor_scope
before insert or update on public.ai_eu_registrations
for each row execute function public.enforce_ai_eu_registration_actor_scope();

drop trigger if exists ai_conformity_decision_actor_scope on public.ai_conformity_decisions;
create trigger ai_conformity_decision_actor_scope
before insert on public.ai_conformity_decisions
for each row execute function public.enforce_ai_conformity_decision_actor_scope();

drop trigger if exists ai_conformity_decision_immutable on public.ai_conformity_decisions;
create trigger ai_conformity_decision_immutable
before update or delete on public.ai_conformity_decisions
for each row execute function public.prevent_ai_conformity_decision_mutation();

alter table public.ai_conformity_assessments enable row level security;
alter table public.ai_conformity_assessments force row level security;
alter table public.ai_conformity_evidence enable row level security;
alter table public.ai_conformity_evidence force row level security;
alter table public.ai_eu_declarations enable row level security;
alter table public.ai_eu_declarations force row level security;
alter table public.ai_eu_registrations enable row level security;
alter table public.ai_eu_registrations force row level security;
alter table public.ai_conformity_decisions enable row level security;
alter table public.ai_conformity_decisions force row level security;

create policy ai_conformity_assessments_member_select on public.ai_conformity_assessments
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_conformity_assessments.organization_id
    and member.user_id = auth.uid()
));

create policy ai_conformity_evidence_member_select on public.ai_conformity_evidence
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_conformity_evidence.organization_id
    and member.user_id = auth.uid()
));

create policy ai_eu_declarations_member_select on public.ai_eu_declarations
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_eu_declarations.organization_id
    and member.user_id = auth.uid()
));

create policy ai_eu_registrations_member_select on public.ai_eu_registrations
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_eu_registrations.organization_id
    and member.user_id = auth.uid()
));

create policy ai_conformity_decisions_member_select on public.ai_conformity_decisions
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_conformity_decisions.organization_id
    and member.user_id = auth.uid()
));

revoke all on public.ai_conformity_assessments from anon, authenticated;
revoke all on public.ai_conformity_evidence from anon, authenticated;
revoke all on public.ai_eu_declarations from anon, authenticated;
revoke all on public.ai_eu_registrations from anon, authenticated;
revoke all on public.ai_conformity_decisions from anon, authenticated;

grant select on public.ai_conformity_assessments to authenticated;
grant select on public.ai_conformity_evidence to authenticated;
grant select on public.ai_eu_declarations to authenticated;
grant select on public.ai_eu_registrations to authenticated;
grant select on public.ai_conformity_decisions to authenticated;

grant select, insert, update, delete on public.ai_conformity_assessments to service_role;
grant select, insert, update, delete on public.ai_conformity_evidence to service_role;
grant select, insert, update, delete on public.ai_eu_declarations to service_role;
grant select, insert, update, delete on public.ai_eu_registrations to service_role;
grant select, insert on public.ai_conformity_decisions to service_role;

commit;
