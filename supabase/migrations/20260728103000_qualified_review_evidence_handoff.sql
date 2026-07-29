begin;

create table if not exists public.qualified_review_evidence_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null,
  target_sha text not null check (target_sha ~ '^[a-f0-9]{40}$'),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  accepted_points integer not null,
  review_count integer not null,
  blockers jsonb not null default '[]'::jsonb,
  package jsonb not null,
  generated_by uuid not null references auth.users(id),
  generated_at timestamptz not null default now(),
  superseded_at timestamptz,
  foreign key (campaign_id, organization_id) references public.qualified_review_campaigns(id, organization_id) on delete cascade
);

create unique index if not exists qualified_review_evidence_packages_current_idx
  on public.qualified_review_evidence_packages(campaign_id)
  where superseded_at is null;

alter table public.qualified_review_evidence_packages enable row level security;
alter table public.qualified_review_evidence_packages force row level security;
revoke all on public.qualified_review_evidence_packages from anon, authenticated;
grant select on public.qualified_review_evidence_packages to authenticated;
create policy qualified_review_evidence_packages_member_read
  on public.qualified_review_evidence_packages for select to authenticated
  using (public.is_organization_member(organization_id));

create or replace view public.qualified_review_evidence_handoff_view
with (security_invoker = true)
as
select
  a.organization_id,
  a.campaign_id,
  a.workstream_id,
  a.weight,
  a.id as assignment_id,
  a.reviewer_id,
  a.status as assignment_status,
  s.id as submission_id,
  s.target_sha,
  s.integrity_sha256,
  s.valid_until,
  d.id as decision_id,
  d.decided_at as accepted_at
from public.qualified_review_assignments a
left join public.qualified_review_submissions s
  on s.assignment_id = a.id
  and s.organization_id = a.organization_id
  and s.superseded_at is null
left join public.qualified_review_decisions d
  on d.assignment_id = a.id
  and d.submission_id = s.id
  and d.organization_id = a.organization_id
  and d.decision = 'accepted';

revoke all on public.qualified_review_evidence_handoff_view from anon;
grant select on public.qualified_review_evidence_handoff_view to authenticated, service_role;

create or replace function public.transition_qualified_review_assignment(
  p_assignment_id uuid,
  p_actor_id uuid,
  p_expected_version integer,
  p_next_status text,
  p_reason text default null
)
returns public.qualified_review_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.qualified_review_assignments;
  v_reviewer_user_id uuid;
  v_submission_id uuid;
begin
  select a.* into v_assignment
  from public.qualified_review_assignments a
  where a.id = p_assignment_id
  for update;

  if not found then raise exception 'assignment_not_found'; end if;
  if v_assignment.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if not public.is_organization_member(v_assignment.organization_id) then raise exception 'forbidden'; end if;

  select r.verified_by into v_reviewer_user_id
  from public.qualified_reviewers r
  where r.id = v_assignment.reviewer_id
    and r.organization_id = v_assignment.organization_id;

  if p_next_status in ('accepted','rejected','changes_requested') then
    if p_actor_id = v_assignment.assigned_by
       or p_actor_id = v_assignment.prepared_by
       or p_actor_id = v_reviewer_user_id then
      raise exception 'separation_of_duties_violation';
    end if;
    if coalesce(char_length(trim(p_reason)), 0) < 20 then raise exception 'decision_reason_required'; end if;

    select s.id into v_submission_id
    from public.qualified_review_submissions s
    where s.assignment_id = v_assignment.id
      and s.organization_id = v_assignment.organization_id
      and s.superseded_at is null;

    if v_submission_id is null then raise exception 'current_submission_required'; end if;
  end if;

  if p_next_status = 'accepted' and not exists (
    select 1 from public.qualified_review_submissions s
    where s.id = v_submission_id
      and s.assignment_id = v_assignment.id
      and s.organization_id = v_assignment.organization_id
      and s.superseded_at is null
      and s.valid_until > now()
  ) then
    raise exception 'valid_submission_required';
  end if;

  update public.qualified_review_assignments
  set status = p_next_status,
      approved_by = case when p_next_status = 'accepted' then p_actor_id else approved_by end,
      approved_at = case when p_next_status = 'accepted' then now() else approved_at end,
      version = version + 1
  where id = v_assignment.id
  returning * into v_assignment;

  if p_next_status in ('accepted','rejected','changes_requested') then
    insert into public.qualified_review_decisions(
      organization_id, assignment_id, submission_id, decision, reason, decided_by
    ) values (
      v_assignment.organization_id, v_assignment.id, v_submission_id, p_next_status, trim(p_reason), p_actor_id
    );
  end if;

  insert into public.qualified_review_events(
    organization_id, campaign_id, assignment_id, actor_id, event_type, payload
  ) values (
    v_assignment.organization_id,
    v_assignment.campaign_id,
    v_assignment.id,
    p_actor_id,
    'assignment_status_changed',
    jsonb_build_object(
      'nextStatus', p_next_status,
      'reason', p_reason,
      'version', v_assignment.version,
      'submissionId', v_submission_id
    )
  );

  return v_assignment;
end;
$$;

revoke all on function public.transition_qualified_review_assignment(uuid, uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.transition_qualified_review_assignment(uuid, uuid, integer, text, text) to service_role;

comment on function public.transition_qualified_review_assignment(uuid, uuid, integer, text, text)
  is 'Backend-only optimistic transition that atomically records decisions against the current submission.';

create or replace function public.persist_qualified_review_evidence_package(
  p_organization_id uuid,
  p_campaign_id uuid,
  p_target_sha text,
  p_manifest_sha256 text,
  p_accepted_points integer,
  p_review_count integer,
  p_blockers jsonb,
  p_package jsonb,
  p_generated_by uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_accepted_points <> 51 or p_review_count <> 8 or jsonb_array_length(p_blockers) <> 0 then
    raise exception 'evidence_package_incomplete';
  end if;
  update public.qualified_review_evidence_packages
    set superseded_at = now()
    where campaign_id = p_campaign_id and superseded_at is null;
  insert into public.qualified_review_evidence_packages(
    organization_id,campaign_id,target_sha,manifest_sha256,accepted_points,review_count,blockers,package,generated_by
  ) values (
    p_organization_id,p_campaign_id,p_target_sha,p_manifest_sha256,p_accepted_points,p_review_count,p_blockers,p_package,p_generated_by
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.persist_qualified_review_evidence_package(uuid,uuid,text,text,integer,integer,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.persist_qualified_review_evidence_package(uuid,uuid,text,text,integer,integer,jsonb,jsonb,uuid) to service_role;

commit;
