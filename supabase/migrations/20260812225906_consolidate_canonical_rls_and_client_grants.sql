begin;

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;
alter table public.monitoring_preferences enable row level security;
alter table public.monitoring_preferences force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.onboarding_activation_runs enable row level security;
alter table public.onboarding_activation_runs force row level security;
alter table public.ai_systems enable row level security;
alter table public.ai_systems force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
alter table public.invitations enable row level security;
alter table public.invitations force row level security;
alter table public.regulatory_updates enable row level security;
alter table public.regulatory_updates force row level security;
alter table public.organization_members enable row level security;
alter table public.organization_members force row level security;
alter table public.organizations enable row level security;
alter table public.organizations force row level security;

-- Remove legacy permissive policies that overlap or broaden the canonical policy set.
drop policy if exists "Owners can manage subscriptions" on public.subscriptions;
drop policy if exists "Members can view subscriptions" on public.subscriptions;

drop policy if exists live_rls_monitoring_preferences_delete_member on public.monitoring_preferences;
drop policy if exists live_rls_monitoring_preferences_insert_member on public.monitoring_preferences;
drop policy if exists live_rls_monitoring_preferences_select_member on public.monitoring_preferences;
drop policy if exists live_rls_monitoring_preferences_update_member on public.monitoring_preferences;

drop policy if exists live_rls_notifications_delete_member on public.notifications;
drop policy if exists live_rls_notifications_insert_member on public.notifications;
drop policy if exists live_rls_notifications_select_member on public.notifications;
drop policy if exists live_rls_notifications_update_member on public.notifications;

drop policy if exists live_rls_onboarding_activation_runs_delete_member on public.onboarding_activation_runs;
drop policy if exists live_rls_onboarding_activation_runs_insert_member on public.onboarding_activation_runs;
drop policy if exists live_rls_onboarding_activation_runs_select_member on public.onboarding_activation_runs;
drop policy if exists live_rls_onboarding_activation_runs_update_member on public.onboarding_activation_runs;

drop policy if exists "Owners and admins can delete AI systems" on public.ai_systems;
drop policy if exists "Editors can insert AI systems" on public.ai_systems;
drop policy if exists "Members can read AI systems" on public.ai_systems;
drop policy if exists "Editors can update AI systems" on public.ai_systems;

drop policy if exists live_rls_audit_events_delete_deny on public.audit_events;
drop policy if exists live_rls_audit_events_insert_deny on public.audit_events;
drop policy if exists live_rls_audit_events_select_member on public.audit_events;
drop policy if exists live_rls_audit_events_update_deny on public.audit_events;

drop policy if exists "Members can view audit logs" on public.audit_logs;

drop policy if exists live_rls_invitations_delete_deny on public.invitations;
drop policy if exists live_rls_invitations_insert_deny on public.invitations;
drop policy if exists live_rls_invitations_select_member on public.invitations;
drop policy if exists live_rls_invitations_update_deny on public.invitations;

drop policy if exists live_rls_regulatory_updates_delete_deny on public.regulatory_updates;
drop policy if exists live_rls_regulatory_updates_insert_deny on public.regulatory_updates;
drop policy if exists live_rls_regulatory_updates_select_authenticated on public.regulatory_updates;
drop policy if exists live_rls_regulatory_updates_update_deny on public.regulatory_updates;

drop policy if exists "Users can view their memberships" on public.organization_members;
drop policy if exists "Users can view their organizations" on public.organizations;

-- Align SQL grants with the canonical RLS contract. Remove admin-like table privileges from client roles.
revoke all on table public.subscriptions from PUBLIC, anon, authenticated;
grant select on table public.subscriptions to authenticated;

revoke all on table public.monitoring_preferences from PUBLIC, anon, authenticated;
grant select, insert, update, delete on table public.monitoring_preferences to authenticated;

revoke all on table public.notifications from PUBLIC, anon, authenticated;
grant select, update, delete on table public.notifications to authenticated;

revoke all on table public.onboarding_activation_runs from PUBLIC, anon, authenticated;
grant select, insert, update, delete on table public.onboarding_activation_runs to authenticated;

revoke all on table public.ai_systems from PUBLIC, anon, authenticated;
grant select, insert, update, delete on table public.ai_systems to authenticated;

revoke all on table public.audit_events from PUBLIC, anon, authenticated;
grant select on table public.audit_events to authenticated;

revoke all on table public.audit_logs from PUBLIC, anon, authenticated;
grant select on table public.audit_logs to authenticated;

revoke all on table public.invitations from PUBLIC, anon, authenticated;
grant select on table public.invitations to authenticated;

revoke all on table public.regulatory_updates from PUBLIC, anon, authenticated;
grant select on table public.regulatory_updates to authenticated;

revoke all on table public.organization_members from PUBLIC, anon, authenticated;
grant select on table public.organization_members to authenticated;

revoke all on table public.organizations from PUBLIC, anon, authenticated;
grant select, update on table public.organizations to authenticated;

-- Fail closed if legacy policies survived, canonical policies disappeared, or client grants exceed the contract.
do $$
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
  )
  select count(*) into missing_policy_count
  from required r
  where not exists (
    select 1 from pg_policies p
    where p.schemaname='public' and p.tablename=r.tablename and p.policyname=r.policyname
  );
  if missing_policy_count <> 0 then
    raise exception 'canonical RLS policy missing after consolidation: %', missing_policy_count;
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
end $$;

commit;
