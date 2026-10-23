-- QA ONLY. Source-derived structural creator reconciliation for historical step 48.
-- Sources: supabase/migrations/20260619191500_organization_security_settings.sql
--          supabase/migrations/20260626120000_clerk_uuid_safe_rls_helpers.sql
--          supabase/migrations/20260924142500_tenant_wide_mfa_terminal.sql
-- Function semantics cross-checked against live metadata on 2026-10-23.
-- Execute only in previously verified empty isolated QA, strictly inside BEGIN/ROLLBACK.
-- Not a production migration, not an authorization to reset history or widen RLS.

DO $g1_identity_guard$
BEGIN
 IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM storage.objects) THEN
   RAISE EXCEPTION 'QA48 identity prerequisite must never run with Auth users/storage objects';
 END IF;
 IF to_regclass('public.organizations') IS NULL OR to_regclass('public.organization_members') IS NULL THEN
   RAISE EXCEPTION 'QA48 organizational tables required before identity prerequisites';
 END IF;
 IF to_regclass('public.organization_security_settings') IS NOT NULL THEN
   RAISE EXCEPTION 'QA48 refusal: security settings already present, require versioned reconciliation';
 END IF;
 IF to_regprocedure('public.current_legacy_user_id()') IS NOT NULL
    OR to_regprocedure('public.current_clerk_user_id()') IS NOT NULL
    OR to_regprocedure('public.tenant_mfa_satisfied(uuid)') IS NOT NULL THEN
   RAISE EXCEPTION 'QA48 refusal: unexpected preexisting identity/MFA functions';
 END IF;
END $g1_identity_guard$;

-- Historical organization-scoped schema including terminal tenant-wide MFA column.
CREATE TABLE public.organization_security_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  require_step_up_for_critical_actions boolean NOT NULL DEFAULT true,
  step_up_provider_mode text NOT NULL DEFAULT 'supabase_mfa_or_enterprise_idp'
    CHECK (step_up_provider_mode IN ('supabase_mfa','enterprise_idp','supabase_mfa_or_enterprise_idp')),
  allowed_idp_acr_values text[] NOT NULL DEFAULT '{}'::text[],
  allowed_idp_amr_values text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_security_settings_idp_policy_required CHECK (
    step_up_provider_mode <> 'enterprise_idp'
    OR cardinality(allowed_idp_acr_values) > 0
    OR cardinality(allowed_idp_amr_values) > 0
  ),
  require_mfa_for_all_users boolean NOT NULL DEFAULT false
);
ALTER TABLE public.organization_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_security_settings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_security_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organization_security_settings TO service_role;

CREATE POLICY organization_security_settings_client_select_deny
  ON public.organization_security_settings FOR SELECT TO authenticated USING (false);
CREATE POLICY organization_security_settings_client_insert_deny
  ON public.organization_security_settings FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY organization_security_settings_client_update_deny
  ON public.organization_security_settings FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY organization_security_settings_client_delete_deny
  ON public.organization_security_settings FOR DELETE TO authenticated USING (false);

-- UUID-safe helpers: fail closed when JWT subject missing or not a proper UUID.
CREATE FUNCTION public.current_jwt_subject()
RETURNS text LANGUAGE sql STABLE SET search_path = pg_catalog, public
AS $jwt$ SELECT nullif(coalesce(
  current_setting('request.jwt.claim.sub', true),
  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
), '') $jwt$;

CREATE FUNCTION public.current_legacy_user_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path = pg_catalog, public
AS $legacy$ SELECT CASE WHEN public.current_jwt_subject()
  ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN public.current_jwt_subject()::uuid ELSE NULL END $legacy$;

CREATE FUNCTION public.current_clerk_user_id()
RETURNS text LANGUAGE sql STABLE SET search_path = pg_catalog, public
AS $clerk$ SELECT CASE
  WHEN public.current_jwt_subject() IS NULL THEN NULL
  WHEN public.current_jwt_subject() ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN NULL
  ELSE public.current_jwt_subject() END $clerk$;

REVOKE ALL ON FUNCTION public.current_jwt_subject() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_legacy_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_clerk_user_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_jwt_subject() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_legacy_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_clerk_user_id() TO authenticated;

-- Tenant-wide MFA is not bypassed: require aal2 when tenant setting demands MFA.
CREATE FUNCTION public.tenant_mfa_satisfied(target_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $mfa$ SELECT target_organization_id IS NOT NULL
  AND (coalesce((SELECT NOT oss.require_mfa_for_all_users
    FROM public.organization_security_settings oss
    WHERE oss.organization_id = target_organization_id), true)
   OR coalesce(auth.jwt() ->> 'aal','')='aal2') $mfa$;
REVOKE ALL ON FUNCTION public.tenant_mfa_satisfied(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_mfa_satisfied(uuid) TO authenticated, service_role;

DO $g1_identity_post$
BEGIN
 IF to_regprocedure('public.current_jwt_subject()') IS NULL OR
  to_regprocedure('public.current_legacy_user_id()') IS NULL OR
  to_regprocedure('public.current_clerk_user_id()') IS NULL OR
  to_regprocedure('public.tenant_mfa_satisfied(uuid)') IS NULL THEN
   RAISE EXCEPTION 'QA48 missing verified identity/MFA prerequisite';
 END IF;
 IF has_table_privilege('authenticated','public.organization_security_settings','SELECT')
    OR has_function_privilege('anon','public.tenant_mfa_satisfied(uuid)','EXECUTE')
    OR NOT (SELECT p.prosecdef FROM pg_proc p WHERE p.oid='public.tenant_mfa_satisfied(uuid)'::regprocedure) THEN
   RAISE EXCEPTION 'QA48 privilege or MFA protection not canonical';
 END IF;
END $g1_identity_post$;
-- No COMMIT. The controlling QA replay MUST ROLLBACK.
