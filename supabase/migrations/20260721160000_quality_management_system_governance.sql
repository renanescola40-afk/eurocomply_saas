begin;

create table if not exists public.ai_qms_systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  title text not null check (char_length(btrim(title)) between 3 and 200),
  scope text not null default '',
  quality_policy text not null default '',
  regulatory_strategy text not null default '',
  status text not null default 'draft' check (
    status in ('draft','planning','operating','management_review','approval','approved','blocked','retired')
  ),
  owner_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  approver_user_id uuid references auth.users(id),
  severe_nonconformities_count integer not null default 0 check (severe_nonconformities_count >= 0),
  overdue_corrective_actions_count integer not null default 0 check (overdue_corrective_actions_count >= 0),
  effective_from timestamptz,
  next_review_at timestamptz,
  management_reviewed_at timestamptz,
  approved_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, title, version),
  constraint ai_qms_systems_actor_separation check (
    (reviewer_user_id is null or reviewer_user_id <> owner_user_id)
    and (approver_user_id is null or approver_user_id <> owner_user_id)
    and (approver_user_id is null or reviewer_user_id is null or approver_user_id <> reviewer_user_id)
  ),
  constraint ai_qms_systems_approval_integrity check (
    status <> 'approved'
    or (
      reviewer_user_id is not null
      and approver_user_id is not null
      and management_reviewed_at is not null
      and approved_at is not null
      and severe_nonconformities_count = 0
      and overdue_corrective_actions_count = 0
    )
  ),
  constraint ai_qms_systems_retirement_integrity check (
    status <> 'retired' or retired_at is not null
  )
);

create table if not exists public.ai_qms_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  control_code text not null check (control_code ~ '^QMS-[0-9]{2,3}$'),
  category text not null check (
    category in ('governance','documents','records','design','suppliers','data','risk','monitoring','incidents','change','competence','audit','management_review','corrective_action','regulatory')
  ),
  title text not null check (char_length(btrim(title)) between 3 and 240),
  status text not null default 'not_started' check (
    status in ('not_started','in_progress','implemented','tested','effective','ineffective','not_applicable')
  ),
  owner_user_id uuid references auth.users(id),
  due_at timestamptz,
  last_tested_at timestamptz,
  next_test_at timestamptz,
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  evidence_reference text,
  rationale text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, qms_system_id, control_code),
  foreign key (organization_id, qms_system_id)
    references public.ai_qms_systems(organization_id, id)
    on delete cascade
);

create table if not exists public.ai_qms_nonconformities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  source text not null check (source in ('internal_audit','management_review','incident','monitoring','complaint','supplier','regulatory','other')),
  status text not null default 'open' check (
    status in ('open','contained','root_cause','corrective_action','effectiveness_review','closed','accepted_risk')
  ),
  description text not null check (char_length(btrim(description)) between 10 and 4000),
  containment text not null default '',
  root_cause text not null default '',
  corrective_action text not null default '',
  owner_user_id uuid not null references auth.users(id),
  due_at timestamptz,
  verified_by_user_id uuid references auth.users(id),
  verified_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, qms_system_id)
    references public.ai_qms_systems(organization_id, id)
    on delete cascade,
  constraint ai_qms_nonconformities_verifier_separation check (
    verified_by_user_id is null or verified_by_user_id <> owner_user_id
  ),
  constraint ai_qms_nonconformities_closure_integrity check (
    status <> 'closed'
    or (
      char_length(btrim(root_cause)) >= 10
      and char_length(btrim(corrective_action)) >= 10
      and verified_by_user_id is not null
      and verified_at is not null
      and closed_at is not null
    )
  )
);

create table if not exists public.ai_qms_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  decision_type text not null check (
    decision_type in ('scope_approved','policy_approved','control_exception','audit_accepted','management_review','corrective_action_verified','qms_approved','qms_blocked','qms_retired')
  ),
  outcome text not null check (outcome in ('approved','rejected','needs_work','blocked','retired')),
  rationale text not null check (char_length(btrim(rationale)) between 10 and 4000),
  actor_user_id uuid references auth.users(id),
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (organization_id, qms_system_id)
    references public.ai_qms_systems(organization_id, id)
    on delete cascade
);

create index if not exists ai_qms_systems_org_status_idx
  on public.ai_qms_systems (organization_id, status, next_review_at);
create index if not exists ai_qms_controls_due_idx
  on public.ai_qms_controls (organization_id, status, due_at);
