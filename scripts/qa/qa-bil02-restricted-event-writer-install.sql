-- A-10/BIL-02 | QA-ONLY PERSISTENT ROLE INSTALLATION (NOT EXECUTED)
-- Proposed for human security approval; DO NOT run on Production or generic SQL consoles.
-- Target exclusively: Supabase QA project zrxrrfbllsxtleyxjpsz, PostgreSQL 17.
-- Origin: previously executed rollback-only role/policy rehearsal, Git blob bb67648fa983f5312cc838f5274a23d8fb540d01.
-- This installer does not issue a JWT, enable Stripe endpoints, process events,
-- grant entitlements, or authorize bypassing the QA credential guard.
-- Before execution: independently verify provider project identity, approved
-- issuer/JWT provenance and a signed qualified review of the exact PR HEAD.
-- Fail closed: missing QA migration marker / existing writer / weak table RLS aborts.
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
DO $install_verify$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'risck_qa_stripe_event_writer'
      AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper) THEN
    RAISE EXCEPTION 'qa_bil02_writer_role_not_restricted';
  END IF;
  IF NOT pg_has_role('authenticator','risck_qa_stripe_event_writer','MEMBER') THEN
    RAISE EXCEPTION 'qa_bil02_writer_authenticator_binding_missing';
  END IF;
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
      WHERE oid = 'public.stripe_events_processed'::regclass) THEN
    RAISE EXCEPTION 'qa_bil02_writer_force_rls_missing';
  END IF;
  IF NOT has_column_privilege('risck_qa_stripe_event_writer',
      'public.stripe_events_processed','id','SELECT') OR
      NOT has_column_privilege('risck_qa_stripe_event_writer',
      'public.stripe_events_processed','status','SELECT') OR
      NOT has_column_privilege('risck_qa_stripe_event_writer',
      'public.stripe_events_processed','id','INSERT') THEN
    RAISE EXCEPTION 'qa_bil02_writer_intake_column_grants_missing';
  END IF;
  IF has_column_privilege('risck_qa_stripe_event_writer',
      'public.stripe_events_processed','status','INSERT') OR
      has_column_privilege('risck_qa_stripe_event_writer',
      'public.stripe_events_processed','status','UPDATE') OR
      has_table_privilege('risck_qa_stripe_event_writer',
      'public.stripe_events_processed','DELETE') OR
      has_table_privilege('risck_qa_stripe_event_writer',
      'public.subscriptions','INSERT') OR
      has_table_privilege('risck_qa_stripe_event_writer',
      'public.organization_entitlements','UPDATE') THEN
    RAISE EXCEPTION 'qa_bil02_writer_excessive_permission';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'stripe_events_processed' AND policyname IN
      ('risck_qa_stripe_event_writer_select','risck_qa_stripe_event_writer_insert')) <> 2 THEN
    RAISE EXCEPTION 'qa_bil02_writer_expected_policies_missing';
  END IF;
END $install_verify$;
COMMIT;
