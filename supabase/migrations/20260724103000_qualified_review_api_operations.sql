begin;

create unique index if not exists qualified_review_submissions_one_current
  on public.qualified_review_submissions (organization_id, assignment_id)
  where superseded_at is null;

create or replace function public.reject_qualified_review_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'qualified_review_events_append_only';
end;
$$;

drop trigger if exists qualified_review_events_append_only on public.qualified_review_events;
create trigger qualified_review_events_append_only
before update or delete on public.qualified_review_events
for each row execute function public.reject_qualified_review_event_mutation();

create or replace function public.expire_qualified_review_assignments(
  p_organization_id uuid,
  p_actor_id uuid,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_assignment record;
begin
  if not public.is_organization_member(p_organization_id) then
    raise exception 'forbidden';
  end if;

  for v_assignment in
    select a.id, a.campaign_id, a.version
    from public.qualified_review_assignments a
    where a.organization_id = p_organization_id
      and a.status in ('assigned','in_review','submitted','accepted','changes_requested')
      and (
        (a.due_at is not null and a.due_at <= p_now)
        or exists (
          select 1
          from public.qualified_review_submissions s
          where s.organization_id = a.organization_id
            and s.assignment_id = a.id
            and s.superseded_at is null
            and s.valid_until <= p_now
        )
      )
    for update
  loop
    update public.qualified_review_assignments
    set status = 'expired', version = version + 1
    where id = v_assignment.id;

    insert into public.qualified_review_events(
      organization_id, campaign_id, assignment_id, actor_id, event_type, payload
    ) values (
      p_organization_id,
      v_assignment.campaign_id,
      v_assignment.id,
      p_actor_id,
      'assignment_expired',
      jsonb_build_object('expiredAt', p_now, 'previousVersion', v_assignment.version)
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.expire_qualified_review_assignments(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.expire_qualified_review_assignments(uuid, uuid, timestamptz) to service_role;

comment on function public.expire_qualified_review_assignments(uuid, uuid, timestamptz)
  is 'Backend-only expiry sweep for due or expired qualified-review assignments with append-only audit events.';

commit;
