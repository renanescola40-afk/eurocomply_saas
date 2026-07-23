begin;

create table if not exists public.ai_qms_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  audit_type text not null check (audit_type in ('internal','supplier','process','product','regulatory')),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','accepted','cancelled')),
  scope text not null check (char_length(btrim(scope)) between 10 and 4000),
  lead_auditor_user_id uuid not null references auth.users(id),
  reviewed_by_user_id uuid references auth.users(id),
  scheduled_at timestamptz,
  completed_at timestamptz,
  accepted_at timestamptz,
  findings_count integer not null default 0 check (findings_count >= 0),
  high_findings_count integer not null default 0 check (high_findings_count >= 0),
  critical_findings_count integer not null default 0 check (critical_findings_count >= 0),
  report_reference text,
  report_digest text check (report_digest is null or report_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, qms_system_id) references public.ai_qms_systems(organization_id, id) on delete cascade,
  constraint ai_qms_audit_reviewer_separation check (reviewed_by_user_id is null or reviewed_by_user_id <> lead_auditor_user_id),
  constraint ai_qms_audit_acceptance_integrity check (
    status <> 'accepted' or (
      completed_at is not null and accepted_at is not null and reviewed_by_user_id is not null
      and report_reference is not null and report_digest is not null
      and high_findings_count = 0 and critical_findings_count = 0
    )
  )
);

create table if not exists public.ai_qms_management_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qms_system_id uuid not null,
  status text not null default 'draft' check (status in ('draft','scheduled','in_review','completed','approved','cancelled')),
  period_start date not null,
  period_end date not null,
  inputs_summary text not null default '',
  decisions_summary text not null default '',
  action_items_count integer not null default 0 check (action_items_count >= 0),
  open_action_items_count integer not null default 0 check (open_action_items_count >= 0),
  chair_user_id uuid not null references auth.users(id),
  reviewer_user_id uuid references auth.users(id),
  approved_by_user_id uuid references auth.users(id),
  reviewed_at timestamptz,
  approved_at timestamptz,
  evidence_reference text,
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, qms_system_id) references public.ai_qms_systems(organization_id, id) on delete cascade,
  constraint ai_qms_management_review_period check (period_end >= period_start),
  constraint ai_qms_management_review_actor_separation check (
    (reviewer_user_id is null or reviewer_user_id <> chair_user_id)
    and (approved_by_user_id is null or approved_by_user_id <> chair_user_id)
    and (approved_by_user_id is null or reviewer_user_id is null or approved_by_user_id <> reviewer_user_id)
  ),
  constraint ai_qms_management_review_approval_integrity check (
    status <> 'approved' or (
      char_length(btrim(inputs_summary)) >= 20 and char_length(btrim(decisions_summary)) >= 20
      and reviewer_user_id is not null and approved_by_user_id is not null
      and reviewed_at is not null and approved_at is not null
      and evidence_reference is not null and evidence_digest is not null
      and open_action_items_count = 0
    )
  )
);

create or replace function public.create_qms_system_atomic(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_title text,
  p_scope text,
  p_quality_policy text,
  p_regulatory_strategy text
) returns setof public.ai_qms_systems
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_version integer; v_row public.ai_qms_systems;
begin
  if not public.ai_qms_actor_is_member(p_organization_id, p_actor_user_id) then raise exception 'qms_actor_not_member'; end if;
  perform pg_catalog.pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || lower(btrim(p_title)), 0));
  select coalesce(max(version), 0) + 1 into v_version from public.ai_qms_systems where organization_id = p_organization_id and lower(title) = lower(btrim(p_title));
  insert into public.ai_qms_systems (organization_id, version, title, scope, quality_policy, regulatory_strategy, status, owner_user_id)
  values (p_organization_id, v_version, btrim(p_title), btrim(p_scope), btrim(p_quality_policy), btrim(p_regulatory_strategy), 'planning', p_actor_user_id)
  returning * into v_row;
  return next v_row;
end $$;

