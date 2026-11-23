-- Manual QA-only regression after independently reviewed DDL promotion.
-- DO NOT RUN ON PRODUCTION. READ ONLY; no Auth users, sessions, factors or data are changed.
-- SET LOCAL ROLE and fake request JWT claim settings are PostgreSQL simulations,
-- NOT signed HTTP/JWT authentication and NOT formal SEC-01 acceptance.
-- Execute only with QA project ref zrxrrfbllsxtleyxjpsz, then separately
-- validate actual signed login, AAL1->AAL2, logout/revocation, expired JWT,
-- Storage + protected API denial, and real owner/admin/member cross-tenant scope.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';

DO $qa_revocation$
DECLARE
  owner_org uuid;
  foreign_org uuid;
  supabase_actor uuid;
  clerk_actor text;
  own_aal1_count integer;
  own_stale_aal2_count integer;
  own_malformed_aal2_count integer;
  other_stale_aal2_count integer;
  legacy_aal2_count integer;
BEGIN
  SELECT m.organization_id, m.user_id, m.clerk_user_id
    INTO owner_org, supabase_actor, clerk_actor
  FROM public.organization_members m
  JOIN public.organization_security_settings s ON s.organization_id=m.organization_id
  JOIN auth.users u ON u.id=m.user_id
  WHERE m.status='active' AND s.require_mfa_for_all_users
    AND m.clerk_user_id IS NOT NULL
  ORDER BY m.organization_id,m.user_id LIMIT 1;

  SELECT id INTO foreign_org FROM public.organizations
    WHERE id<>owner_org ORDER BY id LIMIT 1;

  IF owner_org IS NULL OR supabase_actor IS NULL OR foreign_org IS NULL
    OR clerk_actor IS NULL
    OR EXISTS (
      SELECT 1 FROM auth.sessions
      WHERE id='00000000-0000-0000-0000-000000000000'::uuid
    ) THEN
    RAISE EXCEPTION 'sec01_qa_fixture_precondition_missing';
  END IF;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub',supabase_actor::text,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',
    pg_catalog.jsonb_build_object('sub',supabase_actor::text,'role','authenticated',
       'aal','aal1','session_id','00000000-0000-0000-0000-000000000000')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO own_aal1_count
    FROM public.organizations WHERE id=owner_org;
  EXECUTE 'RESET ROLE';

  PERFORM pg_catalog.set_config('request.jwt.claims',
    pg_catalog.jsonb_build_object('sub',supabase_actor::text,'role','authenticated',
       'aal','aal2','session_id','00000000-0000-0000-0000-000000000000')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO own_stale_aal2_count
    FROM public.organizations WHERE id=owner_org;
  SELECT count(*) INTO other_stale_aal2_count
    FROM public.organizations WHERE id=foreign_org;
  EXECUTE 'RESET ROLE';

  PERFORM pg_catalog.set_config('request.jwt.claims',
    pg_catalog.jsonb_build_object('sub',supabase_actor::text,'role','authenticated',
       'aal','aal2','session_id','invalid-session-id')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO own_malformed_aal2_count
    FROM public.organizations WHERE id=owner_org;
  EXECUTE 'RESET ROLE';

  -- Legacy non-UUID Clerk subjects must continue to use their old identity
  -- and AAL2 membership branch, not the Supabase sessions table.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub',clerk_actor,true);
  PERFORM pg_catalog.set_config('request.jwt.claims',
    pg_catalog.jsonb_build_object('sub',clerk_actor,'role','authenticated','aal','aal2')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO legacy_aal2_count
    FROM public.organizations WHERE id=owner_org;
  EXECUTE 'RESET ROLE';

  IF own_aal1_count<>0 OR own_stale_aal2_count<>0
      OR own_malformed_aal2_count<>0 OR other_stale_aal2_count<>0
      OR legacy_aal2_count<>1 THEN
    RAISE EXCEPTION 'sec01_qa_session_revocation_regression_failed'
      USING ERRCODE='42501';
  END IF;
END;
$qa_revocation$;

ROLLBACK;
-- Passing this transaction proves only the simulated PostgreSQL RLS contract.
