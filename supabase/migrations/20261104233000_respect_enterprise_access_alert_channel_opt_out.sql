-- OPS-04 / issue #2618 — fail closed on missing or disabled alert delivery policies.
-- Forward-only corrective migration. Preserve historical migration hashes for DAT-01.
-- No messages are dispatched by this migration; it only controls durable queue insertion.
-- QA proof: tested inside a single ROLLBACK transaction on isolated synthetic tenants.
--
-- Invariants:
--   1. Missing escalation policy => no notification, including no default email.
--   2. Both channels disabled => no notification.
--   3. Webhook enabled, email disabled => webhook queue entry only.
--   4. Email enabled, webhook disabled => email queue entry only.
--   5. Both enabled => prior webhook preference preserved; queue remains idempotent.
-- The delivery worker still requires a separately verified configured provider.

BEGIN;

CREATE OR REPLACE FUNCTION public.enqueue_enterprise_access_escalations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.enterprise_access_notifications (
    organization_id,
    alert_key,
    channel,
    severity,
    payload
  )
  SELECT
    a.organization_id,
    a.alert_key,
    CASE
      WHEN p.webhook_enabled IS TRUE THEN 'webhook'
      WHEN p.email_enabled IS TRUE THEN 'email'
      ELSE NULL
    END,
    a.severity,
    jsonb_build_object(
      'alertId', a.id,
      'alertKey', a.alert_key,
      'severity', a.severity
    )
  FROM public.enterprise_access_runtime_alerts AS a
  JOIN public.enterprise_access_escalation_policies AS p
    ON p.organization_id = a.organization_id
  WHERE a.status = 'open'
    AND (
      p.webhook_enabled IS TRUE
      OR p.email_enabled IS TRUE
    )
  ON CONFLICT (organization_id, alert_key, channel) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- Restore explicit backend-only execution regardless of an earlier environment's ACL.
REVOKE ALL ON FUNCTION public.enqueue_enterprise_access_escalations()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_enterprise_access_escalations()
  TO service_role;

COMMIT;
