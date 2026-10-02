begin;

-- Historical clean-replay compatibility.
-- Several creator migrations for these evolved runtime tables are not represented
-- in the production migration ledger. Harden every object that exists and keep
-- its canonical policy/grant postconditions fail-closed; legitimately absent
-- objects are left for the later forward-reconciliation chain.
do $canonical_rls_apply$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'subscriptions',
    'monitoring_preferences',
    'notifications',
    'onboarding_activation_runs',
    'ai_systems',
    'audit_events',
    'audit_logs',
    'invitations',
    'regulatory_updates',
    'organization_members',
    'organizations'
  ] loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('alter table public.%I force row level security', target_table);
    end if;
  end loop;

  for target_table, policy_name in
    select * from (values
      ('subscriptions','Owners can manage subscriptions'),
      ('subscriptions','Members can view subscriptions'),
      ('monitoring_preferences','live_rls_monitoring_preferences_delete_member'),
      ('monitoring_preferences','live_rls_monitoring_preferences_insert_member'),
      ('monitoring_preferences','live_rls_monitoring_preferences_select_member'),
      ('monitoring_preferences','live_rls_monitoring_preferences_update_member'),
      ('notifications','live_rls_notifications_delete_member'),
      ('notifications','live_rls_notifications_insert_member'),
      ('notifications','live_rls_notifications_select_member'),
      ('notifications','live_rls_notifications_update_member'),
      ('onboarding_activation_runs','live_rls_onboarding_activation_runs_delete_member'),
      ('onboarding_activation_runs','live_rls_onboarding_activation_runs_insert_member'),
      ('onboarding_activation_runs','live_rls_onboarding_activation_runs_select_member'),
      ('onboarding_activation_runs','live_rls_onboarding_activation_runs_update_member'),
      ('ai_systems','Owners and admins can delete AI systems'),
      ('ai_systems','Editors can insert AI systems'),
      ('ai_systems','Members can read AI systems'),
      ('ai_systems','Editors can update AI systems'),
      ('audit_events','live_rls_audit_events_delete_deny'),
      ('audit_events','live_rls_audit_events_insert_deny'),
      ('audit_events','live_rls_audit_events_select_member'),
      ('audit_events','live_rls_audit_events_update_deny'),
      ('audit_logs','Members can view audit logs'),
      ('invitations','live_rls_invitations_delete_deny'),
      ('invitations','live_rls_invitations_insert_deny'),
      ('invitations','live_rls_invitations_select_member'),
      ('invitations','live_rls_invitations_update_deny'),
      ('regulatory_updates','live_rls_regulatory_updates_delete_deny'),
      ('regulatory_updates','live_rls_regulatory_updates_insert_deny'),
      ('regulatory_updates','live_rls_regulatory_updates_select_authenticated'),
      ('regulatory_updates','live_rls_regulatory_updates_update_deny'),
      ('organization_members','Users can view their memberships'),
      ('organizations','Users can view their organizations')
    ) as legacy(table_name, policy_name)
  loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    end if;
  end loop;

  if to_regclass('public.subscriptions') is not null then
    execute 'revoke all on table public.subscriptions from PUBLIC, anon, authenticated';
    execute 'grant select on table public.subscriptions to authenticated';
  end if;

  if to_regclass('public.monitoring_preferences') is not null then
    execute 'revoke all on table public.monitoring_preferences from PUBLIC, anon, authenticated';
    execute 'grant select, insert, update, delete on table public.monitoring_preferences to authenticated';
  end if;

  if to_regclass('public.notifications') is not null then
    execute 'revoke all on table public.notifications from PUBLIC, anon, authenticated';
    execute 'grant select, update, delete on table public.notifications to authenticated';
  end if;

  if to_regclass('public.onboarding_activation_runs') is not null then
    execute 'revoke all on table public.onboarding_activation_runs from PUBLIC, anon, authenticated';
    execute 'grant select, insert, update, delete on table public.onboarding_activation_runs to authenticated';
  end if;

  if to_regclass('public.ai_systems') is not null then
    execute 'revoke all on table public.ai_systems from PUBLIC, anon, authenticated';
    execute 'grant select, insert, update, delete on table public.ai_systems to authenticated';
  end if;

  if to_regclass('public.audit_events') is not null then
    execute 'revoke all on table public.audit_events from PUBLIC, anon, authenticated';
    execute 'grant select on table public.audit_events to authenticated';
  end if;

  if to_regclass('public.audit_logs') is not null then
    execute 'revoke all on table public.audit_logs from PUBLIC, anon, authenticated';
    execute 'grant select on table public.audit_logs to authenticated';
  end if;

  if to_regclass('public.invitations') is not null then
    execute 'revoke all on table public.invitations from PUBLIC, anon, authenticated';
    execute 'grant select on table public.invitations to authenticated';
  end if;

  if to_regclass('public.regulatory_updates') is not null then
    execute 'revoke all on table public.regulatory_updates from PUBLIC, anon, authenticated';
    execute 'grant select on table public.regulatory_updates to authenticated';
  end if;

  if to_regclass('public.organization_members') is not null then
    execute 'revoke all on table public.organization_members from PUBLIC, anon, authenticated';
    execute 'grant select on table public.organization_members to authenticated';
  end if;

  if to_regclass('public.organizations') is not null then
    execute 'revoke all on table public.organizations from PUBLIC, anon, authenticated';
    execute 'grant select, update on table public.organizations to authenticated';
  end if;
