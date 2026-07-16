# ADR-0078: Bound transactional email provider calls

- Status: Proposed
- Date: 2026-07-16
- Decision owners: Engineering and SRE
- Scope: `src/lib/email/server-sender.ts`

## Context

The shared transactional email sender calls the Resend API from application and background-job paths. The request previously had no application-level deadline, and the response was parsed with `Response.json()` without a byte boundary.

A stalled provider connection could therefore hold an invocation until the hosting platform deadline. Because the sender retries failures, one stalled provider call could also consume the delivery worker's remaining execution window. A malformed or unexpectedly large provider response could be buffered before parsing.

Introducing a client-side timeout also creates an unknown-outcome case: Resend may accept an email before the local request is aborted. Retrying that POST without an idempotency key can deliver the same billing, invitation, or onboarding message more than once.

This finding is based on repository source only. No production outage, provider incident, duplicate delivery, data exposure, external audit finding, or penetration-test result is claimed.

## Decision

1. Apply a 10-second `AbortSignal.timeout` to each Resend request.
2. Limit each provider response body to 64 KiB.
3. Reject an oversized declared `Content-Length` before reading the body.
4. Count streamed bytes and cancel the reader as soon as the limit is exceeded.
5. Parse JSON only after the bounded response has been read.
6. Preserve a caller-provided idempotency key after trimming and reject keys above the provider's 256-character limit.
7. When a caller omits a key, create one UUID-backed operation key before the retry loop and reuse it for every attempt in that `sendEmail` invocation.
8. Preserve the existing retry, redaction, logging, and delivery-result behavior.

## Consequences

### Positive

- A single provider attempt has a deterministic application-level deadline.
- Oversized chunked or undeclared-length responses cannot be fully buffered by this sender.
- Existing retry behavior can advance after a timeout instead of waiting for the platform deadline.
- Retries within one sender invocation carry the same idempotency key, so an accepted request with a delayed or lost response is not intentionally submitted as a new delivery operation.
- Explicit business-level keys continue to support deduplication across job or application retries.
- Generated keys are persisted in delivery logs, allowing queued, sent, and failed states from one operation to update the same record.
- No schema, migration, dependency, RBAC, RLS, entitlement, or secret change is required.

## Risks and trade-offs

- A legitimate provider request taking longer than 10 seconds is treated as failed and may be retried.
- `AbortSignal.timeout` requests cancellation but does not prove that every upstream or network resource is immediately released.
- Valid provider responses above 64 KiB are rejected.
- The accepted response remains buffered up to the configured limit so it can be decoded and parsed.
- An automatically generated key protects retries inside one `sendEmail` invocation only. Callers that need deduplication across separate job executions must continue supplying a stable business-level key.
- Delivery deduplication depends on Resend honoring its current idempotency contract and retention window.
- Rejecting an oversized caller key is fail-closed and may surface a previously hidden integration defect.

## Evidence boundary

Repository source, diff, focused source-contract tests, Resend's published idempotency contract, and GitHub Actions on the exact PR head are the only evidence produced by this change. This ADR does not prove production deployment, observed latency improvement, provider delivery, absence of historical duplicates, incident remediation, legal compliance, external audit completion, or penetration-test coverage.

## Rollback

Revert this ADR, the focused test, and the sender change. The sender will again call Resend without an application-level timeout, parse the provider response without a byte boundary, and allow retry attempts to omit a provider idempotency key. No database rollback, provider action, credential rotation, or customer-data repair is required for the code rollback.
