# Fail closed when organization billing context is unavailable

- Status: Proposed
- Date: 2026-07-17
- Priority: P1
- Scope: Organization subscription and usage reads

## Context

The shared billing query previously used the optional Supabase admin client. Missing privileged configuration returned a synthetic Starter plan with null status and zero usage. Subscription lookup errors returned `null`, while count errors returned `0`.

Those fallback values are all valid business states. As a result, callers could not distinguish an organization that genuinely has no active paid subscription or no usage from one whose billing data was unavailable because of configuration, schema, provider, connectivity, or database failure.

This ambiguity can affect entitlement display, usage-limit decisions, support diagnosis, and release confidence. It does not by itself prove that a paid entitlement was granted incorrectly, but it removes the ability to make a trustworthy decision from the returned context.

## Decision

Organization billing context reads will fail closed:

- require `createAdminClient()`;
- propagate missing privileged-client configuration;
- throw the stable application error `billing_context_unavailable` when subscription or usage queries fail;
- log only the affected table and sanitized Supabase error code;
- return zero usage only after a successful exact-count query returns zero or no count;
- retain the conservative Starter-plan result when a successful subscription read shows no active or trialing paid status.

## Consequences

### Positive

- unavailable billing data is no longer represented as a valid Starter/zero-usage context;
- entitlement and limit callers can use existing error boundaries rather than making decisions from synthetic data;
- successful inactive-subscription and genuine zero-usage behavior remains unchanged;
- tenant filters and exact count semantics remain explicit.

### Risks

- deployments with missing service-role configuration or database defects will surface an error where they previously displayed fallback values;
- callers without an adequate error boundary may need follow-up UX hardening;
- parallel reads may log more than one sanitized failure during a broad provider outage.

These are preferred to silently presenting untrustworthy billing state.

## Evidence boundary

This decision is supported by repository source, a focused regression contract, and required GitHub Actions results for the exact pull-request head SHA. It does not claim production Supabase availability, billing-provider correctness, subscription reconciliation, revenue assurance, an external audit, or a penetration test.

## Verification

Targeted regression command:

```bash
npx vitest run tests/security/billing-context-read-fail-closed.test.ts
```

Required repository checks must pass against the exact pull-request head before merge.

## Rollback

Revert the commits implementing this decision. Reversion restores synthetic Starter/zero-usage fallback behavior and its known ambiguity. No schema, migration, dependency, secret, RLS, RBAC, or external-provider rollback is required.
