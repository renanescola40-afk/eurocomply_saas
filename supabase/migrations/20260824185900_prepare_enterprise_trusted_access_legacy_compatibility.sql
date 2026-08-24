begin;

-- Compatibility bridge for environments that previously replayed the historical
-- Enterprise Access migrations. Production currently has none of these objects,
-- so every block is a no-op there. The bridge exists so full-history/staging
-- replay reaches the same canonical post-V20 shape without history repair.

do $operations$
begin
  if to_regclass('public.enterprise_access_operations') is not null then
    alter table public.enterprise_access_operations
      add column if not exists compensated_count integer not null default 0;

    drop policy if exists enterprise_access_operations_authenticated_select_deny on public.enterprise_access_operations;
    drop policy if exists enterprise_access_operations_authenticated_insert_deny on public.enterprise_access_operations;
    drop policy if exists enterprise_access_operations_authenticated_update_deny on public.enterprise_access_operations;
    drop policy if exists enterprise_access_operations_authenticated_delete_deny on public.enterprise_access_operations;
  end if;

  if to_regclass('public.enterprise_access_operation_items') is not null then
    drop policy if exists enterprise_access_operation_items_authenticated_select_deny on public.enterprise_access_operation_items;
    drop policy if exists enterprise_access_operation_items_authenticated_insert_deny on public.enterprise_access_operation_items;
    drop policy if exists enterprise_access_operation_items_authenticated_update_deny on public.enterprise_access_operation_items;
    drop policy if exists enterprise_access_operation_items_authenticated_delete_deny on public.enterprise_access_operation_items;
  end if;

  if to_regclass('public.enterprise_access_operation_events') is not null then
    drop policy if exists enterprise_access_operation_events_authenticated_select_deny on public.enterprise_access_operation_events;
    drop policy if exists enterprise_access_operation_events_authenticated_insert_deny on public.enterprise_access_operation_events;
    drop policy if exists enterprise_access_operation_events_authenticated_update_deny on public.enterprise_access_operation_events;
    drop policy if exists enterprise_access_operation_events_authenticated_delete_deny on public.enterprise_access_operation_events;
  end if;
end
$operations$;

do $snapshots$
begin
  if to_regclass('public.enterprise_access_runtime_snapshots') is not null then
    alter table public.enterprise_access_runtime_snapshots
      add column if not exists dead_letter_count integer not null default 0,
      add column if not exists processed_members integer not null default 0,
      add column if not exists failed_members integer not null default 0,
      add column if not exists compensated_members integer not null default 0,
      add column if not exists oldest_pending_age_seconds integer not null default 0;

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='enterprise_access_runtime_snapshots' and column_name='operations_dead_letter'
    ) then
      execute $sql$
        update public.enterprise_access_runtime_snapshots
        set dead_letter_count=coalesce(operations_dead_letter,0),
            processed_members=coalesce(members_processed,0),
            failed_members=coalesce(members_failed,0),
            compensated_members=coalesce(members_compensated,0),
            oldest_pending_age_seconds=coalesce(oldest_pending_seconds,0),
            success_rate=case when success_rate between 0 and 1 then success_rate*100 else success_rate end
      $sql$;
    end if;

    alter table public.enterprise_access_runtime_snapshots
      drop constraint if exists enterprise_access_runtime_snapshots_success_rate_check;
    alter table public.enterprise_access_runtime_snapshots
      alter column success_rate drop not null,
      alter column success_rate drop default;
    alter table public.enterprise_access_runtime_snapshots
      add constraint enterprise_access_runtime_snapshots_success_rate_check
      check(success_rate is null or success_rate between 0 and 100);

    drop policy if exists enterprise_access_runtime_snapshots_deny_delete on public.enterprise_access_runtime_snapshots;
  end if;
end
$snapshots$;

do $alerts$
begin
  if to_regclass('public.enterprise_access_runtime_alerts') is not null then
    alter table public.enterprise_access_runtime_alerts
      add column if not exists alert_type text,
      add column if not exists details jsonb not null default '{}'::jsonb;

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='enterprise_access_runtime_alerts' and column_name='title'
    ) then
      execute $sql$
        update public.enterprise_access_runtime_alerts
        set alert_type=coalesce(nullif(alert_type,''),title,alert_key),
            details=case when details='{}'::jsonb then coalesce(evidence,'{}'::jsonb) else details end
      $sql$;
    else
      update public.enterprise_access_runtime_alerts
      set alert_type=coalesce(nullif(alert_type,''),alert_key);
    end if;

    alter table public.enterprise_access_runtime_alerts
      alter column alert_type set not null;

    drop policy if exists enterprise_access_runtime_alerts_deny_delete on public.enterprise_access_runtime_alerts;
  end if;
end
$alerts$;

do $exports$
begin
  if to_regclass('public.enterprise_access_export_jobs') is not null then
    alter table public.enterprise_access_export_jobs
      add column if not exists download_count integer not null default 0,
      add column if not exists last_downloaded_at timestamptz;
    drop policy if exists enterprise_access_export_jobs_deny_delete on public.enterprise_access_export_jobs;
  end if;

  if to_regclass('public.enterprise_access_export_download_events') is not null then
    drop policy if exists enterprise_access_export_download_events_deny_delete on public.enterprise_access_export_download_events;
  end if;
end
$exports$;

do $seat_contention$
begin
  if to_regclass('public.enterprise_seat_contention_events') is not null then
    alter table public.enterprise_seat_contention_events
      drop constraint if exists enterprise_seat_contention_events_outcome_check;
    alter table public.enterprise_seat_contention_events
      add constraint enterprise_seat_contention_events_outcome_check
      check(outcome in (
        'reserved','capacity_exhausted','version_conflict','released','reconciled',
        'membership_not_found','contract_not_found'
      ));
    drop policy if exists enterprise_seat_contention_events_deny_delete on public.enterprise_seat_contention_events;
  end if;

  if to_regclass('public.enterprise_access_notifications') is not null then
    drop policy if exists enterprise_access_notifications_deny_delete on public.enterprise_access_notifications;
  end if;
end
$seat_contention$;

commit;