end
$canonical_rls_apply$;

-- Fail closed for every object that actually exists at this historical replay point.
-- A table whose canonical policy catalog is still completely unmaterialized (0/N)
-- is a legitimate historical state; once any canonical policy exists, the entire
-- table-specific catalog must be complete, otherwise replay fails closed.
do $canonical_rls_guard$
declare
  missing_policy_count integer;
  legacy_policy_count integer;
  unexpected_grant_count integer;
begin
  select count(*) into legacy_policy_count
  from pg_policies
  where schemaname = 'public'
    and (
      (tablename = 'subscriptions' and policyname in ('Owners can manage subscriptions','Members can view subscriptions'))
      or policyname like 'live_rls_monitoring_preferences_%'
      or policyname like 'live_rls_notifications_%'
      or policyname like 'live_rls_onboarding_activation_runs_%'
      or (tablename = 'ai_systems' and policyname in ('Owners and admins can delete AI systems','Editors can insert AI systems','Members can read AI systems','Editors can update AI systems'))
      or policyname like 'live_rls_audit_events_%'
      or (tablename = 'audit_logs' and policyname = 'Members can view audit logs')
      or policyname like 'live_rls_invitations_%'
      or policyname like 'live_rls_regulatory_updates_%'
      or (tablename = 'organization_members' and policyname = 'Users can view their memberships')
      or (tablename = 'organizations' and policyname = 'Users can view their organizations')
    );
  if legacy_policy_count <> 0 then
    raise exception 'legacy permissive policies survived canonical RLS consolidation: %', legacy_policy_count;
  end if;

  with required(tablename, policyname) as (
    values
      ('subscriptions','rls_subscriptions_select_member'),
      ('subscriptions','rls_subscriptions_insert_backend_only'),
      ('subscriptions','rls_subscriptions_update_backend_only'),
      ('subscriptions','rls_subscriptions_delete_backend_only'),
      ('monitoring_preferences','rls_monitoring_preferences_select_member_or_owner'),
      ('monitoring_preferences','rls_monitoring_preferences_insert_self_or_admin'),
      ('monitoring_preferences','rls_monitoring_preferences_update_self_or_admin'),
      ('monitoring_preferences','rls_monitoring_preferences_delete_self_or_admin'),
      ('notifications','rls_notifications_select_recipient'),
      ('notifications','rls_notifications_insert_backend_only'),
      ('notifications','rls_notifications_update_recipient'),
      ('notifications','rls_notifications_delete_recipient'),
      ('onboarding_activation_runs','rls_onboarding_activation_runs_select_member'),
      ('onboarding_activation_runs','rls_onboarding_activation_runs_insert_writer'),
      ('onboarding_activation_runs','rls_onboarding_activation_runs_update_writer'),
      ('onboarding_activation_runs','rls_onboarding_activation_runs_delete_admin'),
      ('ai_systems','rls_ai_systems_select_member'),
      ('ai_systems','rls_ai_systems_insert_writer'),
      ('ai_systems','rls_ai_systems_update_writer'),
      ('ai_systems','rls_ai_systems_delete_admin'),
      ('audit_events','rls_audit_events_select_member'),
      ('audit_events','rls_audit_events_insert_backend_only'),
      ('audit_events','rls_audit_events_update_backend_only'),
      ('audit_events','rls_audit_events_delete_backend_only'),
      ('audit_logs','rls_audit_logs_select_member'),
      ('audit_logs','rls_audit_logs_insert_backend_only'),
      ('audit_logs','rls_audit_logs_update_backend_only'),
      ('audit_logs','rls_audit_logs_delete_backend_only'),
      ('invitations','rls_invitations_select_member'),
      ('invitations','rls_invitations_insert_backend_only'),
      ('invitations','rls_invitations_update_backend_only'),
      ('invitations','rls_invitations_delete_backend_only'),
      ('regulatory_updates','rls_regulatory_updates_select_authenticated'),
      ('regulatory_updates','rls_regulatory_updates_insert_backend_only'),
      ('regulatory_updates','rls_regulatory_updates_update_backend_only'),
      ('regulatory_updates','rls_regulatory_updates_delete_backend_only'),
      ('organization_members','rls_organization_members_select_member'),
      ('organization_members','rls_organization_members_insert_backend_only'),
      ('organization_members','rls_organization_members_update_backend_only'),
      ('organization_members','rls_organization_members_delete_backend_only'),
      ('organizations','Members can view organizations'),
      ('organizations','Owners can update organizations')
  ), materialized as (
    select distinct r.tablename
    from required r
    join pg_policies p
      on p.schemaname='public'
     and p.tablename=r.tablename
     and p.policyname=r.policyname
  )
  select count(*) into missing_policy_count
  from required r
  join materialized m on m.tablename=r.tablename
  where to_regclass(format('public.%I', r.tablename)) is not null
    and not exists (
      select 1 from pg_policies p
      where p.schemaname='public' and p.tablename=r.tablename and p.policyname=r.policyname
    );
  if missing_policy_count <> 0 then
    raise exception 'canonical RLS policy missing after partial materialization: %', missing_policy_count;
  end if;

  select count(*) into unexpected_grant_count
  from information_schema.table_privileges p
  where p.table_schema='public'
    and p.table_name in ('subscriptions','monitoring_preferences','notifications','onboarding_activation_runs','ai_systems','audit_events','audit_logs','invitations','regulatory_updates','organization_members','organizations')
    and p.grantee in ('PUBLIC','anon','authenticated')
    and not (
      p.grantee='authenticated' and (
        (p.table_name in ('subscriptions','audit_events','audit_logs','invitations','regulatory_updates','organization_members') and p.privilege_type='SELECT')
        or (p.table_name='notifications' and p.privilege_type in ('SELECT','UPDATE','DELETE'))
        or (p.table_name in ('monitoring_preferences','onboarding_activation_runs','ai_systems') and p.privilege_type in ('SELECT','INSERT','UPDATE','DELETE'))
        or (p.table_name='organizations' and p.privilege_type in ('SELECT','UPDATE'))
      )
    );
  if unexpected_grant_count <> 0 then
    raise exception 'unexpected client table privileges survived canonical RLS consolidation: %', unexpected_grant_count;
  end if;
end
$canonical_rls_guard$;

commit;