create index if not exists ai_qms_nonconformities_queue_idx
  on public.ai_qms_nonconformities (organization_id, status, severity, due_at);
create index if not exists ai_qms_decisions_history_idx
  on public.ai_qms_decisions (organization_id, qms_system_id, created_at desc);

create or replace function public.ai_qms_actor_is_member(target_organization_id uuid, target_user_id uuid)
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

revoke all on function public.ai_qms_actor_is_member(uuid, uuid) from public;
grant execute on function public.ai_qms_actor_is_member(uuid, uuid) to service_role;

create or replace function public.enforce_ai_qms_system_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_qms_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_qms_actor_is_member(new.organization_id, new.reviewer_user_id)
    or not public.ai_qms_actor_is_member(new.organization_id, new.approver_user_id) then
    raise exception 'QMS system actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_qms_control_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_qms_actor_is_member(new.organization_id, new.owner_user_id) then
    raise exception 'QMS control owner must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_qms_nonconformity_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_qms_actor_is_member(new.organization_id, new.owner_user_id)
    or not public.ai_qms_actor_is_member(new.organization_id, new.verified_by_user_id) then
    raise exception 'QMS nonconformity actors must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_ai_qms_decision_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.ai_qms_actor_is_member(new.organization_id, new.actor_user_id) then
    raise exception 'QMS decision actor must belong to the same organization';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_ai_qms_decision_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'QMS decisions are append-only';
end;
$$;

drop trigger if exists ai_qms_system_actor_scope on public.ai_qms_systems;
create trigger ai_qms_system_actor_scope
before insert or update on public.ai_qms_systems
for each row execute function public.enforce_ai_qms_system_actor_scope();

drop trigger if exists ai_qms_control_actor_scope on public.ai_qms_controls;
create trigger ai_qms_control_actor_scope
before insert or update on public.ai_qms_controls
for each row execute function public.enforce_ai_qms_control_actor_scope();

drop trigger if exists ai_qms_nonconformity_actor_scope on public.ai_qms_nonconformities;
create trigger ai_qms_nonconformity_actor_scope
before insert or update on public.ai_qms_nonconformities
for each row execute function public.enforce_ai_qms_nonconformity_actor_scope();

drop trigger if exists ai_qms_decision_actor_scope on public.ai_qms_decisions;
create trigger ai_qms_decision_actor_scope
before insert on public.ai_qms_decisions
for each row execute function public.enforce_ai_qms_decision_actor_scope();

drop trigger if exists ai_qms_decision_immutable on public.ai_qms_decisions;
create trigger ai_qms_decision_immutable
before update or delete on public.ai_qms_decisions
for each row execute function public.prevent_ai_qms_decision_mutation();

alter table public.ai_qms_systems enable row level security;
alter table public.ai_qms_systems force row level security;
alter table public.ai_qms_controls enable row level security;
alter table public.ai_qms_controls force row level security;
alter table public.ai_qms_nonconformities enable row level security;
alter table public.ai_qms_nonconformities force row level security;
alter table public.ai_qms_decisions enable row level security;
alter table public.ai_qms_decisions force row level security;

create policy ai_qms_systems_member_select on public.ai_qms_systems
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_systems.organization_id
    and member.user_id = auth.uid()
));

create policy ai_qms_controls_member_select on public.ai_qms_controls
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_controls.organization_id
    and member.user_id = auth.uid()
));

create policy ai_qms_nonconformities_member_select on public.ai_qms_nonconformities
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_nonconformities.organization_id
    and member.user_id = auth.uid()
));

create policy ai_qms_decisions_member_select on public.ai_qms_decisions
for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = ai_qms_decisions.organization_id
    and member.user_id = auth.uid()
));

revoke all on public.ai_qms_systems from anon, authenticated;
revoke all on public.ai_qms_controls from anon, authenticated;
revoke all on public.ai_qms_nonconformities from anon, authenticated;
revoke all on public.ai_qms_decisions from anon, authenticated;

grant select on public.ai_qms_systems to authenticated;
grant select on public.ai_qms_controls to authenticated;
grant select on public.ai_qms_nonconformities to authenticated;
grant select on public.ai_qms_decisions to authenticated;

grant select, insert, update, delete on public.ai_qms_systems to service_role;
grant select, insert, update, delete on public.ai_qms_controls to service_role;
grant select, insert, update, delete on public.ai_qms_nonconformities to service_role;
grant select, insert on public.ai_qms_decisions to service_role;

commit;
