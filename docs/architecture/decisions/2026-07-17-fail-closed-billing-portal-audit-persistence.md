# Fail closed when billing portal audit persistence is unavailable

- Date: 2026-07-17
- Status: Proposed
- Scope: `POST /api/billing/portal`
- Priority: P1 billing accountability and audit integrity

## Context

The billing portal endpoint creates a privileged Stripe Billing Portal session that can be used to manage an organization's subscription and payment configuration. The route already requires authentication, organization context, `manage_billing` permission, trusted-mutation controls, rate limiting, and step-up authentication.

After creating the Stripe portal session, the route writes a chained audit event through `writeAuditLog`. That API returns an explicit `persisted` result. The route previously ignored the result and returned the live Stripe portal URL even when the audit event was not durably stored.

This made an auditable billing-management action indistinguishable from an unaudited one during audit-store, database, schema, privileged-client, or provider failures.

## Decision

The endpoint must not disclose the Stripe Billing Portal URL unless the corresponding `billing_portal_created` audit event is successfully persisted.

When `writeAuditLog` reports `persisted: false`, the route:

1. emits a sanitized operational error under `billing_portal_audit`;
2. returns a no-store HTTP 503 response with `billing_portal_audit_unavailable`;
3. does not return the portal session URL.

The created Stripe portal session is not exposed to the caller. Stripe Billing Portal sessions do not provide the same explicit expiration compensation used for Checkout Sessions, so no unsupported cleanup claim is made.

## Impact

- Billing-management actions fail closed when accountability evidence cannot be written.
- Users may need to retry portal access after the audit subsystem recovers.
- Existing authentication, tenant scoping, RBAC, trusted-mutation, rate-limit, and step-up controls remain unchanged.
- No schema, migration, dependency, RLS, secret, or Stripe webhook behavior changes.

## Risks and mitigations

### Availability reduction

A temporary audit persistence failure now prevents access to the billing portal. This is intentional because subscription and payment-management actions are security-sensitive and should remain attributable.

### Orphaned, undisclosed portal session

Stripe may have created a short-lived portal session before the audit failure is known. The application withholds its URL, so it cannot be used through this response. The change does not claim deletion or expiration support that the Stripe Billing Portal API does not provide.

### False confidence from static regression coverage

The added test verifies the source-level fail-closed contract and ordering. It is not runtime evidence of Stripe, Supabase, or production behavior. Required CI and human review remain mandatory.

## Verification

Relevant verification includes:

- the focused Vitest security contract;
- repository lint and typecheck;
- existing security and enterprise gates;
- exact-head GitHub Actions status;
- human review of the deliberate availability tradeoff.

## Rollback

Revert the route, test, and this decision record together. Rolling back restores the prior behavior of returning a portal URL even when audit persistence fails; that regression must be explicitly accepted before rollback.
