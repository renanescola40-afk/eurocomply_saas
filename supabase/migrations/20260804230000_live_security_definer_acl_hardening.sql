-- enterprise-migration-review: approved
-- Live Supabase advisor remediation captured on 2026-08-04.
-- This migration changes function configuration and privileges only; it does not
-- mutate application rows.

begin;

-- This legacy RPC deletes from auth.users and must never be client-callable.
alter function public.delete_user_account(uuid)
  set search_path = pg_catalog, auth;
revoke all on function public.delete_user_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;

-- Tenant-policy helpers remain available to authenticated policy evaluation,
-- but direct anonymous RPC execution is unnecessary and widens the attack surface.
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.has_org_role(uuid, text[]) from public, anon;
revoke all on function public.has_org_write_role(uuid) from public, anon;
revoke all on function public.live_rls_validation_is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.has_org_role(uuid, text[]) to authenticated, service_role;
grant execute on function public.has_org_write_role(uuid) to authenticated, service_role;
grant execute on function public.live_rls_validation_is_org_member(uuid) to authenticated, service_role;

-- Identity helpers are only used by authenticated tenant policies.
alter function public.current_jwt_subject()
  set search_path = pg_catalog;
alter function public.current_legacy_user_id()
  set search_path = pg_catalog, public;
alter function public.current_clerk_user_id()
  set search_path = pg_catalog, public;
revoke all on function public.current_jwt_subject() from public, anon;
revoke all on function public.current_legacy_user_id() from public, anon;
revoke all on function public.current_clerk_user_id() from public, anon;
grant execute on function public.current_jwt_subject() to authenticated, service_role;
grant execute on function public.current_legacy_user_id() to authenticated, service_role;
grant execute on function public.current_clerk_user_id() to authenticated, service_role;

-- Trigger functions are invoked by PostgreSQL, not through PostgREST RPC.
revoke all on function public.prevent_client_notification_scope_change() from public, anon, authenticated;
grant execute on function public.prevent_client_notification_scope_change() to service_role;

alter function public.set_ai_systems_updated_at()
  set search_path = pg_catalog, public;
alter function public.set_ai_incidents_updated_at()
  set search_path = pg_catalog, public;
revoke all on function public.set_ai_systems_updated_at() from public, anon, authenticated;
revoke all on function public.set_ai_incidents_updated_at() from public, anon, authenticated;
grant execute on function public.set_ai_systems_updated_at() to service_role;
grant execute on function public.set_ai_incidents_updated_at() to service_role;

commit;
