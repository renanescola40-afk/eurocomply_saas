begin;

create or replace view public.qualified_review_control_center_v1
with (security_invoker = true)
as
select
  c.organization_id,
  c.id as campaign_id,
  c.target_sha,
  c.status as campaign_status,
  c.opened_at,
  count(distinct a.id)::integer as assignment_count,
  count(distinct a.id) filter (where a.status = 'accepted')::integer as accepted_count,
  count(distinct a.id) filter (where a.status in ('rejected','changes_requested'))::integer as blocked_count,
  count(distinct a.id) filter (where a.status in ('expired','revoked'))::integer as unavailable_count,
  count(distinct a.id) filter (where a.due_at is not null and a.due_at < now() and a.status not in ('accepted','rejected','expired','revoked'))::integer as overdue_count,
  coalesce(sum(a.weight) filter (where a.status = 'accepted'), 0)::integer as accepted_weight,
  coalesce(sum(a.weight), 0)::integer as total_weight,
  max(a.updated_at) as last_assignment_activity_at,
  max(s.submitted_at) as last_submission_at,
  max(d.decided_at) as last_decision_at,
  case
    when count(distinct a.id) = 8
      and coalesce(sum(a.weight), 0) = 51
      and coalesce(sum(a.weight) filter (where a.status = 'accepted'), 0) = 51
      and count(distinct a.id) filter (where a.status = 'accepted') = 8
    then true else false
  end as technically_ready_for_promotion
from public.qualified_review_campaigns c
left join public.qualified_review_assignments a
  on a.campaign_id = c.id and a.organization_id = c.organization_id
left join public.qualified_review_submissions s
  on s.assignment_id = a.id and s.organization_id = c.organization_id and s.superseded_at is null
left join public.qualified_review_decisions d
  on d.assignment_id = a.id and d.organization_id = c.organization_id
where public.is_organization_member(c.organization_id)
group by c.organization_id, c.id, c.target_sha, c.status, c.opened_at;

grant select on public.qualified_review_control_center_v1 to authenticated;
revoke all on public.qualified_review_control_center_v1 from anon;

comment on view public.qualified_review_control_center_v1 is
  'Tenant-scoped operational projection for the eight qualified human reviews. Readiness remains false until eight genuine accepted reviews total exactly 51 points.';

commit;