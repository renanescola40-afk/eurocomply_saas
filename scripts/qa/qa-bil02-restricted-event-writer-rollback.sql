-- A-10/BIL-02: rollback-only QA restricted Stripe TEST INTAKE ledger acceptance rehearsal.
-- Intake must NEVER mark an event processed; downstream billing fulfillment is a separate authority.
-- NOT a migration, NOT permission to activate webhooks, NOT a subscription/entitlement writer.
-- Exact QA Supabase: zrxrrfbllsxtleyxjpsz; NEVER execute against Production.
BEGIN;
DO $guard$
BEGIN
  IF current_setting('server_version_num')::int < 170000 OR
     NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261105185729') THEN
    RAISE EXCEPTION 'qa_only_migration_marker_or_pg17_missing';
  END IF;
  IF to_regrole('risck_qa_stripe_event_writer') IS NOT NULL OR
     NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.stripe_events_processed'::regclass AND relrowsecurity AND relforcerowsecurity) THEN
    RAISE EXCEPTION 'qa_restricted_writer_preflight_failed';
  END IF;
END $guard$;
CREATE ROLE risck_qa_stripe_event_writer NOLOGIN NOINHERIT NOBYPASSRLS;
-- QA PostgREST role selection requires an independently signed JWT with role claim.
GRANT risck_qa_stripe_event_writer TO authenticator;
-- Membership on postgres is test-only and disappears at ROLLBACK.
GRANT risck_qa_stripe_event_writer TO postgres;
GRANT USAGE ON SCHEMA public TO risck_qa_stripe_event_writer;
GRANT SELECT (id, status),
      INSERT (id, type, stripe_created_at, livemode, api_version, payload)
ON public.stripe_events_processed TO risck_qa_stripe_event_writer;
CREATE POLICY risck_qa_stripe_event_writer_select ON public.stripe_events_processed
  FOR SELECT TO risck_qa_stripe_event_writer
  USING (livemode=false AND organization_id IS NULL
    AND payload @> '{"qa_intake_only":true}'::jsonb);
CREATE POLICY risck_qa_stripe_event_writer_insert ON public.stripe_events_processed
  FOR INSERT TO risck_qa_stripe_event_writer
  WITH CHECK (livemode=false AND organization_id IS NULL
    AND status = 'processing' AND id ~ '^evt_[A-Za-z0-9_]{4,200}$'
    AND payload @> '{"qa_intake_only":true}'::jsonb AND type IN ('checkout.session.completed','checkout.session.async_payment_succeeded',
      'customer.subscription.created','customer.subscription.updated','customer.subscription.deleted',
      'invoice.paid','invoice.payment_failed'));
SET LOCAL ROLE risck_qa_stripe_event_writer;
DO $test$
DECLARE blocked_live boolean:=false; blocked_org boolean:=false;
        blocked_duplicate boolean:=false; blocked_delete boolean:=false;
        blocked_status_update boolean:=false; blocked_status_insert boolean:=false;
        blocked_default_status_override boolean:=false; current_status text;
BEGIN
  IF NOT row_security_active('public.stripe_events_processed'::regclass) OR
      (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) THEN
    RAISE EXCEPTION 'qa_writer_rls_or_no_bypass_check_failed';
  END IF;
  IF has_table_privilege(current_user, 'public.stripe_events_processed', 'UPDATE') OR
     has_column_privilege(current_user, 'public.stripe_events_processed', 'status', 'UPDATE') OR
     has_table_privilege(current_user, 'public.subscriptions', 'INSERT') OR
     has_table_privilege(current_user, 'public.organization_entitlements', 'UPDATE') THEN
    RAISE EXCEPTION 'qa_writer_has_forbidden_subscription_or_entitlement_rights';
  END IF;
  INSERT INTO public.stripe_events_processed (id,type,stripe_created_at,livemode,payload)
    VALUES ('evt_qa_writer_probe_20261110','checkout.session.completed',now(),false,'{"qa_intake_only":true}'::jsonb);
  SELECT status INTO current_status FROM public.stripe_events_processed
    WHERE id='evt_qa_writer_probe_20261110';
  IF current_status IS DISTINCT FROM 'processing' THEN RAISE EXCEPTION 'qa_writer_positive_intake_missing'; END IF;
  BEGIN
    UPDATE public.stripe_events_processed SET status='processed'
      WHERE id='evt_qa_writer_probe_20261110';
  EXCEPTION WHEN insufficient_privilege THEN blocked_status_update:=true; END;
  IF NOT blocked_status_update THEN RAISE EXCEPTION 'qa_intake_writer_can_forge_processed_state'; END IF;
  BEGIN
    INSERT INTO public.stripe_events_processed (id,type,stripe_created_at,livemode,status,payload)
      VALUES ('evt_qa_writer_forged_status_20261110','checkout.session.completed',now(),false,'processed','{"qa_intake_only":true}'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN blocked_status_insert:=true; END;
  IF NOT blocked_status_insert THEN RAISE EXCEPTION 'qa_intake_writer_can_insert_processed_state'; END IF;
  -- A client cannot explicitly supply even the allowed 'processing' value:
  -- the DB is the sole authority for the initial status default.
  BEGIN
    INSERT INTO public.stripe_events_processed (id,type,stripe_created_at,livemode,status,payload)
      VALUES ('evt_qa_writer_explicit_processing_20261110','invoice.paid',now(),false,'processing','{"qa_intake_only":true}'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN blocked_default_status_override:=true; END;
  IF NOT blocked_default_status_override THEN RAISE EXCEPTION 'qa_intake_writer_can_override_default_processing'; END IF;
  BEGIN
    INSERT INTO public.stripe_events_processed (id,type,stripe_created_at,livemode,payload)
      VALUES ('evt_qa_writer_live_denied_20261110','invoice.paid',now(),true,'{"qa_intake_only":true}'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN blocked_live:=true; END;
  IF NOT blocked_live THEN RAISE EXCEPTION 'qa_writer_live_insert_was_permitted'; END IF;
  BEGIN
    INSERT INTO public.stripe_events_processed (id,type,stripe_created_at,livemode,organization_id,payload)
      VALUES ('evt_qa_writer_org_denied_20261110','invoice.paid',now(),false,
        '00000000-0000-0000-0000-000000000001','{"qa_intake_only":true}'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN blocked_org:=true; END;
  IF NOT blocked_org THEN RAISE EXCEPTION 'qa_writer_tenant_insert_was_permitted'; END IF;
  BEGIN
    INSERT INTO public.stripe_events_processed (id,type,stripe_created_at,livemode,payload)
      VALUES ('evt_qa_writer_probe_20261110','checkout.session.completed',now(),false,'{"qa_intake_only":true}'::jsonb);
  EXCEPTION WHEN unique_violation THEN blocked_duplicate:=true; END;
  IF NOT blocked_duplicate THEN RAISE EXCEPTION 'qa_writer_duplicate_insert_was_permitted'; END IF;
  BEGIN
    DELETE FROM public.stripe_events_processed WHERE id='evt_qa_writer_probe_20261110';
  EXCEPTION WHEN insufficient_privilege THEN blocked_delete:=true; END;
  IF NOT blocked_delete THEN RAISE EXCEPTION 'qa_writer_delete_was_permitted'; END IF;
  RAISE NOTICE 'QA_A10_BIL02_INSERT_ONLY_LEDGER_7_CASES_PASS';
END $test$;
RESET ROLE;
ROLLBACK;
