begin;

create table if not exists public.ai_regulatory_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workstream text not null check (workstream in ('annex_iv','qms','conformity','gpai')),
  system_reference text not null,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft','in_review','blocked','approved','retired')),
  owner_user_id uuid not null,
  reviewer_user_id uuid,
  approver_user_id uuid,
  content_digest text,
  open_blockers integer not null default 0 check (open_blockers >= 0),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, workstream, system_reference, version)
);

create table if not exists public.ai_regulatory_program_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.ai_regulatory_programs(id) on delete cascade,
  control_code text not null,
  status text not null default 'missing' check (status in ('missing','draft','reviewed','approved','not_applicable')),
  evidence_digest text,
  reviewer_user_id uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, control_code)
);

create table if not exists public.ai_regulatory_program_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.ai_regulatory_programs(id) on delete cascade,
  outcome text not null,
  rationale text not null,
  actor_user_id uuid not null,
  evidence_digest text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_regulatory_programs enable row level security;
alter table public.ai_regulatory_programs force row level security;
alter table public.ai_regulatory_program_controls enable row level security;
alter table public.ai_regulatory_program_controls force row level security;
alter table public.ai_regulatory_program_decisions enable row level security;
alter table public.ai_regulatory_program_decisions force row level security;

revoke all on public.ai_regulatory_programs, public.ai_regulatory_program_controls, public.ai_regulatory_program_decisions from public, anon, authenticated;
grant all on public.ai_regulatory_programs, public.ai_regulatory_program_controls, public.ai_regulatory_program_decisions to service_role;

create or replace function public.create_ai_regulatory_program_atomic(
  p_organization_id uuid, p_actor_user_id uuid, p_workstream text, p_system_reference text
) returns table (outcome text, program jsonb)
language plpgsql security definer set search_path = '' as $$
declare v_version integer; v_program public.ai_regulatory_programs%rowtype;
begin
  if p_workstream not in ('annex_iv','qms','conformity','gpai') or char_length(pg_catalog.btrim(coalesce(p_system_reference,''))) < 3 then
    return query select 'invalid_input'::text, null::jsonb; return;
  end if;
  if not exists (select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=p_actor_user_id) then
    return query select 'actor_not_member'::text, null::jsonb; return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text||':'||p_workstream||':'||p_system_reference,0));
  select coalesce(max(version),0)+1 into v_version from public.ai_regulatory_programs where organization_id=p_organization_id and workstream=p_workstream and system_reference=pg_catalog.btrim(p_system_reference);
  insert into public.ai_regulatory_programs(organization_id,workstream,system_reference,version,owner_user_id)
  values(p_organization_id,p_workstream,pg_catalog.btrim(p_system_reference),v_version,p_actor_user_id) returning * into v_program;
  return query select 'created'::text,to_jsonb(v_program);
end; $$;

revoke all on function public.create_ai_regulatory_program_atomic(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.create_ai_regulatory_program_atomic(uuid,uuid,text,text) to service_role;

create or replace function public.approve_ai_regulatory_program_atomic(
  p_organization_id uuid, p_program_id uuid, p_expected_updated_at timestamptz, p_actor_user_id uuid, p_rationale text
) returns table (outcome text, program jsonb, decision_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_program public.ai_regulatory_programs%rowtype; v_decision uuid; v_missing integer;
begin
  select * into v_program from public.ai_regulatory_programs where organization_id=p_organization_id and id=p_program_id for update;
  if not found then return query select 'not_found'::text,null::jsonb,null::uuid; return; end if;
  if v_program.updated_at is distinct from p_expected_updated_at then return query select 'state_changed'::text,null::jsonb,null::uuid; return; end if;
  if v_program.approver_user_id is distinct from p_actor_user_id or v_program.reviewer_user_id is null or v_program.content_digest is null or v_program.open_blockers<>0 then
    return query select 'requirements_not_met'::text,null::jsonb,null::uuid; return;
  end if;
  select count(*) into v_missing from public.ai_regulatory_program_controls c where c.organization_id=p_organization_id and c.program_id=p_program_id and c.status not in ('approved','not_applicable');
  if v_missing<>0 or not exists(select 1 from public.ai_regulatory_program_controls c where c.organization_id=p_organization_id and c.program_id=p_program_id) then
    return query select 'controls_incomplete'::text,null::jsonb,null::uuid; return;
  end if;
  update public.ai_regulatory_programs set status='approved',approved_at=now(),updated_at=now() where id=p_program_id returning * into v_program;
  insert into public.ai_regulatory_program_decisions(organization_id,program_id,outcome,rationale,actor_user_id,evidence_digest)
  values(p_organization_id,p_program_id,'approved',pg_catalog.btrim(p_rationale),p_actor_user_id,v_program.content_digest) returning id into v_decision;
  return query select 'approved'::text,to_jsonb(v_program),v_decision;
end; $$;

revoke all on function public.approve_ai_regulatory_program_atomic(uuid,uuid,timestamptz,uuid,text) from public,anon,authenticated;
grant execute on function public.approve_ai_regulatory_program_atomic(uuid,uuid,timestamptz,uuid,text) to service_role;

notify pgrst, 'reload schema';
commit;
