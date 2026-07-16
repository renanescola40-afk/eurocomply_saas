# ADR-0078: Bound transactional email provider calls

- Status: Proposed
- Date: 2026-07-16
- Decision owners: Engineering and SRE
- Scope: `src/lib/email/server-sender.ts`

## Context

The shared transactional email sender calls the Resend API from application and background-job paths. The request previously had no application-level deadline, and the response was parsed with `Response.json()` without a byte boundary.

A stalled provider connection could therefore hold an invocation until the hosting platform deadline. Because the sender retries failures, one stalled provider call could also consume the delivery worker's remaining execution window. A malformed or unexpectedly large provider response could be buffered before parsing.

This finding is based on repository source only. No production outage, provider incident, data exposure, external audit finding, or penetration-test result is claimed.

## Decision

1. Apply a 10-second `AbortSignal.timeout` to each Resend request.
2. Limit each provider response body to 64 KiB.
3. Reject an oversized declared `Content-Length` before reading the body.
4. Count streamed bytes and cancel the reader as soon as the limit is exceeded.
5. Parse JSON only after the bounded response has been read.
6. Preserve the existing retry, idempotency-key, redaction, logging, and delivery-result behavior.

## Consequences

### Positive

- A single provider attempt has a deterministic application-level deadline.
- Oversized chunked or undeclared-length responses cannot be fully buffered by this sender.
- Existing retry behavior can advance after a timeout instead of waiting for the platform deadline.
- No schema, migration, dependency, RBAC, RLS, entitlement, or secret change is required.

### Trade-offs

- A legitimate provider request taking longer than 10 seconds is treated as failed and may be retried.
- `AbortSignal.timeout` requests cancellation but does not prove that every upstream or network resource is immediately released.
- Valid provider responses above 64 KiB are rejected.
- The accepted response remains buffered up to the configured limit so it can be decoded and parsed.

## Evidence boundary

Repository source, diff, focused source-contract tests, and GitHub Actions on the exact PR head are the only evidence produced by this change. This ADR does not prove production deployment, observed latency improvement, provider delivery, incident remediation, legal compliance, external audit completion, or penetration-test coverage.

## Rollback

Revert this ADR, the focused test, and the sender change. The sender will again call Resend without an application-level timeout and parse the provider response without a byte boundary. No database rollback, provider action, credential rotation, or customer-data repair is required for the code rollback.
