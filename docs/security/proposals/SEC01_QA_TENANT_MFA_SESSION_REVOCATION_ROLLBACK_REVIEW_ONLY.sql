-- QA-ONLY emergency rollback for SEC-01 session-revocation hardening.
-- Do not execute on Production. Requires independently approved rollback.
-- This restores the original QA provider function exactly as observed on
-- 2026-11-23 and deliberately removes the live session check.
-- SECURITY WARNING: MAY REOPEN UNEXPIRED-REVOKED-JWT ACCESS; do not roll back
-- simply to make QA green. Prefer denying product access while remediating.
BEGIN;

CREATE OR REPLACE FUNCTION public.tenant_mfa_satisfied(target_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_security_settings as oss
      where oss.organization_id = target_organization_id
        and (
          not oss.require_mfa_for_all_users
          or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
        )
    );
$function$;

COMMIT;
