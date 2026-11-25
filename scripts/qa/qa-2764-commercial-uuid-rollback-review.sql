-- #2764: REVIEW CANDIDATE ONLY. Isolated QA zrxrrfbllsxtleyxjpsz.
-- Adapted from tests/security/commercial-authority-caller-scope-qa-rollback.sql
-- blob f5a2e628488a78b5013c4d2088a7540fbeaf6861; original Clerk fixture obsolete.
-- Synthetic contract-shaped rows, NOT real contracts, payments, subscriptions,
-- entitlement approval, JWT proof or a fixture accessible to HTTP requests.
-- Independently review this exact file before executing. Never COMMIT.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='20s';
DO $fixture$
DECLARE o record; actor uuid; source_id uuid; idx integer:=0; plan text;
BEGIN
 IF current_user<>'postgres' OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261120134634','20261120134701'))<>2
 OR (SELECT count(*) FROM public.organizations)<>2
 OR (SELECT count(*) FROM auth.users)<>5
 OR (SELECT count(*) FROM public.organization_security_settings WHERE require_mfa_for_all_users)<>2
 OR (SELECT count(*) FROM public.enterprise_entitlement_sources)<>0
 OR (SELECT count(*) FROM public.enterprise_entitlement_snapshots)<>0
 OR (SELECT count(*) FROM public.subscriptions)<>0
 OR (SELECT count(*) FROM public.stripe_events_processed)<>0
 OR EXISTS(SELECT 1 FROM public.organizations WHERE app_private.resolve_commercial_plan(id) IS NOT NULL)
 OR (SELECT count(DISTINCT m.organization_id) FROM public.organization_members m JOIN auth.users u ON u.id=m.user_id WHERE m.status='active')<>2
 OR EXISTS(SELECT 1 FROM public.organization_members WHERE status='active' AND user_id IS NOT NULL GROUP BY user_id HAVING count(DISTINCT organization_id)>1)
 OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.enterprise_entitlement_sources'::regclass AND NOT tgisinternal AND tgenabled<>'D')
 OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.enterprise_entitlement_snapshots'::regclass AND NOT tgisinternal AND tgenabled<>'D')<>1
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.enterprise_entitlement_snapshots'::regclass AND tgname='enterprise_entitlement_snapshot_freshness_guard' AND tgfoid=to_regprocedure('public.reject_stale_enterprise_entitlement_snapshot()') AND tgenabled<>'D')
 OR encode(sha256(convert_to(pg_get_functiondef(to_regprocedure('public.reject_stale_enterprise_entitlement_snapshot()')),'UTF8')),'hex') IS DISTINCT FROM '2dc61d58a1e73cb3c376836df9723f6804983c7fcc6f72d85c1073f232c7c0cb'
 OR encode(sha256(convert_to(pg_get_functiondef(to_regprocedure('app_private.resolve_commercial_plan(uuid)')),'UTF8')),'hex') IS DISTINCT FROM '36186b8f0b95bf3232bfab6b086f3bf88911c53365e9fd688f58f21f50e4451d'
 THEN RAISE EXCEPTION 'QA_COMMERCIAL_FIXTURE_PREFLIGHT_REFUSED'; END IF;
 FOR o IN SELECT id FROM public.organizations ORDER BY id LOOP
  idx:=idx+1;
  SELECT m.user_id INTO STRICT actor FROM public.organization_members m JOIN auth.users u ON u.id=m.user_id WHERE m.organization_id=o.id AND m.status='active' ORDER BY m.id LIMIT 1;
  plan:=CASE WHEN idx=1 THEN 'starter' ELSE 'business' END;
  INSERT INTO public.enterprise_entitlement_sources(organization_id,source_kind,external_reference,priority,active,version,effective_from)
  VALUES(o.id,'signed_contract','QA_SYNTHETIC_NOT_A_CONTRACT_ROLLBACK_ONLY_2764',900,true,1,now()-interval '3 minutes') RETURNING id INTO source_id;
  INSERT INTO public.enterprise_entitlement_snapshots(organization_id,source_id,idempotency_key,source_version,plan_code,full_seat_limit,participant_seat_limit,viewer_seat_limit,entitlements,source_payload_sha256,observed_at,valid_from,status,applied_policy_version)
  VALUES(o.id,source_id,'qa-2764-rollback-only-'||idx,1,plan,1,1,1,'{"qa_ephemeral":true,"no_real_contract_or_payment":true}'::jsonb,encode(sha256(convert_to('QA_SYNTHETIC_NOT_A_CONTRACT_2764_'||idx,'UTF8')),'hex'),now()-interval '1 minute',now()-interval '3 minutes','applied',1);
  IF app_private.resolve_commercial_plan(o.id) IS DISTINCT FROM plan THEN RAISE EXCEPTION 'QA_COMMERCIAL_RESOLVER_POSITIVE_FAILED'; END IF;
  PERFORM set_config('risck_qa.commercial_org_'||idx,o.id::text,true);
  PERFORM set_config('risck_qa.commercial_actor_'||idx,actor::text,true);
 END LOOP;
 IF idx<>2 THEN RAISE EXCEPTION 'QA_FIXTURE_COUNT'; END IF;
