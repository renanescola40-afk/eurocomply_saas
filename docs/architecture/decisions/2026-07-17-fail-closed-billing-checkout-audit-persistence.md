# Fail closed when billing checkout audit persistence fails

- Date: 2026-07-17
- Status: Proposed
- Priority: P1
- Scope: self-serve Stripe checkout creation

## Context

The billing checkout route creates a Stripe Checkout Session and records a `checkout_created` audit event before returning the hosted checkout URL. The audit writer exposes whether the event was durably persisted, but the route previously ignored that result.

A database, schema, provider, or privileged-client failure could therefore leave the application returning a live checkout URL without the corresponding durable organization audit record. That weakens billing accountability and makes later investigation unable to distinguish an initiated checkout from an unaudited external side effect.

## Decision

The route now treats audit persistence as a required postcondition for returning the checkout URL.

When `writeAuditLog` reports `persisted: false`, the route:

1. attempts to expire the newly created Stripe Checkout Session as a compensating action;
2. reports only sanitized operational context;
3. returns a no-store `503` response with the stable code `checkout_audit_unavailable`;
4. does not disclose the Stripe-hosted checkout URL.

Failure to expire the session is reported for operations, but does not cause the URL to be returned. Existing authentication, tenant resolution, `manage_billing` permission checks, trusted-mutation protection, rate limiting, step-up authentication, plan validation, and Stripe-host validation remain unchanged.

## Consequences

Checkout availability now depends on durable audit storage. During an audit-store outage, users receive a retryable service-unavailable response rather than an unaudited checkout URL.

The compensating expiration is best effort because Stripe and the audit store are not part of one transaction. A Stripe customer created immediately before the session may remain present, and an expiration API failure can leave an unreachable open session. The application still fails closed because it never returns that session URL.

## Evidence boundary

The regression test verifies repository control flow and preservation of existing guards. It does not prove Stripe runtime behavior, provider availability, production audit durability, webhook delivery, or successful compensation in a deployed environment.

## Rollback

Revert the route change, regression test, and this decision record. Rollback restores the previous availability behavior, including the known risk that a checkout URL may be returned without durable audit evidence.
