-- RISCK COMPLY / #2754 + #2764 — SOURCE REVIEW ONLY, NOT AN APPLIED MIGRATION.
-- DO NOT execute on QA or Production until independent Security/Database approval.
-- On approval: create a new versioned migration with the Supabase CLI; first
-- verify signed QA tokens include session_id and rehearse rollback in QA.
--
-- Intended only as a narrow AAL1 pre-MFA policy-discovery RPC. It returns the
-- requesting signed-in user's own active organization UUID and MFA-required flag,
-- nothing about names, roles, subscriptions, users, or other tenants.
-- PostgreSQL checks below do not themselves validate a JWT's cryptographic
-- signature: PostgREST/Supabase Auth MUST authenticate the bearer before RPC.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_mfa_bootstrap_context()
RETURNS TABLE (organization_id uuid, require_mfa_for_all_users boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $mfa_bootstrap$
DECLARE
  actor_id uuid;
  actor_session_id uuid;
  context_rows integer;
BEGIN
  actor_id := auth.uid();
  IF actor_id IS NULL
     OR COALESCE(auth.jwt() ->> 'role', '') <> 'authenticated'
     OR COALESCE(auth.jwt() ->> 'is_anonymous', 'false') <> 'false'
  THEN
    RAISE EXCEPTION 'mfa_bootstrap_unauthorized' USING ERRCODE = '42501';
  END IF;

  -- A signed JWT can remain valid until exp after logout. Enforce the live
  -- session row for this sensitive pre-MFA discovery operation.
  IF COALESCE(auth.jwt() ->> 'session_id', '') = '' THEN
    RAISE EXCEPTION 'mfa_bootstrap_session_unavailable' USING ERRCODE = '42501';
  END IF;
  BEGIN
    actor_session_id := (auth.jwt() ->> 'session_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'mfa_bootstrap_session_unavailable' USING ERRCODE = '42501';
  END;

  IF NOT EXISTS (
    SELECT 1 FROM auth.sessions AS s
    WHERE s.id = actor_session_id AND s.user_id = actor_id
      AND (s.not_after IS NULL OR s.not_after > pg_catalog.now())
  ) THEN
    RAISE EXCEPTION 'mfa_bootstrap_session_unavailable' USING ERRCODE = '42501';
  END IF;

  -- A missing policy for an otherwise eligible active membership is an
  -- unavailable security control; NEVER interpret it as MFA not required.
  IF EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    LEFT JOIN public.organization_security_settings AS settings
      ON settings.organization_id = m.organization_id
    WHERE m.user_id = actor_id
      AND pg_catalog.lower(pg_catalog.btrim(m.status)) = 'active'
      AND pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(m.role), '^org:', '', 'i'))
          = ANY (ARRAY[
            'owner','proprietario','proprietário','dono',
            'admin','administrator','administrador',
            'editor','manager','gestor','compliance-manager','compliance_manager','compliance manager',
            'member','membro','viewer','visualizador','read_only','readonly','leitor'
          ])
      AND (settings.organization_id IS NULL OR settings.require_mfa_for_all_users IS NULL)
  ) THEN
    RAISE EXCEPTION 'mfa_bootstrap_policy_unavailable' USING ERRCODE = 'P0001';
  END IF;

  -- Return at most 20 distinct own tenants. Fail rather than silently truncate.
  RETURN QUERY
    SELECT DISTINCT m.organization_id, settings.require_mfa_for_all_users
    FROM public.organization_members AS m
    JOIN public.organization_security_settings AS settings
      ON settings.organization_id = m.organization_id
    WHERE m.user_id = actor_id
      AND pg_catalog.lower(pg_catalog.btrim(m.status)) = 'active'
      AND pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(m.role), '^org:', '', 'i'))
          = ANY (ARRAY[
            'owner','proprietario','proprietário','dono',
            'admin','administrator','administrador',
            'editor','manager','gestor','compliance-manager','compliance_manager','compliance manager',
            'member','membro','viewer','visualizador','read_only','readonly','leitor'
          ])
    ORDER BY m.organization_id LIMIT 21;
  GET DIAGNOSTICS context_rows = ROW_COUNT;
  IF context_rows > 20 THEN
    RAISE EXCEPTION 'mfa_bootstrap_too_many_organizations' USING ERRCODE = 'P0001';
  END IF;
END;
$mfa_bootstrap$;

-- Explicitly revoke default PUBLIC EXECUTE in the same transaction in which
-- the function is created. No existing broad/privileged RPC grants change.
REVOKE ALL ON FUNCTION public.get_my_mfa_bootstrap_context()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_mfa_bootstrap_context()
  TO authenticated;

COMMENT ON FUNCTION public.get_my_mfa_bootstrap_context() IS
  'Review-only source candidate #2754/#2764: signed user-bound AAL1 own-tenant MFA policy discovery; no privileges for anon';
COMMIT;
