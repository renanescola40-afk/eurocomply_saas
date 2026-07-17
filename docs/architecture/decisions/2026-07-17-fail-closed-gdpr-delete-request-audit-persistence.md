# Fail closed when GDPR deletion-request audit persistence is unavailable

- **Date:** 2026-07-17
- **Status:** Proposed
- **Scope:** `POST /api/gdpr/delete-request`
- **Risk classification:** P1 privacy accountability and audit integrity

## Context

The self-service GDPR deletion endpoint does not delete data immediately. It records a high-risk request that must later be reviewed against retention, legal-hold, billing, and audit obligations.

The route previously awaited `createAuditEvent` for `gdpr_delete_requested` but ignored the returned `persisted` flag. It then created a success notification and returned HTTP 200. When the privileged database client, audit-chain RPC, schema, or provider was unavailable, the product could therefore tell the requester that the deletion request had been received even though no durable request evidence existed.

This is materially different from failure to record a denied malformed request. The accepted request is the system-of-record trigger for a later privacy workflow and must not be acknowledged without durable evidence.

## Decision

The route must require `createAuditEvent(...).persisted === true` before it:

1. creates the success notification; or
2. returns the accepted deletion plan.

When persistence fails, the route returns a no-store HTTP 503 response with the stable code `gdpr_delete_request_audit_unavailable` and reports only sanitized operational context (`area`, organization ID, user ID, and the audit writer's stable reason).

The request has no separate mutable database record before the audit append, so no compensation transaction is required. The caller may safely retry after the audit subsystem recovers.

## Consequences

### Positive

- A successful response now means the deletion request has durable audit evidence.
- Privacy administrators are not expected to act on a request that was never persisted.
- Success notifications cannot claim receipt before the audit guard succeeds.
- Existing authentication, tenant resolution, RBAC, rate limiting, trusted-origin validation, step-up authentication, bounded JSON parsing, and exact confirmation remain unchanged.

### Trade-off

- The endpoint is intentionally unavailable while durable audit persistence is unavailable.
- A requester may need to retry, even though all validation and authorization checks succeeded.
- This change does not prove production database availability or audit-chain correctness; those require exact-environment runtime evidence.

## Evidence and verification

A source-contract regression test verifies that:

- the result of `createAuditEvent` is captured;
- HTTP 503 is returned when `persisted` is false;
- notification and success response occur only after the persistence guard;
- the existing high-risk mutation controls remain present.

CI, typecheck, lint, security, and release results are not represented as green until GitHub reports them green for the exact pull-request head SHA.

## Rollback

Revert the route commit and remove the associated test and this decision record. No schema, migration, secret, dependency, or persisted-data rollback is required.
