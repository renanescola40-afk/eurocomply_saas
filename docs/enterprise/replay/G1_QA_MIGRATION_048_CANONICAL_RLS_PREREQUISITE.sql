-- RISCK G1 - QA-only canonical policy prerequisite at historical replay step 48.
-- Provider policy metadata snapshot: 2026-10-23. Verified names come from
-- docs/enterprise/evidence/G1_QA_REPLAY_047_POLICY_GAPS_2026-10-22.json.
-- Helper source: supabase/migrations/20260629110000_enterprise_tenant_rls_cleanup_indexes.sql.
-- This file is NOT a production migration. Run only INSIDE a QA BEGIN...ROLLBACK rehearsal
-- after steps 1-47 and G1_QA_MIGRATION_048_AI_STRUCTURAL_PREREQUISITE.sql,
-- BEFORE historical 20260822123604_v19_reconcile_enterprise_core_active_runtime.sql.
-- Never execute on production; do not copy customer data or alter provider migration history.

DO $g1_preflight$
DECLARE r record; i int;
BEGIN
 IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (SELECT 1 FROM storage.objects) THEN
   RAISE EXCEPTION 'QA48 refusal: isolated QA must have zero Auth users and storage objects';
 END IF;
 IF to_regprocedure('app_private.is_org_member(uuid)') IS NULL OR
    to_regprocedure('app_private.has_org_role(uuid,text[])') IS NULL OR
    to_regprocedure('public.current_legacy_user_id()') IS NULL THEN
   RAISE EXCEPTION 'QA48 refusal: canonical role and identity helpers missing';
 END IF;
 FOR r IN SELECT tablename FROM (VALUES
   ('ai_systems'),
  ('audit_events'),
  ('invitations'),
  ('monitoring_preferences'),
  ('notifications'),
  ('onboarding_activation_runs'),
  ('regulatory_updates'),
  ('subscriptions')
 ) AS required(tablename)
 LOOP
   IF to_regclass(format('public.%I', r.tablename)) IS NULL THEN
     RAISE EXCEPTION 'QA48 refusal: missing required table %',r.tablename;
   END IF;
   IF NOT EXISTS(SELECT 1 FROM pg_class c
      WHERE c.oid=to_regclass(format('public.%I',r.tablename)) AND c.relrowsecurity) THEN
     RAISE EXCEPTION 'QA48 refusal: RLS not enabled on %',r.tablename;
   END IF;
 END LOOP;
 SELECT count(*) INTO i FROM pg_policies
 WHERE schemaname='public' AND policyname = ANY (ARRAY['rls_ai_systems_delete_admin','rls_ai_systems_insert_writer','rls_ai_systems_select_member','rls_ai_systems_update_writer','rls_audit_events_insert_backend_only','rls_audit_events_select_member','rls_invitations_insert_backend_only','rls_invitations_select_member','rls_monitoring_preferences_select_self_or_admin','rls_monitoring_preferences_update_self_or_admin','rls_notifications_insert_backend_only','rls_notifications_select_recipient','rls_onboarding_activation_runs_insert_writer','rls_onboarding_activation_runs_select_member','rls_regulatory_updates_insert_backend_only','rls_regulatory_updates_select_authenticated','rls_subscriptions_delete_backend_only','rls_subscriptions_insert_backend_only','rls_subscriptions_select_member','rls_subscriptions_update_backend_only']);
 IF i <> 0 THEN RAISE EXCEPTION 'QA48 refusal: candidate canonical policies already materialized (%). Refuse overwrite.',i; END IF;
END $g1_preflight$;

-- Exact semantics from approved historical helper; SECURITY INVOKER (never elevated).
DO $g1_user_helper$
BEGIN
 IF to_regprocedure('public.current_app_user_matches(uuid)') IS NULL THEN
   EXECUTE $safe_helper$
     CREATE FUNCTION public.current_app_user_matches(target_user_id uuid)
     RETURNS boolean LANGUAGE sql STABLE
     SET search_path = public, pg_temp
     AS $f$ SELECT public.current_legacy_user_id() IS NOT NULL
        AND target_user_id = public.current_legacy_user_id(); $f$;
   $safe_helper$;
 END IF;
 IF (SELECT p.prosecdef FROM pg_proc p
     WHERE p.oid=to_regprocedure('public.current_app_user_matches(uuid)')) THEN
   RAISE EXCEPTION 'QA48 refusal: current_app_user_matches cannot be SECURITY DEFINER';
 END IF;
END $g1_user_helper$;
REVOKE ALL ON FUNCTION public.current_app_user_matches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_user_matches(uuid) TO authenticated;

-- Audited literal policy names and production-equivalent role predicates.
CREATE POLICY rls_ai_systems_delete_admin ON public.ai_systems AS PERMISSIVE FOR DELETE TO authenticated
  USING (app_private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));

CREATE POLICY rls_ai_systems_insert_writer ON public.ai_systems AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (app_private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'compliance_manager'::text]));

