begin;

create table if not exists public.ai_annex_iv_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  system_reference text not null check (char_length(btrim(system_reference)) between 3 and 240),
  system_version text not null check (char_length(btrim(system_version)) between 1 and 120),
  documentation_version integer not null default 1 check (documentation_version > 0),
  applicability text not null default 'uncertain' check (
    applicability in ('required','not_required','uncertain')
  ),
  status text not null default 'draft' check (
    status in ('draft','applicability_review','authoring','review','approval','approved','blocked','not_applicable','retired')
  ),
  owner_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  approver_user_id uuid references auth.users(id),
  legal_reviewed_by_user_id uuid references auth.users(id),
  approved_sections_count integer not null default 0 check (
    approved_sections_count between 0 and 12
  ),
  total_sections_count integer not null default 12 check (total_sections_count = 12),
  open_high_findings integer not null default 0 check (open_high_findings >= 0),
  open_critical_findings integer not null default 0 check (open_critical_findings >= 0),
  package_digest text check (package_digest is null or package_digest ~ '^[a-f0-9]{64}$'),
  last_material_change_at timestamptz,
  reviewed_at timestamptz,
  legal_reviewed_at timestamptz,
  approved_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, system_reference, documentation_version),
  constraint ai_annex_iv_package_actor_separation check (
    (reviewer_user_id is null or reviewer_user_id <> owner_user_id)
    and (approver_user_id is null or approver_user_id <> owner_user_id)
    and (approver_user_id is null or reviewer_user_id is null or approver_user_id <> reviewer_user_id)
  ),
  constraint ai_annex_iv_package_approval_integrity check (
    status <> 'approved'
    or (
      applicability = 'required'
      and reviewer_user_id is not null
      and approver_user_id is not null
      and approved_sections_count = 12
      and total_sections_count = 12
      and open_high_findings = 0
      and open_critical_findings = 0
      and package_digest is not null
      and reviewed_at is not null
      and approved_at is not null
      and (last_material_change_at is null or reviewed_at >= last_material_change_at)
    )
  ),
  constraint ai_annex_iv_package_non_applicability_integrity check (
    status <> 'not_applicable'
    or (
      applicability = 'not_required'
      and legal_reviewed_by_user_id is not null
      and legal_reviewed_at is not null
    )
  ),
  constraint ai_annex_iv_package_retirement_integrity check (
    status <> 'retired' or retired_at is not null
  )
);

create table if not exists public.ai_annex_iv_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  package_id uuid not null,
  section_code text not null check (
    section_code in (
      'general_description',
      'system_elements_and_development',
      'monitoring_functioning_and_control',
      'risk_management',
      'data_governance',
      'performance_metrics',
      'human_oversight',
      'cybersecurity',
      'lifecycle_changes',
      'standards_and_specifications',
      'eu_declaration_and_conformity',
      'post_market_monitoring'
    )
  ),
  status text not null default 'not_started' check (
    status in ('not_started','draft','in_review','approved','needs_update','not_applicable')
  ),
  summary text not null default '',
  source_version text not null default '',
  owner_user_id uuid references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  content_digest text check (content_digest is null or content_digest ~ '^[a-f0-9]{64}$'),
  last_material_change_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, package_id, section_code),
  foreign key (organization_id, package_id)
    references public.ai_annex_iv_packages(organization_id, id)
    on delete cascade,
  constraint ai_annex_iv_section_reviewer_separation check (
    reviewer_user_id is null or owner_user_id is null or reviewer_user_id <> owner_user_id
  ),
  constraint ai_annex_iv_section_approval_integrity check (
    status <> 'approved'
    or (
      char_length(btrim(summary)) >= 10
      and char_length(btrim(source_version)) >= 1
      and owner_user_id is not null
      and reviewer_user_id is not null
      and evidence_count > 0
      and content_digest is not null
      and reviewed_at is not null
      and approved_at is not null
      and (last_material_change_at is null or reviewed_at >= last_material_change_at)
    )
  )
);

create table if not exists public.ai_annex_iv_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  package_id uuid not null,
  section_id uuid not null,
  evidence_type text not null check (
    evidence_type in ('document','dataset','test_report','model_card','system_card','risk_record','log_sample','approval','external_report','other')
  ),
  evidence_reference text not null check (char_length(btrim(evidence_reference)) between 3 and 1000),
  evidence_digest text not null check (evidence_digest ~ '^[a-f0-9]{64}$'),
  source_version text not null check (char_length(btrim(source_version)) between 1 and 160),
  submitted_by_user_id uuid references auth.users(id),
  reviewed_by_user_id uuid references auth.users(id),
  collected_at timestamptz not null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, section_id, evidence_digest),
  foreign key (organization_id, package_id)
    references public.ai_annex_iv_packages(organization_id, id)
    on delete cascade,
  foreign key (organization_id, section_id)
    references public.ai_annex_iv_sections(organization_id, id)
    on delete cascade,
  constraint ai_annex_iv_evidence_reviewer_separation check (
    reviewed_by_user_id is null
    or submitted_by_user_id is null
    or reviewed_by_user_id <> submitted_by_user_id
  ),
  constraint ai_annex_iv_evidence_review_integrity check (
    reviewed_by_user_id is null or reviewed_at is not null
  )
);

