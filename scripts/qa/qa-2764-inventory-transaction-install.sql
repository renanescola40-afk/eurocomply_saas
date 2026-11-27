-- QA ONLY, project zrxrrfbllsxtleyxjpsz. Independent database/security review required.
-- Run after the separately reviewed current-organization installer, in an exclusive DDL window.
-- Provision the login password through the secret manager, never through a logged SQL console.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='20s';
DO $preflight$
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::int/10000 <> 17
    OR to_regprocedure('public.get_my_qa_organization_context()') IS NULL
    OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NULL
    OR to_regprocedure('public.create_ai_system_atomic(uuid,uuid,jsonb)') IS NULL
    OR to_regprocedure('public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)') IS NULL
    OR to_regprocedure('public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)') IS NULL
    OR to_regprocedure('app_private.qa_inventory_audit_head(uuid,text,text)') IS NOT NULL
    OR to_regprocedure('app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)') IS NOT NULL
    OR to_regprocedure('app_private.qa_inventory_append(uuid,jsonb,text,text,text)') IS NOT NULL
    OR to_regclass('app_private.qa_inventory_pending') IS NOT NULL
    OR to_regprocedure('app_private.qa_inventory_verify_attestation(text,text,uuid,text,jsonb)') IS NOT NULL
    OR to_regclass('vault.decrypted_secrets') IS NULL
    OR to_regprocedure('extensions.hmac(bytea,bytea,text)') IS NULL
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_attestation_v1' AND decrypted_secret ~ '^[a-f0-9]{64}
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

