begin;

create table if not exists public.enterprise_usage_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.enterprise_contracts(id) on delete cascade,
  metric text not null check (metric in ('members','full_users','participants','viewers','admins')),
  threshold_percent integer not null check (threshold_percent in (80,90,100)),
  current_value integer not null check (current_value >= 0),
  limit_value integer not null check (limit_value >= 0),
  status text not null default 'open' check (status in ('open','resolved')),
  first_triggered_at timestamptz not null default now(),
  last_triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, contract_id, metric, threshold_percent)
);

create index if not exists enterprise_usage_alerts_open_idx
  on public.enterprise_usage_alerts (organization_id, status, threshold_percent desc)
  where status = 'open';
create index if not exists enterprise_usage_alerts_notification_idx
  on public.enterprise_usage_alerts (notification_sent_at, last_triggered_at)
  where status = 'open' and notification_sent_at is null;

alter table public.enterprise_usage_alerts enable row level security;
alter table public.enterprise_usage_alerts force row level security;
revoke all on public.enterprise_usage_alerts from public, anon, authenticated;
grant all on public.enterprise_usage_alerts to service_role;

create or replace function public.evaluate_enterprise_usage_alerts_atomic(
  p_batch_size integer default 100
)
returns table (
  alert_id uuid,
  organization_id uuid,
  contract_id uuid,
  metric text,
  threshold_percent integer,
  current_value integer,
  limit_value integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_snapshot record;
  v_queued record;
  v_metric record;
  v_threshold integer;
  v_percent numeric;
  v_alert public.enterprise_usage_alerts%rowtype;
  v_was_open boolean;
begin
  if p_batch_size < 1 or p_batch_size > 500 then
    raise exception 'invalid_batch_size';
  end if;

  for v_contract in
    select contract.*
    from public.enterprise_contracts as contract
    where contract.status in ('active','past_due','grace_period','read_only')
    order by contract.updated_at, contract.id
    for update skip locked
    limit p_batch_size
  loop
    select * into v_snapshot
    from public.resolve_organization_entitlements_v3(v_contract.organization_id);

    if v_snapshot.outcome is distinct from 'resolved' then
      continue;
    end if;

    select
      count(*)::integer as members,
      count(*) filter (where item.seat_type = 'full')::integer as full_users,
      count(*) filter (where item.seat_type = 'participant')::integer as participants,
      count(*) filter (where item.seat_type = 'viewer')::integer as viewers,
      count(*) filter (where item.role = 'admin')::integer as admins
    into v_queued
    from public.enterprise_provisioning_job_items as item
    where item.organization_id = v_contract.organization_id
      and item.status in ('queued','processing');

    for v_metric in
      select * from (values
        ('members'::text, v_snapshot.active_members + v_snapshot.pending_invitations + coalesce(v_queued.members, 0), v_snapshot.member_limit),
        ('full_users'::text, v_snapshot.full_users + v_snapshot.pending_full_users + coalesce(v_queued.full_users, 0), v_snapshot.full_user_limit),
        ('participants'::text, v_snapshot.participants + v_snapshot.pending_participants + coalesce(v_queued.participants, 0), v_snapshot.participant_limit),
        ('viewers'::text, v_snapshot.viewers + v_snapshot.pending_viewers + coalesce(v_queued.viewers, 0), v_snapshot.viewer_limit),
        ('admins'::text, v_snapshot.active_admins + v_snapshot.pending_admins + coalesce(v_queued.admins, 0), v_snapshot.admin_limit)
      ) as metrics(metric_name, used_value, allowed_value)
    loop
      v_percent := case
        when v_metric.allowed_value <= 0 and v_metric.used_value > 0 then 100
        when v_metric.allowed_value <= 0 then 0
        else (v_metric.used_value::numeric * 100) / v_metric.allowed_value::numeric
      end;

      foreach v_threshold in array array[80,90,100]
      loop
        select alert.* into v_alert
        from public.enterprise_usage_alerts as alert
        where alert.organization_id = v_contract.organization_id
          and alert.contract_id = v_contract.id
          and alert.metric = v_metric.metric_name
          and alert.threshold_percent = v_threshold
        for update;

        v_was_open := found and v_alert.status = 'open';

        if v_percent >= v_threshold then
          insert into public.enterprise_usage_alerts (
            organization_id,
            contract_id,
            metric,
            threshold_percent,
            current_value,
            limit_value,
            status,
            first_triggered_at,
            last_triggered_at,
            resolved_at,
            notification_sent_at
          ) values (
            v_contract.organization_id,
            v_contract.id,
            v_metric.metric_name,
            v_threshold,
            v_metric.used_value,
            v_metric.allowed_value,
            'open',
            now(),
            now(),
            null,
            null
          )
          on conflict (organization_id, contract_id, metric, threshold_percent) do update
          set
            current_value = excluded.current_value,
            limit_value = excluded.limit_value,
            status = 'open',
            last_triggered_at = now(),
            resolved_at = null,
            notification_sent_at = case
              when public.enterprise_usage_alerts.status = 'resolved' then null
              else public.enterprise_usage_alerts.notification_sent_at
            end,
            updated_at = now()
          returning * into v_alert;

          if not v_was_open then
            insert into public.audit_logs (
              organization_id,
              actor_user_id,
              action,
              entity_type,
              entity_id,
              metadata
            ) values (
              v_contract.organization_id,
              null,
              'enterprise.usage_threshold_reached',
              'enterprise_usage_alert',
              v_alert.id::text,
              jsonb_build_object(
                'metric', v_metric.metric_name,
                'threshold_percent', v_threshold,
                'current_value', v_metric.used_value,
                'limit_value', v_metric.allowed_value
              )
            );

            return query select
              v_alert.id,
              v_alert.organization_id,
              v_alert.contract_id,
              v_alert.metric,
              v_alert.threshold_percent,
              v_alert.current_value,
              v_alert.limit_value;
          end if;
        elsif found and v_alert.status = 'open' then
          update public.enterprise_usage_alerts as alert
          set
            status = 'resolved',
            current_value = v_metric.used_value,
            limit_value = v_metric.allowed_value,
            resolved_at = now(),
            updated_at = now()
          where alert.id = v_alert.id;

          insert into public.audit_logs (
            organization_id,
            actor_user_id,
            action,
            entity_type,
            entity_id,
            metadata
          ) values (
            v_contract.organization_id,
            null,
            'enterprise.usage_threshold_resolved',
            'enterprise_usage_alert',
            v_alert.id::text,
            jsonb_build_object(
              'metric', v_metric.metric_name,
              'threshold_percent', v_threshold,
              'current_value', v_metric.used_value,
              'limit_value', v_metric.allowed_value
            )
          );
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;

create or replace function public.mark_enterprise_usage_alert_notified(
  p_alert_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.enterprise_usage_alerts as alert
  set notification_sent_at = now(), updated_at = now()
  where alert.id = p_alert_id
    and alert.status = 'open'
    and alert.notification_sent_at is null;
  return found;
end;
$$;

revoke all on function public.evaluate_enterprise_usage_alerts_atomic(integer) from public, anon, authenticated;
revoke all on function public.mark_enterprise_usage_alert_notified(uuid) from public, anon, authenticated;
grant execute on function public.evaluate_enterprise_usage_alerts_atomic(integer) to service_role;
grant execute on function public.mark_enterprise_usage_alert_notified(uuid) to service_role;

notify pgrst, 'reload schema';

commit;
