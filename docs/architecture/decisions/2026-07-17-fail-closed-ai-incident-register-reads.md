# Fail closed on AI incident register read failures

- **Status:** Accepted
- **Date:** 2026-07-17
- **Severity:** P1
- **Scope:** AI governance, incident management, SRE, reporting integrity

## Context

The shared `listAiIncidents` query used the optional Supabase admin-client factory and returned an empty array when the service-role client could not be created. It also returned an empty array for database errors, including missing-table, provider, connectivity, and query failures.

An empty incident register is a valid business state. Returning the same value for infrastructure failures made those states indistinguishable. Downstream dashboards, reports, governance reviews, and incident-response workflows could therefore present or consume a false `no incidents` result while the underlying register was unavailable.

## Decision

`listAiIncidents` now:

1. requires `createAdminClient()`;
2. preserves the existing `organization_id` tenant filter and detected-date ordering;
3. logs only the provider error code on query failure;
4. throws a stable, sanitized application error rather than exposing the Supabase error;
5. returns an empty array only after a successful query returns zero rows.

The incident-creation RPC and audit-chain behavior are unchanged.

## Consequences

### Positive

- Infrastructure failures cannot masquerade as an empty AI-incident register.
- Governance, evidence, and incident-response consumers fail visibly instead of relying on misleading absence data.
- Provider details are not propagated to callers.
- Tenant isolation and deterministic ordering remain unchanged.

### Risks

- Pages or jobs that previously rendered an empty state during configuration or database failures will now enter their existing error boundary or fail the calling job.
- This may surface latent operational failures that were previously hidden. That is intentional and should be handled as an availability incident, not as a valid empty register.

## Evidence and limitations

The repository change and regression contract prove the code-level behavior only. They do not prove production database availability, migration deployment, runtime service-role configuration, or successful incident retrieval in production. No runtime evidence, audit, or penetration-test result is created by this decision.

## Verification

- Run the targeted Vitest contract: `npx vitest run tests/security/ai-incident-read-fail-closed.test.ts`.
- Run the repository's required lint, typecheck, unit, security, and release checks through GitHub Actions.
- Treat the change as incomplete until all required checks for the exact PR head SHA are green.

## Rollback

Revert the commits in the pull request. No database migration, dependency, secret, RLS, RBAC, or external-service change is required for rollback.