END $fixture$;
SET LOCAL ROLE authenticated;
DO $assert$
DECLARE i integer; own_org uuid; foreign_org uuid; actor uuid; expected_plan text; n int:=0;
BEGIN
 IF current_user<>'authenticated' THEN RAISE EXCEPTION 'QA_WRONG_ROLE'; END IF;
 FOR i IN 1..2 LOOP
  own_org:=current_setting('risck_qa.commercial_org_'||i)::uuid;
  foreign_org:=current_setting('risck_qa.commercial_org_'||(3-i))::uuid;
  actor:=current_setting('risck_qa.commercial_actor_'||i)::uuid;
  expected_plan:=CASE WHEN i=1 THEN 'starter' ELSE 'business' END;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
  IF app_private.is_org_member(own_org) IS DISTINCT FROM true THEN RAISE EXCEPTION 'QA_OWN_MEMBER_DENIED'; END IF; n:=n+1;
  IF app_private.has_commercial_authority(own_org) IS DISTINCT FROM true THEN RAISE EXCEPTION 'QA_OWN_PLAN_DENIED'; END IF; n:=n+1;
  IF app_private.has_minimum_commercial_plan(own_org,expected_plan) IS DISTINCT FROM true THEN RAISE EXCEPTION 'QA_OWN_LEVEL_DENIED'; END IF; n:=n+1;
  IF app_private.has_minimum_commercial_plan(own_org,'enterprise') IS DISTINCT FROM false THEN RAISE EXCEPTION 'QA_HIGHER_PLAN_ALLOWED'; END IF; n:=n+1;
  IF app_private.has_commercial_authority(foreign_org) IS DISTINCT FROM false THEN RAISE EXCEPTION 'QA_CROSS_LICENSE_INFERENCE'; END IF; n:=n+1;
  IF app_private.has_minimum_commercial_plan(foreign_org,'starter') IS DISTINCT FROM false THEN RAISE EXCEPTION 'QA_CROSS_LEVEL_INFERENCE'; END IF; n:=n+1;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
  IF app_private.has_commercial_authority(own_org) IS DISTINCT FROM false THEN RAISE EXCEPTION 'QA_AAL1_LICENSE_ALLOWED'; END IF; n:=n+1;
  IF app_private.has_minimum_commercial_plan(own_org,'starter') IS DISTINCT FROM false THEN RAISE EXCEPTION 'QA_AAL1_LEVEL_ALLOWED'; END IF; n:=n+1;
 END LOOP;
 IF n<>16 THEN RAISE EXCEPTION 'QA_ASSERT_COUNT'; END IF;
 PERFORM set_config('risck_qa.commercial_assertions',n::text,true);
END $assert$;
RESET ROLE;
SELECT current_setting('risck_qa.commercial_assertions',true)::int AS assertions_passed,'SYNTHETIC_SQL_CLAIMS_ONLY_NO_COMMERCIAL_ACCEPTANCE' AS evidence_class;
ROLLBACK;
-- Independent fresh transaction; no source, snapshot, subscription or Stripe event survives.
BEGIN READ ONLY;
SELECT count(*) AS organizations,(SELECT count(*) FROM public.enterprise_entitlement_sources) AS sources,(SELECT count(*) FROM public.enterprise_entitlement_snapshots) AS snapshots,(SELECT count(*) FROM public.subscriptions) AS subscriptions,(SELECT count(*) FROM public.stripe_events_processed) AS stripe_events,count(*) FILTER(WHERE app_private.resolve_commercial_plan(id) IS NOT NULL) AS commercial_authorities FROM public.organizations;
ROLLBACK;
