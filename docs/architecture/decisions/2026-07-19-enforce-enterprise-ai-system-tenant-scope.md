# Enforce enterprise AI-system tenant scope

- **Date:** 2026-07-19
- **Status:** Proposed
- **Severity:** P1

## Context

`enterprise_vendor_due_diligence` and `enterprise_risk_reviews` each store both an `organization_id` and an optional `ai_system_id`. Their row-level-security policies authorize access using the governance row's `organization_id`, while the original foreign keys only prove that the referenced AI system exists.

That leaves a tenant-integrity gap: a privileged or future service-role writer could persist a governance record for organization A that references an AI system owned by organization B. The row would then be visible and manageable under organization A's RLS boundary while carrying a cross-tenant AI-system reference.

## Decision

Add a database trigger shared by both enterprise governance tables. For non-null `ai_system_id` values, the trigger requires a matching AI-system row with the same `organization_id` before inserts and relevant updates are accepted.

The trigger function is `SECURITY DEFINER`, uses an empty `search_path`, fully qualifies referenced objects, and is not directly executable by `public`, `anon`, or `authenticated` roles.

## Impact

- Cross-tenant AI-system references are rejected at the database boundary.
- Enforcement covers application code, RPCs, service-role writers, migrations, and future integrations.
- Rows without an AI-system reference remain valid.
- Existing authorization and RLS policies are unchanged.

## Risks and trade-offs

- This is prospective enforcement. The migration does not claim that historical rows were scanned or remediated.
- A tenant-transfer workflow that changes an AI system's organization independently of linked governance rows may require an explicit coordinated migration.
- Writes that previously relied on cross-tenant or stale identifiers will fail with PostgreSQL `check_violation`; callers should preserve generic error handling.
- The trigger adds one indexed primary-key lookup per affected write.

## Validation

A repository contract test verifies the tenant-match predicate, both protected tables, nullable-reference behavior, trigger coverage, hardened function configuration, and revoked execution privileges.

No production database migration execution, historical-data audit, penetration test, or runtime evidence is represented by this decision record. Merge requires all exact-head repository checks to pass and human review of the prospective-enforcement trade-off.

## Rollback

Create a follow-up migration that drops both triggers and then drops `public.enforce_enterprise_ai_system_tenant_scope()`. Do not rewrite migration history after deployment. Rollback reopens the cross-tenant reference risk and therefore requires a documented security decision.