create or replace function public.refresh_qms_system_counters(p_organization_id uuid, p_qms_system_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_severe integer; v_overdue integer;
begin
  select count(*) filter (where severity in ('high','critical') and status not in ('closed','accepted_risk')),
         count(*) filter (where due_at < now() and status not in ('closed','accepted_risk'))
    into v_severe, v_overdue
  from public.ai_qms_nonconformities
  where organization_id = p_organization_id and qms_system_id = p_qms_system_id;
  update public.ai_qms_systems set severe_nonconformities_count = coalesce(v_severe,0), overdue_corrective_actions_count = coalesce(v_overdue,0), updated_at = now()
  where organization_id = p_organization_id and id = p_qms_system_id;
end $$;

create or replace function public.sync_qms_counters_after_nonconformity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.refresh_qms_system_counters(coalesce(new.organization_id, old.organization_id), coalesce(new.qms_system_id, old.qms_system_id));
  return coalesce(new, old);
end $$;

drop trigger if exists qms_nonconformity_counter_sync on public.ai_qms_nonconformities;
create trigger qms_nonconformity_counter_sync after insert or update or delete on public.ai_qms_nonconformities
for each row execute function public.sync_qms_counters_after_nonconformity();

create or replace function public.approve_qms_system_atomic(
  p_organization_id uuid,
  p_qms_system_id uuid,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_rationale text
) returns setof public.ai_qms_systems
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_qms public.ai_qms_systems; v_controls integer; v_effective integer; v_audits integer; v_reviews integer;
begin
  select * into v_qms from public.ai_qms_systems where organization_id = p_organization_id and id = p_qms_system_id for update;
  if not found then raise exception 'qms_not_found'; end if;
  if v_qms.updated_at <> p_expected_updated_at then raise exception 'qms_state_changed'; end if;
  if v_qms.approver_user_id is distinct from p_actor_user_id then raise exception 'qms_approver_mismatch'; end if;
  if v_qms.reviewer_user_id is null or v_qms.approver_user_id is null or v_qms.reviewer_user_id = v_qms.owner_user_id or v_qms.approver_user_id in (v_qms.owner_user_id, v_qms.reviewer_user_id) then raise exception 'qms_actor_separation_required'; end if;
  if char_length(btrim(v_qms.scope)) < 20 or char_length(btrim(v_qms.quality_policy)) < 20 or char_length(btrim(v_qms.regulatory_strategy)) < 20 then raise exception 'qms_core_documents_incomplete'; end if;
  perform public.refresh_qms_system_counters(p_organization_id, p_qms_system_id);
  select count(*), count(*) filter (where status in ('effective','not_applicable')) into v_controls, v_effective from public.ai_qms_controls where organization_id = p_organization_id and qms_system_id = p_qms_system_id;
  select count(*) into v_audits from public.ai_qms_audits where organization_id = p_organization_id and qms_system_id = p_qms_system_id and status = 'accepted';
  select count(*) into v_reviews from public.ai_qms_management_reviews where organization_id = p_organization_id and qms_system_id = p_qms_system_id and status = 'approved';
  select * into v_qms from public.ai_qms_systems where organization_id = p_organization_id and id = p_qms_system_id;
  if v_controls = 0 or v_effective <> v_controls then raise exception 'qms_controls_not_effective'; end if;
  if v_audits = 0 then raise exception 'qms_internal_audit_required'; end if;
  if v_reviews = 0 then raise exception 'qms_management_review_required'; end if;
  if v_qms.severe_nonconformities_count <> 0 or v_qms.overdue_corrective_actions_count <> 0 then raise exception 'qms_capa_blocking'; end if;
  update public.ai_qms_systems set status='approved', management_reviewed_at=now(), approved_at=now(), updated_at=now() where organization_id=p_organization_id and id=p_qms_system_id returning * into v_qms;
  insert into public.ai_qms_decisions (organization_id,qms_system_id,decision_type,outcome,rationale,actor_user_id)
  values (p_organization_id,p_qms_system_id,'qms_approved','approved',p_rationale,p_actor_user_id);
  return next v_qms;
end $$;

create or replace function public.enforce_ai_qms_operational_actor_scope()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_table_name = 'ai_qms_audits' then
    if not public.ai_qms_actor_is_member(new.organization_id,new.lead_auditor_user_id) or not public.ai_qms_actor_is_member(new.organization_id,new.reviewed_by_user_id) then raise exception 'qms_audit_actor_scope'; end if;
  else
    if not public.ai_qms_actor_is_member(new.organization_id,new.chair_user_id) or not public.ai_qms_actor_is_member(new.organization_id,new.reviewer_user_id) or not public.ai_qms_actor_is_member(new.organization_id,new.approved_by_user_id) then raise exception 'qms_review_actor_scope'; end if;
  end if;
  return new;
end $$;

drop trigger if exists ai_qms_audit_actor_scope on public.ai_qms_audits;
create trigger ai_qms_audit_actor_scope before insert or update on public.ai_qms_audits for each row execute function public.enforce_ai_qms_operational_actor_scope();
drop trigger if exists ai_qms_management_review_actor_scope on public.ai_qms_management_reviews;
create trigger ai_qms_management_review_actor_scope before insert or update on public.ai_qms_management_reviews for each row execute function public.enforce_ai_qms_operational_actor_scope();

alter table public.ai_qms_audits enable row level security;
alter table public.ai_qms_audits force row level security;
alter table public.ai_qms_management_reviews enable row level security;
alter table public.ai_qms_management_reviews force row level security;
create policy ai_qms_audits_member_select on public.ai_qms_audits for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id=ai_qms_audits.organization_id and m.user_id=auth.uid()));
create policy ai_qms_management_reviews_member_select on public.ai_qms_management_reviews for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id=ai_qms_management_reviews.organization_id and m.user_id=auth.uid()));
revoke all on public.ai_qms_audits, public.ai_qms_management_reviews from anon, authenticated;
grant select on public.ai_qms_audits, public.ai_qms_management_reviews to authenticated;
grant select,insert,update,delete on public.ai_qms_audits, public.ai_qms_management_reviews to service_role;
revoke all on function public.create_qms_system_atomic(uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.approve_qms_system_atomic(uuid,uuid,timestamptz,uuid,text) from public, anon, authenticated;
grant execute on function public.create_qms_system_atomic(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.approve_qms_system_atomic(uuid,uuid,timestamptz,uuid,text) to service_role;

commit;
