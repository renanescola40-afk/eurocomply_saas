-- RISCK COMPLY SEC-02: reviewed migration CANDIDATE. NOT APPLIED.
-- Proposed QA target: isolated Supabase project zrxrrfbllsxtleyxjpsz.
-- DO NOT replay this file directly while DAT-01 migration provenance is unresolved.
-- Promote to canonical migration only after independent review + ledger reconciliation.
-- WHY: audit_logs/audit_events SELECT allowed any active licensed tenant member via
-- is_org_member, while canonical permission read_audit is owner/admin only.
-- Restrictive SELECT policies compose with existing permissive policies and
-- the payment_first_commercial_authority RESTRICTIVE ALL policy.
-- Intentionally preserves tenant/MFA/commercial checks; no RLS or auth bypass.
--
-- Prerequisites: confirm public.audit_logs, public.audit_events use organization_id uuid;
-- app_private.has_org_role(uuid,text[]) is callable by authenticated;
-- approved migration identity is unique; QA is an approved disposable environment.
-- Consider role aliases only after a canonical persisted-role analysis.
BEGIN;

CREATE POLICY sec02_audit_logs_role_select
  ON public.audit_logs
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    app_private.has_org_role(
      organization_id,
      ARRAY['owner'::text, 'admin'::text]
    )
  );

CREATE POLICY sec02_audit_events_role_select
  ON public.audit_events
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    app_private.has_org_role(
      organization_id,
      ARRAY['owner'::text, 'admin'::text]
    )
  );

COMMIT;

-- Rollback (reviewed release rollback only; DO NOT append to forward migration):
-- DROP POLICY IF EXISTS sec02_audit_events_role_select ON public.audit_events;
-- DROP POLICY IF EXISTS sec02_audit_logs_role_select ON public.audit_logs;
