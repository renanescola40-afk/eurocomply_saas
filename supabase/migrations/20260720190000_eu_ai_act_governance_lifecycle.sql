begin;

create table if not exists public.ai_governance_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_system_id uuid not null,
  risk_tier text not null check (risk_tier in ('minimal', 'limited', 'high', 'prohibited_review')),
  lifecycle_stage text not null default 'draft' check (lifecycle_stage in ('draft', 'assessment_pending', 'evidence_pending', 'approval_pending', 'approved', 'blocked', 'retired')),
  assessment_version text not null,
  prohibited_practices jsonb not null default '{}'::jsonb,
  controls jsonb not null default '[]'::jsonb,
  missing_control_ids text[] not null default '{}',
  production_use_allowed boolean not null default false,
  accountable_owner_id uuid,
  approver_id uuid,
  approval_decision text check (approval_decision in ('approved', 'rejected', 'changes_required')),
  approval_rationale text,
  approved_at timestamptz,
  retired_at timestamptz,
  review_due_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, ai_system_id),
  check (accountable_owner_id is null or accountable_owner_id <> approver_id),
  check ((lifecycle_stage = 'approved') = (production_use_allowed and approved_at is not null and approval_decision = 'approved')),
  check (lifecycle_stage <> 'blocked' or production_use_allowed = false),
  check (lifecycle_stage <> 'retired' or production_use_allowed = false)
);

create table if not exists public.ai_governance_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  governance_case_id uuid not null references public.ai_governance_cases(id) on delete cascade,
  control_id text not null check (control_id ~ '^GOV-[0-9]{2}$'),
  evidence_type text not null,
  storage_path text,
  external_reference text,
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'accepted', 'rejected', 'superseded')),
  submitted_by uuid not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or external_reference is not null),
  check ((status in ('accepted', 'rejected')) = (reviewed_by is not null and reviewed_at is not null))
);

create table if not exists public.ai_governance_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  governance_case_id uuid not null references public.ai_governance_cases(id) on delete cascade,
  case_version bigint not null,
  from_stage text,
  to_stage text not null,
  decision text not null,
  rationale text not null,
  actor_id uuid not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.enforce_ai_governance_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
begin
  foreach actor in array array[new.accountable_owner_id, new.approver_id, new.created_by, new.updated_by]
  loop
    if actor is not null and not exists (
      select 1
      from public.organization_members m
      where m.organization_id = new.organization_id
        and m.user_id = actor
    ) then
      raise exception 'governance actor must belong to the case organization' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.enforce_ai_governance_actor_scope() from public, anon, authenticated;

drop trigger if exists enforce_ai_governance_actor_scope on public.ai_governance_cases;
create trigger enforce_ai_governance_actor_scope
before insert or update of organization_id, accountable_owner_id, approver_id, created_by, updated_by
on public.ai_governance_cases
for each row execute function public.enforce_ai_governance_actor_scope();

create or replace function public.record_ai_governance_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    old.lifecycle_stage is distinct from new.lifecycle_stage
    or old.approval_decision is distinct from new.approval_decision
    or old.production_use_allowed is distinct from new.production_use_allowed
  ) then
    insert into public.ai_governance_decisions (
      organization_id,
      governance_case_id,
      case_version,
      from_stage,
      to_stage,
      decision,
      rationale,
      actor_id,
      snapshot
    ) values (
      new.organization_id,
      new.id,
      new.version,
      old.lifecycle_stage,
      new.lifecycle_stage,
      coalesce(new.approval_decision, 'lifecycle_transition'),
      coalesce(new.approval_rationale, 'Lifecycle state transition'),
      new.updated_by,
      jsonb_build_object(
        'riskTier', new.risk_tier,
        'assessmentVersion', new.assessment_version,
        'missingControlIds', new.missing_control_ids,
        'productionUseAllowed', new.production_use_allowed
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function public.record_ai_governance_decision() from public, anon, authenticated;

drop trigger if exists record_ai_governance_decision on public.ai_governance_cases;
create trigger record_ai_governance_decision
after update on public.ai_governance_cases
for each row execute function public.record_ai_governance_decision();

alter table public.ai_governance_cases enable row level security;
alter table public.ai_governance_cases force row level security;
alter table public.ai_governance_evidence enable row level security;
alter table public.ai_governance_evidence force row level security;
alter table public.ai_governance_decisions enable row level security;
alter table public.ai_governance_decisions force row level security;

revoke insert, update, delete on public.ai_governance_cases from anon, authenticated;
revoke insert, update, delete on public.ai_governance_evidence from anon, authenticated;
revoke insert, update, delete on public.ai_governance_decisions from anon, authenticated;
grant select on public.ai_governance_cases, public.ai_governance_evidence, public.ai_governance_decisions to authenticated;
grant all on public.ai_governance_cases, public.ai_governance_evidence, public.ai_governance_decisions to service_role;

create policy ai_governance_cases_tenant_read
on public.ai_governance_cases for select to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = ai_governance_cases.organization_id
    and m.user_id = auth.uid()
));

create policy ai_governance_evidence_tenant_read
on public.ai_governance_evidence for select to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = ai_governance_evidence.organization_id
    and m.user_id = auth.uid()
));

create policy ai_governance_decisions_tenant_read
on public.ai_governance_decisions for select to authenticated
using (exists (
  select 1 from public.organization_members m
  where m.organization_id = ai_governance_decisions.organization_id
    and m.user_id = auth.uid()
));

create index if not exists ai_governance_cases_org_stage_idx on public.ai_governance_cases (organization_id, lifecycle_stage);
create index if not exists ai_governance_cases_review_due_idx on public.ai_governance_cases (review_due_at) where review_due_at is not null and retired_at is null;
create index if not exists ai_governance_evidence_case_control_idx on public.ai_governance_evidence (governance_case_id, control_id, status);
create index if not exists ai_governance_decisions_case_created_idx on public.ai_governance_decisions (governance_case_id, created_at desc);

commit;
