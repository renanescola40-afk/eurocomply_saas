-- RISCK COMPLY / SEC-01 + SEC-03
-- QA-ONLY FORWARD REMEDIATION CANDIDATE — NEVER AUTOMATICALLY APPLY.
-- Requires independent qualified Security/DB review, approved QA-only DDL,
-- DAT-01 migration provenance decision, a versioned migration, and rollback plan.
-- DO NOT EXECUTE ON PRODUCTION.
--
-- Provider observation in isolated QA zrxrrfbllsxtleyxjpsz, 2026-11-23:
-- public.tenant_mfa_satisfied(uuid) checks JWT aal2 but not live auth.sessions.
-- READ ONLY, SET LOCAL ROLE authenticated demonstrated that an own-tenant
-- org could be read using synthetic aal2 claims with a non-existent session.
-- This SQL test is not signed-HTTP/JWT proof and provides no runtime PASS.
--
-- Existing Clerk compatibility is intentional: non-UUID Clerk subjects cannot
-- be joined to Supabase auth.sessions; preserve the legacy branch and its
-- existing tenant MFA requirement until separately reviewed retirement.
-- Supabase UUID identities MUST have an extant session bound to the same
-- user regardless of whether tenant policy is mandatory or optional.
--
-- Does not create users, sessions, tables or public RPC privileges.
BEGIN;

DO $preflight$
DECLARE
  predicate_oid oid := to_regprocedure('public.tenant_mfa_satisfied(uuid)');
BEGIN
  IF predicate_oid IS NULL
      OR to_regclass('auth.sessions') IS NULL
      OR to_regprocedure('public.current_legacy_user_id()') IS NULL
      OR to_regprocedure('public.current_clerk_user_id()') IS NULL
      OR to_regclass('public.organization_security_settings') IS NULL THEN
    RAISE EXCEPTION 'sec01_revocation_missing_dependencies' USING ERRCODE='42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid=predicate_oid AND p.prosecdef
      AND pg_catalog.pg_get_userbyid(p.proowner)='postgres'
  ) THEN
    RAISE EXCEPTION 'sec01_revocation_unexpected_function_authority' USING ERRCODE='42501';
  END IF;

  IF has_function_privilege('anon',predicate_oid,'EXECUTE')
      OR has_function_privilege('authenticated',predicate_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'sec01_revocation_unexpected_direct_grant' USING ERRCODE='42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='auth' AND table_name='sessions'
      AND column_name='not_after'
  ) THEN
    RAISE EXCEPTION 'sec01_revocation_missing_session_expiration' USING ERRCODE='42501';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.tenant_mfa_satisfied(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $predicate$
  SELECT target_organization_id IS NOT NULL
    AND CASE
      WHEN public.current_legacy_user_id() IS NOT NULL THEN
        -- The Auth user id is the trusted, UUID-form JWT subject as already
        -- resolved by the existing current_legacy_user_id() helper.
        COALESCE(auth.jwt() ->> 'role', '') = 'authenticated'
        AND COALESCE(auth.jwt() ->> 'is_anonymous', 'false') = 'false'
        AND CASE
          -- Explicit CASE ensures malformed session ids never reach ::uuid.
          WHEN COALESCE(auth.jwt() ->> 'session_id', '') ~*
            '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN EXISTS (
            SELECT 1 FROM auth.sessions AS s
            WHERE s.id = (auth.jwt() ->> 'session_id')::uuid
              AND s.user_id = public.current_legacy_user_id()
              AND (s.not_after IS NULL OR s.not_after > pg_catalog.now())
          )
          ELSE false
        END
      WHEN public.current_clerk_user_id() IS NOT NULL THEN
        -- Preserve historical non-UUID Clerk subjects; use their pre-existing
        -- membership + aal2 predicates. Do not invent Supabase sessions.
        true
      ELSE false
    END
    AND EXISTS (
      SELECT 1
      FROM public.organization_security_settings AS oss
      WHERE oss.organization_id = target_organization_id
        AND (
          NOT oss.require_mfa_for_all_users
          OR COALESCE(auth.jwt() ->> 'aal', '') = 'aal2'
        )
    );
$predicate$;

DO $postflight$
DECLARE predicate_oid oid := to_regprocedure('public.tenant_mfa_satisfied(uuid)');
BEGIN
  IF predicate_oid IS NULL
      OR has_function_privilege('anon',predicate_oid,'EXECUTE')
      OR has_function_privilege('authenticated',predicate_oid,'EXECUTE')
      OR NOT has_function_privilege('service_role',predicate_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'sec01_revocation_acl_postcondition_failed' USING ERRCODE='42501';
  END IF;
END;
$postflight$;

COMMIT;
