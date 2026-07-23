begin;

alter table public.qualified_review_assignments
  add column if not exists prepared_by uuid references auth.users(id),
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz;

alter table public.qualified_review_submissions
  add column if not exists submitted_by uuid references auth.users(id);

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
  end if;

  if p_next_status = 'accepted' and not exists (
    select 1 from public.qualified_review_submissions s
    where s.assignment_id = v_assignment.id
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

  insert into public.qualified_review_events(
    organization_id, campaign_id, assignment_id, actor_id, event_type, payload
  ) values (
    v_assignment.organization_id,
    v_assignment.campaign_id,
    v_assignment.id,
    p_actor_id,
    'assignment_status_changed',
    jsonb_build_object('nextStatus', p_next_status, 'reason', p_reason, 'version', v_assignment.version)
  );

  return v_assignment;
end;
$$;

revoke all on function public.transition_qualified_review_assignment(uuid, uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.transition_qualified_review_assignment(uuid, uuid, integer, text, text) to service_role;

comment on function public.transition_qualified_review_assignment(uuid, uuid, integer, text, text)
  is 'Backend-only optimistic transition enforcing valid evidence and preparer/reviewer/approver separation.';

commit;
