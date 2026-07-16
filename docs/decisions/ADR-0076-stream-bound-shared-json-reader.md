# ADR-0076: Stream-bound the shared JSON request reader

- Status: Proposed
- Date: 2026-07-16
- Priority: P1 security and availability hardening

## Context

API routes use `readBoundedJsonRequest` to apply a default 64 KiB JSON body limit and route-specific overrides. The helper rejected declared `Content-Length` values above the configured limit, but then called `Request.text()` and checked the byte length only after the complete request body had been buffered.

A chunked request, a request without `Content-Length`, or a request with a misleading declared length could therefore consume memory beyond the intended application boundary before rejection. Because the helper is shared, the weakness affected every route relying on it rather than one isolated endpoint.

This finding is based on repository source. No production exploitation, outage, audit finding, or penetration-test result is claimed.

## Decision

Read request bodies through `request.body.getReader()` and count raw bytes as chunks arrive.

- preserve the existing early `Content-Length` rejection;
- cancel the reader as soon as the configured byte limit is exceeded;
- retain only chunks within the accepted bound;
- decode UTF-8 with fatal error handling before JSON parsing;
- fail closed on stream-read and decoding failures;
- prohibit `request.text()` and `request.json()` inside the shared helper through the security contract check.

## Consequences

### Positive

- undeclared-length and chunked bodies are rejected while streaming rather than after complete buffering;
- the shared primitive gives consistent bounded behavior to all current callers;
- invalid UTF-8 is rejected deterministically before JSON parsing;
- no route schema, response contract, authorization policy, database schema, or dependency changes are required.

### Trade-offs and limits

- accepted request bodies are still buffered up to the configured limit so they can be parsed as JSON;
- stream cancellation is best-effort and does not replace proxy or platform connection limits;
- this change does not prove production memory characteristics or prevent every denial-of-service technique;
- callers remain responsible for choosing appropriately small route-specific limits.

## Verification

Focused unit and security-contract coverage verifies:

- valid bounded JSON still parses;
- declared oversize bodies are rejected before reading;
- misleading or absent lengths cannot bypass the byte limit;
- an oversized stream is cancelled during reading;
- invalid UTF-8 fails closed;
- the shared helper does not regress to `request.text()` or `request.json()`.

GitHub Actions remains authoritative for lint, typecheck, unit tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, enterprise gates, and release checks on the exact pull-request head.

## Evidence boundary

Evidence is limited to repository source, diff, tests, and automated checks. No runtime evidence file is created or modified. This ADR does not claim production deployment, observed memory reduction, incident remediation, legal compliance, external audit completion, or penetration-test coverage.

## Rollback

Revert the pull request. The shared reader will again buffer complete request bodies before applying the post-read byte check. No migration, schema rollback, provider action, credential rotation, or customer-data repair is required.