CREATE POLICY rls_ai_systems_select_member ON public.ai_systems AS PERMISSIVE FOR SELECT TO authenticated
  USING (app_private.is_org_member(organization_id));

CREATE POLICY rls_ai_systems_update_writer ON public.ai_systems AS PERMISSIVE FOR UPDATE TO authenticated
  USING (app_private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'compliance_manager'::text]))
  WITH CHECK (app_private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'compliance_manager'::text]));

CREATE POLICY rls_audit_events_insert_backend_only ON public.audit_events AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY rls_audit_events_select_member ON public.audit_events AS PERMISSIVE FOR SELECT TO authenticated
  USING (app_private.is_org_member(organization_id));

CREATE POLICY rls_invitations_insert_backend_only ON public.invitations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY rls_invitations_select_member ON public.invitations AS PERMISSIVE FOR SELECT TO authenticated
  USING (app_private.is_org_member(organization_id));

CREATE POLICY rls_monitoring_preferences_select_self_or_admin ON public.monitoring_preferences AS PERMISSIVE FOR SELECT TO authenticated
  USING ((app_private.is_org_member(organization_id) AND (current_app_user_matches(user_id) OR app_private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY rls_monitoring_preferences_update_self_or_admin ON public.monitoring_preferences AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((app_private.is_org_member(organization_id) AND (current_app_user_matches(user_id) OR app_private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]))))
  WITH CHECK ((app_private.is_org_member(organization_id) AND (current_app_user_matches(user_id) OR app_private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY rls_notifications_insert_backend_only ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY rls_notifications_select_recipient ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated
  USING ((current_app_user_matches(user_id) AND app_private.is_org_member(organization_id)));

CREATE POLICY rls_onboarding_activation_runs_insert_writer ON public.onboarding_activation_runs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (app_private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'compliance_manager'::text]));

CREATE POLICY rls_onboarding_activation_runs_select_member ON public.onboarding_activation_runs AS PERMISSIVE FOR SELECT TO authenticated
  USING (app_private.is_org_member(organization_id));

CREATE POLICY rls_regulatory_updates_insert_backend_only ON public.regulatory_updates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY rls_regulatory_updates_select_authenticated ON public.regulatory_updates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY rls_subscriptions_delete_backend_only ON public.subscriptions AS PERMISSIVE FOR DELETE TO authenticated
  USING (false);

CREATE POLICY rls_subscriptions_insert_backend_only ON public.subscriptions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY rls_subscriptions_select_member ON public.subscriptions AS PERMISSIVE FOR SELECT TO authenticated
  USING (app_private.is_org_member(organization_id));

CREATE POLICY rls_subscriptions_update_backend_only ON public.subscriptions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);
-- Strict acceptance: exactly these 20 names, no auth/anon elevation, no weakening.
DO $g1_postflight$
DECLARE actual int;
BEGIN
 SELECT count(*) INTO actual FROM pg_policies
  WHERE schemaname='public'
    AND policyname = ANY(ARRAY['rls_ai_systems_delete_admin','rls_ai_systems_insert_writer','rls_ai_systems_select_member','rls_ai_systems_update_writer','rls_audit_events_insert_backend_only','rls_audit_events_select_member','rls_invitations_insert_backend_only','rls_invitations_select_member','rls_monitoring_preferences_select_self_or_admin','rls_monitoring_preferences_update_self_or_admin','rls_notifications_insert_backend_only','rls_notifications_select_recipient','rls_onboarding_activation_runs_insert_writer','rls_onboarding_activation_runs_select_member','rls_regulatory_updates_insert_backend_only','rls_regulatory_updates_select_authenticated','rls_subscriptions_delete_backend_only','rls_subscriptions_insert_backend_only','rls_subscriptions_select_member','rls_subscriptions_update_backend_only']);
 IF actual <> 20 THEN
   RAISE EXCEPTION 'QA48 refusal: expected 20 canonical policies, found %',actual;
 END IF;
 IF EXISTS (
   SELECT 1 FROM pg_policies WHERE schemaname='public'
     AND policyname = ANY(ARRAY['rls_ai_systems_delete_admin','rls_ai_systems_insert_writer','rls_ai_systems_select_member','rls_ai_systems_update_writer','rls_audit_events_insert_backend_only','rls_audit_events_select_member','rls_invitations_insert_backend_only','rls_invitations_select_member','rls_monitoring_preferences_select_self_or_admin','rls_monitoring_preferences_update_self_or_admin','rls_notifications_insert_backend_only','rls_notifications_select_recipient','rls_onboarding_activation_runs_insert_writer','rls_onboarding_activation_runs_select_member','rls_regulatory_updates_insert_backend_only','rls_regulatory_updates_select_authenticated','rls_subscriptions_delete_backend_only','rls_subscriptions_insert_backend_only','rls_subscriptions_select_member','rls_subscriptions_update_backend_only'])
     AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
 ) THEN RAISE EXCEPTION 'QA48 refusal: unexpected public policy role'; END IF;
END $g1_postflight$;
-- No COMMIT here. The controlling QA rehearsal MUST ROLLBACK.