-- A database login alone must never be able to assert provider identity.
-- Secrets are provisioned separately, outside SQL logs; no secret DDL here.
CREATE FUNCTION app_private.qa_inventory_verify_attestation(
 p_payload text,p_mac text,p_organization_id uuid,p_operation text,p_arguments jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $attestation$
DECLARE v_key text; v_data jsonb; v_claims jsonb; v_now bigint;
BEGIN
 IF p_payload IS NULL OR octet_length(p_payload)>262144 OR p_mac IS NULL
   OR p_mac !~ '^[a-f0-9]{64}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  PERFORM app_private.qa_inventory_verify_attestation(p_payload,p_mac,p_organization_id,'head','{}'::jsonb);
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at text,
  p_system jsonb,p_payload text,p_mac text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  PERFORM app_private.qa_inventory_verify_attestation(p_payload,p_mac,p_organization_id,'mutate',
    pg_catalog.jsonb_build_object('systemId',p_system_id,'expectedUpdatedAt',p_expected_updated_at,'patch',p_system));
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at::timestamptz,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb,p_canonical text,p_payload text,p_mac text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid; v_audit_key text;
BEGIN
  PERFORM app_private.qa_inventory_verify_attestation(p_payload,p_mac,p_organization_id,'append',
    pg_catalog.jsonb_build_object('audit',p_audit,'canonical',p_canonical));
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR coalesce(v_hash,'') !~ '^[a-f0-9]{64}
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT decrypted_secret INTO STRICT v_audit_key FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1';
  IF v_audit_key IS NULL OR length(v_audit_key)=0 OR p_canonical IS NULL
    OR p_canonical::jsonb IS DISTINCT FROM (p_audit - ARRAY['eventHash','signature'])
    OR pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_canonical,'UTF8'),'sha256'),'hex') IS DISTINCT FROM v_hash
    OR pg_catalog.encode(extensions.hmac(pg_catalog.convert_to(v_hash,'UTF8'),
      pg_catalog.convert_to(v_audit_key,'UTF8'),'sha256'),'hex') IS DISTINCT FROM v_signature
  THEN RAISE EXCEPTION 'qa_inventory_audit_signature_denied' USING ERRCODE='42501'; END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','app_private.qa_inventory_verify_attestation(text,text,uuid,text,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','vault.decrypted_secrets','SELECT')
  OR has_schema_privilege('qa_inventory_writer','vault','USAGE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
 THEN
   RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501';
 END IF;
 SELECT decrypted_secret INTO STRICT v_key FROM vault.decrypted_secrets WHERE name='qa_inventory_attestation_v1';
 IF v_key IS NULL OR v_key !~ '^[a-f0-9]{64}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
 OR
   extensions.hmac(pg_catalog.convert_to(p_payload,'UTF8'),pg_catalog.convert_to(v_key,'UTF8'),'sha256')
   IS DISTINCT FROM pg_catalog.decode(p_mac,'hex') THEN
   RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501';
 END IF;
 v_data:=p_payload::jsonb; v_claims:=v_data->'claims';
 v_now:=extract(epoch FROM pg_catalog.clock_timestamp())::bigint;
 IF v_data->>'version' IS DISTINCT FROM '1'
   OR v_data->>'project' IS DISTINCT FROM 'zrxrrfbllsxtleyxjpsz'
   OR v_data->>'transactionId' IS DISTINCT FROM pg_catalog.txid_current()::text
   OR v_data->>'backendPid' IS DISTINCT FROM pg_catalog.pg_backend_pid()::text
   OR v_data->>'organizationId' IS DISTINCT FROM p_organization_id::text
   OR v_data->>'operation' IS DISTINCT FROM p_operation
   OR v_data->'args' IS DISTINCT FROM p_arguments
   OR jsonb_typeof(v_data->'issuedAt') IS DISTINCT FROM 'number'
   OR (v_data->>'issuedAt')::bigint NOT BETWEEN v_now-30 AND v_now+2
   OR jsonb_typeof(v_claims) IS DISTINCT FROM 'object'
   OR v_claims->>'iss' IS DISTINCT FROM 'https://zrxrrfbllsxtleyxjpsz.supabase.co/auth/v1'
   OR v_claims->>'role' IS DISTINCT FROM 'authenticated'
   OR v_claims->>'aal' IS DISTINCT FROM 'aal2'
   OR v_claims->>'is_anonymous' IS DISTINCT FROM 'false'
   OR NOT coalesce(v_claims->>'aud'='authenticated' OR
       (jsonb_typeof(v_claims->'aud')='array' AND v_claims->'aud' ? 'authenticated'),false)
   OR jsonb_typeof(v_claims->'exp') IS DISTINCT FROM 'number'
   OR (v_claims->>'exp')::bigint<=v_now
   OR coalesce(v_claims->>'sub','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;

   OR coalesce(v_claims->>'session_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;

 THEN RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501'; END IF;
 -- auth.jwt() prefers the singular GUC, so replace BOTH aliases and the
 -- individual claim aliases before invoking the independently reviewed guards.
 PERFORM pg_catalog.set_config('request.jwt.claim',v_claims::text,true);
 PERFORM pg_catalog.set_config('request.jwt.claims',v_claims::text,true);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',v_claims->>'sub',true);
 PERFORM pg_catalog.set_config('request.jwt.claim.role','authenticated',true);
 IF auth.jwt() IS DISTINCT FROM v_claims OR auth.uid() IS DISTINCT FROM (v_claims->>'sub')::uuid
 THEN RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501'; END IF;
END $attestation$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_verify_attestation(text,text,uuid,text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid,p_payload text,p_mac text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
 OR coalesce(v_signature,'') !~ '^[a-f0-9]{64}
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
 THEN
   RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501';
 END IF;
 SELECT decrypted_secret INTO STRICT v_key FROM vault.decrypted_secrets WHERE name='qa_inventory_attestation_v1';
 IF v_key IS NULL OR v_key !~ '^[a-f0-9]{64}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
 OR
   extensions.hmac(pg_catalog.convert_to(p_payload,'UTF8'),pg_catalog.convert_to(v_key,'UTF8'),'sha256')
   IS DISTINCT FROM pg_catalog.decode(p_mac,'hex') THEN
   RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501';
 END IF;
 v_data:=p_payload::jsonb; v_claims:=v_data->'claims';
 v_now:=extract(epoch FROM pg_catalog.clock_timestamp())::bigint;
 IF v_data->>'version' IS DISTINCT FROM '1'
   OR v_data->>'project' IS DISTINCT FROM 'zrxrrfbllsxtleyxjpsz'
   OR v_data->>'transactionId' IS DISTINCT FROM pg_catalog.txid_current()::text
   OR v_data->>'backendPid' IS DISTINCT FROM pg_catalog.pg_backend_pid()::text
   OR v_data->>'organizationId' IS DISTINCT FROM p_organization_id::text
   OR v_data->>'operation' IS DISTINCT FROM p_operation
   OR v_data->'args' IS DISTINCT FROM p_arguments
   OR jsonb_typeof(v_data->'issuedAt') IS DISTINCT FROM 'number'
   OR (v_data->>'issuedAt')::bigint NOT BETWEEN v_now-30 AND v_now+2
   OR jsonb_typeof(v_claims) IS DISTINCT FROM 'object'
   OR v_claims->>'iss' IS DISTINCT FROM 'https://zrxrrfbllsxtleyxjpsz.supabase.co/auth/v1'
   OR v_claims->>'role' IS DISTINCT FROM 'authenticated'
   OR v_claims->>'aal' IS DISTINCT FROM 'aal2'
   OR v_claims->>'is_anonymous' IS DISTINCT FROM 'false'
   OR NOT coalesce(v_claims->>'aud'='authenticated' OR
       (jsonb_typeof(v_claims->'aud')='array' AND v_claims->'aud' ? 'authenticated'),false)
   OR jsonb_typeof(v_claims->'exp') IS DISTINCT FROM 'number'
   OR (v_claims->>'exp')::bigint<=v_now
   OR coalesce(v_claims->>'sub','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;

   OR coalesce(v_claims->>'session_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;

 THEN RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501'; END IF;
 -- auth.jwt() prefers the singular GUC, so replace BOTH aliases and the
 -- individual claim aliases before invoking the independently reviewed guards.
 PERFORM pg_catalog.set_config('request.jwt.claim',v_claims::text,true);
 PERFORM pg_catalog.set_config('request.jwt.claims',v_claims::text,true);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',v_claims->>'sub',true);
 PERFORM pg_catalog.set_config('request.jwt.claim.role','authenticated',true);
 IF auth.jwt() IS DISTINCT FROM v_claims OR auth.uid() IS DISTINCT FROM (v_claims->>'sub')::uuid
 THEN RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501'; END IF;
END $attestation$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_verify_attestation(text,text,uuid,text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid,p_payload text,p_mac text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;

    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
 THEN
   RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501';
 END IF;
 SELECT decrypted_secret INTO STRICT v_key FROM vault.decrypted_secrets WHERE name='qa_inventory_attestation_v1';
 IF v_key IS NULL OR v_key !~ '^[a-f0-9]{64}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
 OR
   extensions.hmac(pg_catalog.convert_to(p_payload,'UTF8'),pg_catalog.convert_to(v_key,'UTF8'),'sha256')
   IS DISTINCT FROM pg_catalog.decode(p_mac,'hex') THEN
   RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501';
 END IF;
 v_data:=p_payload::jsonb; v_claims:=v_data->'claims';
 v_now:=extract(epoch FROM pg_catalog.clock_timestamp())::bigint;
 IF v_data->>'version' IS DISTINCT FROM '1'
   OR v_data->>'project' IS DISTINCT FROM 'zrxrrfbllsxtleyxjpsz'
   OR v_data->>'transactionId' IS DISTINCT FROM pg_catalog.txid_current()::text
   OR v_data->>'backendPid' IS DISTINCT FROM pg_catalog.pg_backend_pid()::text
   OR v_data->>'organizationId' IS DISTINCT FROM p_organization_id::text
   OR v_data->>'operation' IS DISTINCT FROM p_operation
   OR v_data->'args' IS DISTINCT FROM p_arguments
   OR jsonb_typeof(v_data->'issuedAt') IS DISTINCT FROM 'number'
   OR (v_data->>'issuedAt')::bigint NOT BETWEEN v_now-30 AND v_now+2
   OR jsonb_typeof(v_claims) IS DISTINCT FROM 'object'
   OR v_claims->>'iss' IS DISTINCT FROM 'https://zrxrrfbllsxtleyxjpsz.supabase.co/auth/v1'
   OR v_claims->>'role' IS DISTINCT FROM 'authenticated'
   OR v_claims->>'aal' IS DISTINCT FROM 'aal2'
   OR v_claims->>'is_anonymous' IS DISTINCT FROM 'false'
   OR NOT coalesce(v_claims->>'aud'='authenticated' OR
       (jsonb_typeof(v_claims->'aud')='array' AND v_claims->'aud' ? 'authenticated'),false)
   OR jsonb_typeof(v_claims->'exp') IS DISTINCT FROM 'number'
   OR (v_claims->>'exp')::bigint<=v_now
   OR coalesce(v_claims->>'sub','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;

   OR coalesce(v_claims->>'session_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;

 THEN RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501'; END IF;
 -- auth.jwt() prefers the singular GUC, so replace BOTH aliases and the
 -- individual claim aliases before invoking the independently reviewed guards.
 PERFORM pg_catalog.set_config('request.jwt.claim',v_claims::text,true);
 PERFORM pg_catalog.set_config('request.jwt.claims',v_claims::text,true);
 PERFORM pg_catalog.set_config('request.jwt.claim.sub',v_claims->>'sub',true);
 PERFORM pg_catalog.set_config('request.jwt.claim.role','authenticated',true);
 IF auth.jwt() IS DISTINCT FROM v_claims OR auth.uid() IS DISTINCT FROM (v_claims->>'sub')::uuid
 THEN RAISE EXCEPTION 'qa_inventory_attestation_denied' USING ERRCODE='42501'; END IF;
END $attestation$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_verify_attestation(text,text,uuid,text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid,p_payload text,p_mac text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='qa_inventory_audit_chain_v1' AND length(decrypted_secret)>0)<>1
    OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name IN ('qa_inventory_attestation_v1','qa_inventory_audit_chain_v1'))<>2
    OR EXISTS(SELECT 1 FROM vault.decrypted_secrets a JOIN vault.decrypted_secrets b ON a.decrypted_secret=b.decrypted_secret
       WHERE a.name='qa_inventory_attestation_v1' AND b.name='qa_inventory_audit_chain_v1')
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

-- A deferred constraint prevents the restricted login from committing an
-- inventory transition without an audit append, even if it bypasses the app.
CREATE TABLE app_private.qa_inventory_pending (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  transaction_id bigint NOT NULL,
  organization_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  system_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ai_system_created','ai_system_reassessed'))
);
REVOKE ALL ON TABLE app_private.qa_inventory_pending FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE FUNCTION app_private.qa_inventory_pending_commit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM app_private.qa_inventory_pending p WHERE p.id=NEW.id) THEN
    RAISE EXCEPTION 'qa_inventory_audit_required' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $guard$;
REVOKE ALL ON FUNCTION app_private.qa_inventory_pending_commit_guard() FROM PUBLIC,anon,authenticated,service_role,qa_inventory_writer;
CREATE CONSTRAINT TRIGGER qa_inventory_audit_required
AFTER INSERT ON app_private.qa_inventory_pending
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION app_private.qa_inventory_pending_commit_guard();

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  INSERT INTO app_private.qa_inventory_pending(transaction_id,organization_id,actor_user_id,system_id,action)
    VALUES(pg_catalog.txid_current(),p_organization_id,v_actor,(v_system->>'id')::uuid,
      CASE WHEN p_system_id IS NULL THEN 'ai_system_created' ELSE 'ai_system_reassessed' END);
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text; v_pending uuid;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  SELECT p.id INTO v_pending FROM app_private.qa_inventory_pending p
    WHERE p.transaction_id=pg_catalog.txid_current()
      AND p.organization_id=p_organization_id AND p.actor_user_id=v_actor
      AND p.system_id::text=p_audit->>'entityId' AND p.action=p_audit->>'action'
    ORDER BY p.id LIMIT 1 FOR UPDATE;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'qa_inventory_pending_mutation_required' USING ERRCODE='42501'; END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
  DELETE FROM app_private.qa_inventory_pending p WHERE p.id=v_pending;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_inventory_pending_disappeared'; END IF;
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb,text,text,text) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,text,jsonb,text,text)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb,text,text,text)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','DELETE')
  OR has_table_privilege('qa_inventory_writer','app_private.qa_inventory_pending','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
