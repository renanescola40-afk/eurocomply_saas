begin;

create table if not exists public.qualified_review_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requirement_id text not null check (requirement_id in ('legal-rules','prohibited-practices','article-50-copy','fria-methodology','deployer-obligations','high-risk-provider','conformity','gpai')),
  reviewed_sha text not null check (reviewed_sha ~ '^[a-f0-9]{40}$'),
  status text not null default 'DRAFT' check (status in ('DRAFT','ASSIGNED','IN_REVIEW','CHANGES_REQUESTED','APPROVED','APPROVED_WITH_LIMITATIONS','REJECTED','EXPIRED')),
  prepared_by uuid not null references auth.users(id),
  assigned_reviewer_id uuid,
  assigned_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  evidence_references jsonb not null default '[]'::jsonb,
  independence_statement text,
  conflict_checked boolean not null default false,
  conflict_found boolean not null default false,
  decision_rationale text,
  limitations jsonb not null default '[]'::jsonb,
  reviewed_at timestamptz,
  valid_until timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, requirement_id, reviewed_sha),
  check (approved_by is null or approved_by <> prepared_by)
);

create table if not exists public.qualified_reviewers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  reviewer_organization text not null,
  contact text not null,
  title text not null,
  disciplines jsonb not null default '[]'::jsonb,
  qualification_evidence jsonb not null default '[]'::jsonb,
  active_from date not null,
  active_until date not null,
  conflict_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (active_until >= active_from)
);

create table if not exists public.qualified_review_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.qualified_review_cases(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  from_status text not null,
  to_status text not null,
  rationale text not null,
  evidence_digest text,
  created_at timestamptz not null default now()
);

create index if not exists qualified_review_cases_org_status_idx on public.qualified_review_cases(organization_id, status);
create index if not exists qualified_review_decisions_case_idx on public.qualified_review_decisions(case_id, created_at desc);

alter table public.qualified_review_cases enable row level security;
alter table public.qualified_review_cases force row level security;
alter table public.qualified_reviewers enable row level security;
alter table public.qualified_reviewers force row level security;
alter table public.qualified_review_decisions enable row level security;
alter table public.qualified_review_decisions force row level security;

create policy qualified_review_cases_read on public.qualified_review_cases for select to authenticated
using (public.is_organization_member(organization_id));
create policy qualified_reviewers_read on public.qualified_reviewers for select to authenticated
using (public.is_organization_member(organization_id));
create policy qualified_review_decisions_read on public.qualified_review_decisions for select to authenticated
using (public.is_organization_member(organization_id));

revoke insert, update, delete on public.qualified_review_cases from anon, authenticated;
revoke insert, update, delete on public.qualified_reviewers from anon, authenticated;
revoke insert, update, delete on public.qualified_review_decisions from anon, authenticated;

grant select on public.qualified_review_cases, public.qualified_reviewers, public.qualified_review_decisions to authenticated;

create or replace function public.transition_qualified_review_case(
  p_case_id uuid,
  p_actor_id uuid,
  p_expected_version integer,
  p_next_status text,
  p_rationale text,
  p_evidence_digest text default null
) returns public.qualified_review_cases
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_case public.qualified_review_cases;
begin
  select * into v_case from public.qualified_review_cases where id = p_case_id for update;
  if not found then raise exception 'qualified review case not found'; end if;
  if v_case.version <> p_expected_version then raise exception 'qualified review version conflict'; end if;
  if not public.is_organization_member(v_case.organization_id) then raise exception 'not authorized'; end if;
  if p_next_status in ('APPROVED','APPROVED_WITH_LIMITATIONS') and p_actor_id = v_case.prepared_by then
    raise exception 'preparer cannot approve';
  end if;
  if p_next_status in ('APPROVED','APPROVED_WITH_LIMITATIONS') then
    if v_case.conflict_checked is not true or v_case.conflict_found is true then raise exception 'independence check failed'; end if;
    if v_case.evidence_digest is null or v_case.valid_until is null or v_case.valid_until <= now() then raise exception 'review evidence incomplete or expired'; end if;
  end if;
  insert into public.qualified_review_decisions(organization_id, case_id, actor_id, from_status, to_status, rationale, evidence_digest)
  values(v_case.organization_id, v_case.id, p_actor_id, v_case.status, p_next_status, p_rationale, p_evidence_digest);
  update public.qualified_review_cases set status = p_next_status, approved_by = case when p_next_status in ('APPROVED','APPROVED_WITH_LIMITATIONS') then p_actor_id else approved_by end,
    decision_rationale = p_rationale, version = version + 1, updated_at = now()
  where id = p_case_id returning * into v_case;
  return v_case;
end;
$$;

revoke all on function public.transition_qualified_review_case(uuid,uuid,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.transition_qualified_review_case(uuid,uuid,integer,text,text,text) to service_role;

commit;
