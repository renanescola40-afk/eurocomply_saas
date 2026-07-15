# Decision: reuse one streaming body bound for Stripe webhook routes

## Status

Proposed. Repository implementation and test evidence only. This record does not claim production deployment, exploitation, incident occurrence, external audit, penetration testing, provider delivery, or runtime memory validation.

## Context

`POST /api/stripe/webhook` and `POST /api/billing/webhook` each limit accepted payloads to 1,000,000 bytes and reject an oversized declared `Content-Length`. Both routes previously called `request.text()` when the header was absent or unreliable and measured the encoded result only after the full attacker-controlled body had been buffered and decoded.

Two independent PRs initially replaced that behavior with nearly identical route-local stream readers. Repository review then found the existing `src/server/security/read-bounded-request-body.ts`, already used by the internal malware-scanner boundary and already responsible for streaming byte counting, cancellation, empty-body handling and bounded buffer assembly.

Maintaining three copies of the same security primitive would create drift in cancellation behavior, byte ordering, empty-body semantics and future fixes.

Stripe signature verification requires the exact accepted request payload. The route wrappers must therefore preserve their current string contract without JSON parsing or normalization.

## Decision

Reuse `readBoundedRequestBody` from both webhook routes.

Each route retains its route-specific one-megabyte constant and existing declared-length compatibility function, then delegates actual streaming enforcement to the shared helper. The wrapper maps:

- `body_too_large` to the existing `null` route contract and HTTP 413 path;
- `empty_body` to the existing empty-string signature-verification path;
- an accepted `Buffer` to UTF-8 text for Stripe signature verification.

The shared helper remains responsible for:

- reading through `ReadableStreamDefaultReader`;
- counting bytes before retaining chunks;
- cancelling on the first excess chunk;
- concatenating no more than the configured limit;
- releasing the reader lock;
- rejecting invalid limits.

## Impact

- Undeclared or chunked oversized bodies are rejected while streaming on both Stripe webhook routes.
- Route-local duplicate stream implementations are removed.
- The shared primitive now has three proven consumers: Cloudmersive scanning, the primary Stripe webhook and the billing webhook.
- Accepted webhook payloads retain the existing string input to Stripe signature verification.
- Existing rate limiting, signature tolerance, audit actions, recovery handling, response codes and `no-store` behavior remain unchanged.
- No migration, dependency, secret, provider configuration, RBAC, RLS, entitlement or public API expansion is introduced.

## Risks and trade-offs

- Accepted requests retain bounded chunks plus one final contiguous `Buffer` before string decoding.
- Empty body remains routed through signature verification instead of receiving a new response code, preserving compatibility.
- The route wrappers retain a declared-length fast check in addition to the helper's own check; this is intentionally conservative and preserves existing exported contracts.
- Stream cancellation remains best effort and runtime-dependent.
- Repository tests do not prove edge-proxy enforcement, network backpressure or live provider delivery.

## Evidence boundary

Evidence is limited to the repository diff, shared-helper behavioral tests, webhook route tests, source contracts and GitHub checks on the exact pull-request head. No runtime evidence file is created, modified, simulated or upgraded.

## Rollback

Revert the route wrappers, tests and this record. Both webhook routes will return to reading complete bodies with `request.text()` before checking encoded size. No schema rollback, data repair, credential rotation, provider action or customer-data migration is required.
