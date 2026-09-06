\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
SET LOCAL client_min_messages = warning;

CREATE TEMP TABLE recovery_input (
  target_sha text NOT NULL,
  source_run_id text NOT NULL,
  recovery_from timestamptz NOT NULL,
  recovery_to timestamptz NOT NULL,
  confirmation text NOT NULL,
  execute_cleanup boolean NOT NULL,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

INSERT INTO recovery_input (
  target_sha,
  source_run_id,
  recovery_from,
  recovery_to,
  confirmation,
  execute_cleanup
)
VALUES (
  :'target_sha',
  :'source_run_id',
  :'recovery_from'::timestamptz,
  :'recovery_to'::timestamptz,
  :'confirmation',
  :'execute_cleanup'::boolean
);

DO $$
DECLARE
  input_row recovery_input%ROWTYPE;
BEGIN
  SELECT * INTO STRICT input_row FROM recovery_input;

  IF input_row.target_sha !~ '^[0-9a-f]{40}$' THEN
    RAISE EXCEPTION 'target_sha_invalid';
  END IF;
  IF input_row.source_run_id !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'source_run_id_invalid';
  END IF;
  IF input_row.confirmation <> 'CLEANUP_AUDIT_CHAIN_SYNTHETIC' THEN
    RAISE EXCEPTION 'cleanup_confirmation_invalid';
  END IF;
  IF input_row.recovery_from >= input_row.recovery_to THEN
    RAISE EXCEPTION 'recovery_window_order_invalid';
  END IF;
  IF input_row.recovery_to - input_row.recovery_from > interval '2 hours' THEN
    RAISE EXCEPTION 'recovery_window_too_wide';
  END IF;
END
$$;

CREATE TEMP TABLE recovery_organizations AS
SELECT id, slug, created_at
FROM public.organizations, recovery_input
WHERE slug LIKE 'audit-chain-live-proof-%'
  AND created_at >= recovery_input.recovery_from
  AND created_at <= recovery_input.recovery_to;

CREATE UNIQUE INDEX recovery_organizations_id_idx ON recovery_organizations(id);

CREATE TEMP TABLE recovery_audit_events AS
SELECT id, organization_id, action, created_at
FROM public.audit_events, recovery_input
WHERE action = 'security.audit_chain_live_validation'
  AND created_at >= recovery_input.recovery_from
  AND created_at <= recovery_input.recovery_to;

CREATE UNIQUE INDEX recovery_audit_events_id_idx ON recovery_audit_events(id);

CREATE TEMP TABLE recovery_auth_users AS
SELECT id, created_at
FROM auth.users, recovery_input
WHERE lower(coalesce(email, '')) LIKE 'audit-chain-live-proof-%'
  AND lower(coalesce(email, '')) LIKE '%@example.com'
  AND created_at >= recovery_input.recovery_from
  AND created_at <= recovery_input.recovery_to;

CREATE UNIQUE INDEX recovery_auth_users_id_idx ON recovery_auth_users(id);

CREATE TEMP TABLE recovery_counts (
  key text PRIMARY KEY,
  value bigint NOT NULL
);

INSERT INTO recovery_counts(key, value)
VALUES
  ('organizations', (SELECT count(*) FROM recovery_organizations)),
  ('audit_events', (SELECT count(*) FROM recovery_audit_events)),
  ('auth_users', (SELECT count(*) FROM recovery_auth_users)),
  ('organization_entitlements', (
    SELECT count(*)
    FROM public.organization_entitlements row
    JOIN recovery_organizations scope ON scope.id = row.organization_id
  )),
  ('organization_usage', (
    SELECT count(*)
    FROM public.organization_usage row
    JOIN recovery_organizations scope ON scope.id = row.organization_id
  )),
  ('enterprise_contracts', (
    SELECT count(*)
    FROM public.enterprise_contracts row
    JOIN recovery_organizations scope ON scope.id = row.organization_id
  )),
  ('organization_members', (
    SELECT count(*)
    FROM public.organization_members row
    JOIN recovery_organizations scope ON scope.id = row.organization_id
  ));

DO $$
DECLARE
  organization_count bigint;
  audit_event_count bigint;
  auth_user_count bigint;
  related_count bigint;
BEGIN
  SELECT value INTO STRICT organization_count FROM recovery_counts WHERE key = 'organizations';
  SELECT value INTO STRICT audit_event_count FROM recovery_counts WHERE key = 'audit_events';
  SELECT value INTO STRICT auth_user_count FROM recovery_counts WHERE key = 'auth_users';

  IF organization_count < 1 THEN
    RAISE EXCEPTION 'organization_scope_empty';
  END IF;
  IF organization_count > 20 THEN
    RAISE EXCEPTION 'organization_scope_too_large';
  END IF;
  IF audit_event_count < 1 THEN
    RAISE EXCEPTION 'audit_event_scope_empty';
  END IF;
  IF audit_event_count > 1000 THEN
    RAISE EXCEPTION 'audit_event_scope_too_large';
  END IF;
  IF auth_user_count > 30 THEN
    RAISE EXCEPTION 'auth_user_scope_too_large';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM recovery_organizations
    WHERE id IN (
      '0d5926df-1027-42da-8b14-579cc2630947'::uuid,
      'bf6115c2-4258-4fde-9d43-854cb98bb075'::uuid
    )
  ) THEN
    RAISE EXCEPTION 'protected_organization_in_recovery_scope';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM recovery_audit_events event
    LEFT JOIN recovery_organizations organization
      ON organization.id = event.organization_id
    WHERE organization.id IS NULL
  ) THEN
    RAISE EXCEPTION 'audit_event_scope_not_bound_to_synthetic_organization';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM recovery_audit_events
    WHERE action <> 'security.audit_chain_live_validation'
  ) THEN
    RAISE EXCEPTION 'audit_event_action_not_synthetic';
  END IF;

  IF auth_user_count > 0 THEN
    RAISE EXCEPTION 'auth_user_scope_requires_admin_api';
  END IF;

  FOR related_count IN
    SELECT value
    FROM recovery_counts
    WHERE key IN (
      'organization_entitlements',
      'organization_usage',
      'enterprise_contracts',
      'organization_members'
    )
  LOOP
    IF related_count > 1000 THEN
      RAISE EXCEPTION 'related_scope_too_large';
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  should_cleanup boolean;
BEGIN
  SELECT execute_cleanup INTO STRICT should_cleanup FROM recovery_input;

  IF should_cleanup THEN
    DELETE FROM public.audit_events target
    USING recovery_audit_events scope
    WHERE target.id = scope.id;

    DELETE FROM public.organization_entitlements target
    USING recovery_organizations scope
    WHERE target.organization_id = scope.id;

    DELETE FROM public.organization_usage target
    USING recovery_organizations scope
    WHERE target.organization_id = scope.id;

    DELETE FROM public.enterprise_contracts target
    USING recovery_organizations scope
    WHERE target.organization_id = scope.id;

    DELETE FROM public.organization_members target
    USING recovery_organizations scope
    WHERE target.organization_id = scope.id;

    DELETE FROM public.organizations target
    USING recovery_organizations scope
    WHERE target.id = scope.id;

    IF EXISTS (
      SELECT 1
      FROM public.audit_events target
      JOIN recovery_audit_events scope ON scope.id = target.id
    ) THEN
      RAISE EXCEPTION 'audit_event_cleanup_not_verified';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.organization_entitlements target
      JOIN recovery_organizations scope ON scope.id = target.organization_id
    ) THEN
      RAISE EXCEPTION 'organization_entitlement_cleanup_not_verified';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.organization_usage target
      JOIN recovery_organizations scope ON scope.id = target.organization_id
    ) THEN
      RAISE EXCEPTION 'organization_usage_cleanup_not_verified';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.enterprise_contracts target
      JOIN recovery_organizations scope ON scope.id = target.organization_id
    ) THEN
      RAISE EXCEPTION 'enterprise_contract_cleanup_not_verified';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.organization_members target
      JOIN recovery_organizations scope ON scope.id = target.organization_id
    ) THEN
      RAISE EXCEPTION 'membership_cleanup_not_verified';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.organizations target
      JOIN recovery_organizations scope ON scope.id = target.id
    ) THEN
      RAISE EXCEPTION 'organization_cleanup_not_verified';
    END IF;
  END IF;