create table if not exists public.ai_annex_iv_changes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  package_id uuid not null,
  change_type text not null check (
    change_type in ('editorial','minor','material','substantial','provider_change','model_change','data_change','control_change')
  ),
  description text not null check (char_length(btrim(description)) between 10 and 4000),
  impact_assessment text not null check (char_length(btrim(impact_assessment)) between 10 and 4000),
  requires_reassessment boolean not null default false,
  assessed_by_user_id uuid not null references auth.users(id),
  reviewed_by_user_id uuid references auth.users(id),
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  reviewed_at timestamptz,
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, package_id)
    references public.ai_annex_iv_packages(organization_id, id)
    on delete cascade,
  constraint ai_annex_iv_change_reviewer_separation check (
    reviewed_by_user_id is null or reviewed_by_user_id <> assessed_by_user_id
  ),
  constraint ai_annex_iv_change_review_integrity check (
    change_type not in ('material','substantial')
    or (
      reviewed_by_user_id is not null
      and reviewed_at is not null
      and evidence_digest is not null
    )
  )
);

create table if not exists public.ai_annex_iv_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  package_id uuid not null,
  decision_type text not null check (
    decision_type in ('applicability','section_approval','package_review','package_approval','package_blocked','change_reassessment','not_applicable','retired')
  ),
  outcome text not null check (
    outcome in ('approved','rejected','needs_work','blocked','not_applicable','retired')
  ),
  rationale text not null check (char_length(btrim(rationale)) between 10 and 4000),
  actor_user_id uuid references auth.users(id),
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (organization_id, package_id)
    references public.ai_annex_iv_packages(organization_id, id)
    on delete cascade
);

create index if not exists ai_annex_iv_packages_queue_idx
  on public.ai_annex_iv_packages (organization_id, status, updated_at desc);
create index if not exists ai_annex_iv_sections_review_idx
  on public.ai_annex_iv_sections (organization_id, package_id, status, reviewed_at);
create index if not exists ai_annex_iv_evidence_section_idx
  on public.ai_annex_iv_evidence (organization_id, section_id, created_at desc);
create index if not exists ai_annex_iv_changes_package_idx
  on public.ai_annex_iv_changes (organization_id, package_id, created_at desc);
create index if not exists ai_annex_iv_decisions_history_idx
  on public.ai_annex_iv_decisions (organization_id, package_id, created_at desc);

create or replace function public.ai_annex_iv_actor_is_member(
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

revoke all on function public.ai_annex_iv_actor_is_member(uuid, uuid) from public;
grant execute on function public.ai_annex_iv_actor_is_member(uuid, uuid) to service_role;

create or replace function public.enforce_ai_annex_iv_package_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_annex_iv_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_annex_iv_actor_is_member(new.organization_id, new.reviewer_user_id)
    or not public.ai_annex_iv_actor_is_member(new.organization_id, new.approver_user_id)
    or not public.ai_annex_iv_actor_is_member(new.organization_id, new.legal_reviewed_by_user_id) then
    raise exception 'Annex IV package actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_annex_iv_section_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_annex_iv_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_annex_iv_actor_is_member(new.organization_id, new.reviewer_user_id) then
    raise exception 'Annex IV section actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_annex_iv_evidence_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_annex_iv_actor_is_member(new.organization_id, new.submitted_by_user_id)
    or not public.ai_annex_iv_actor_is_member(new.organization_id, new.reviewed_by_user_id) then
    raise exception 'Annex IV evidence actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_annex_iv_change_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_annex_iv_actor_is_member(new.organization_id, new.assessed_by_user_id)
    or not public.ai_annex_iv_actor_is_member(new.organization_id, new.reviewed_by_user_id) then
    raise exception 'Annex IV change actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_annex_iv_decision_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_annex_iv_actor_is_member(new.organization_id, new.actor_user_id) then
    raise exception 'Annex IV decision actor must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_ai_annex_iv_history_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Annex IV evidence, changes and decisions are append-only';
end;
$$;

drop trigger if exists ai_annex_iv_package_actor_scope on public.ai_annex_iv_packages;
create trigger ai_annex_iv_package_actor_scope
before insert or update on public.ai_annex_iv_packages
for each row execute function public.enforce_ai_annex_iv_package_actor_scope();

drop trigger if exists ai_annex_iv_section_actor_scope on public.ai_annex_iv_sections;
create trigger ai_annex_iv_section_actor_scope
before insert or update on public.ai_annex_iv_sections
for each row execute function public.enforce_ai_annex_iv_section_actor_scope();

drop trigger if exists ai_annex_iv_evidence_actor_scope on public.ai_annex_iv_evidence;
create trigger ai_annex_iv_evidence_actor_scope
before insert on public.ai_annex_iv_evidence
for each row execute function public.enforce_ai_annex_iv_evidence_actor_scope();

drop trigger if exists ai_annex_iv_change_actor_scope on public.ai_annex_iv_changes;
create trigger ai_annex_iv_change_actor_scope
before insert on public.ai_annex_iv_changes
for each row execute function public.enforce_ai_annex_iv_change_actor_scope();

drop trigger if exists ai_annex_iv_decision_actor_scope on public.ai_annex_iv_decisions;
create trigger ai_annex_iv_decision_actor_scope
before insert on public.ai_annex_iv_decisions
for each row execute function public.enforce_ai_annex_iv_decision_actor_scope();

drop trigger if exists ai_annex_iv_evidence_immutable on public.ai_annex_iv_evidence;
create trigger ai_annex_iv_evidence_immutable
before update or delete on public.ai_annex_iv_evidence
for each row execute function public.prevent_ai_annex_iv_history_mutation();

drop trigger if exists ai_annex_iv_changes_immutable on public.ai_annex_iv_changes;
create trigger ai_annex_iv_changes_immutable
before update or delete on public.ai_annex_iv_changes
for each row execute function public.prevent_ai_annex_iv_history_mutation();

drop trigger if exists ai_annex_iv_decisions_immutable on public.ai_annex_iv_decisions;
create trigger ai_annex_iv_decisions_immutable
before update or delete on public.ai_annex_iv_decisions
for each row execute function public.prevent_ai_annex_iv_history_mutation();

alter table public.ai_annex_iv_packages enable row level security;
alter table public.ai_annex_iv_packages force row level security;
alter table public.ai_annex_iv_sections enable row level security;
alter table public.ai_annex_iv_sections force row level security;
alter table public.ai_annex_iv_evidence enable row level security;
alter table public.ai_annex_iv_evidence force row level security;
alter table public.ai_annex_iv_changes enable row level security;
alter table public.ai_annex_iv_changes force row level security;
alter table public.ai_annex_iv_decisions enable row level security;
alter table public.ai_annex_iv_decisions force row level security;

drop policy if exists ai_annex_iv_packages_member_select on public.ai_annex_iv_packages;
create policy ai_annex_iv_packages_member_select on public.ai_annex_iv_packages
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_annex_iv_packages.organization_id
    and member.user_id = auth.uid()
));

drop policy if exists ai_annex_iv_sections_member_select on public.ai_annex_iv_sections;
create policy ai_annex_iv_sections_member_select on public.ai_annex_iv_sections
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_annex_iv_sections.organization_id
    and member.user_id = auth.uid()
));

drop policy if exists ai_annex_iv_evidence_member_select on public.ai_annex_iv_evidence;
create policy ai_annex_iv_evidence_member_select on public.ai_annex_iv_evidence
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_annex_iv_evidence.organization_id
    and member.user_id = auth.uid()
));

drop policy if exists ai_annex_iv_changes_member_select on public.ai_annex_iv_changes;
create policy ai_annex_iv_changes_member_select on public.ai_annex_iv_changes
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_annex_iv_changes.organization_id
    and member.user_id = auth.uid()
));

drop policy if exists ai_annex_iv_decisions_member_select on public.ai_annex_iv_decisions;
create policy ai_annex_iv_decisions_member_select on public.ai_annex_iv_decisions
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_annex_iv_decisions.organization_id
    and member.user_id = auth.uid()
));

revoke all on public.ai_annex_iv_packages from anon, authenticated;
revoke all on public.ai_annex_iv_sections from anon, authenticated;
revoke all on public.ai_annex_iv_evidence from anon, authenticated;
revoke all on public.ai_annex_iv_changes from anon, authenticated;
revoke all on public.ai_annex_iv_decisions from anon, authenticated;

grant select on public.ai_annex_iv_packages to authenticated;
grant select on public.ai_annex_iv_sections to authenticated;
grant select on public.ai_annex_iv_evidence to authenticated;
grant select on public.ai_annex_iv_changes to authenticated;
grant select on public.ai_annex_iv_decisions to authenticated;

grant select, insert, update, delete on public.ai_annex_iv_packages to service_role;
grant select, insert, update, delete on public.ai_annex_iv_sections to service_role;
grant select, insert on public.ai_annex_iv_evidence to service_role;
grant select, insert on public.ai_annex_iv_changes to service_role;
grant select, insert on public.ai_annex_iv_decisions to service_role;

commit;