END
$$;

COMMIT;

SELECT jsonb_pretty(
  jsonb_build_object(
    'schema', 'risck-comply.audit-chain-synthetic-recovery.v1',
    'status', CASE WHEN input.execute_cleanup THEN 'Complete' ELSE 'PreflightPassed' END,
    'outcome', 'passed',
    'generatedAt', clock_timestamp(),
    'targetSha', input.target_sha,
    'sourceRunId', input.source_run_id,
    'recoveryWindow', jsonb_build_object(
      'from', input.recovery_from,
      'to', input.recovery_to
    ),
    'syntheticScope', jsonb_build_object(
      'purpose', 'audit-chain-live-proof',
      'auditAction', 'security.audit_chain_live_validation',
      'organizationsMatched', (SELECT value FROM recovery_counts WHERE key = 'organizations'),
      'auditEventsMatched', (SELECT value FROM recovery_counts WHERE key = 'audit_events'),
      'authUsersMatched', (SELECT value FROM recovery_counts WHERE key = 'auth_users'),
      'organizationEntitlementsMatched', (SELECT value FROM recovery_counts WHERE key = 'organization_entitlements'),
      'organizationUsageMatched', (SELECT value FROM recovery_counts WHERE key = 'organization_usage'),
      'enterpriseContractsMatched', (SELECT value FROM recovery_counts WHERE key = 'enterprise_contracts'),
      'organizationMembersMatched', (SELECT value FROM recovery_counts WHERE key = 'organization_members')
    ),
    'cleanup', jsonb_build_object(
      'verified', input.execute_cleanup,
      'transactional', true,
      'historicalFixtureCleanupAttempted', false,
      'protectedOrganizationIdsTouched', false
    ),
    'evidenceIntegrity', jsonb_build_object(
      'containsSensitiveValues', false,
      'rawIdentifiersStored', false,
      'credentialsStored', false
    ),
    'connectionPath', 'supabase_session_pooler',
    'startedAt', input.started_at
  )
)::text
FROM recovery_input input;
