# ADR-0079: Bound and validate Upstash rate-limit responses

## Status

Accepted.

## Date

2026-07-16

## Context

The shared production rate limiter calls the Upstash Redis REST pipeline with a three-second application-level timeout and fails closed when Redis is unavailable.

Before this change, a successful provider response was parsed with `Response.json()` without an application byte limit. A malformed, compromised, or unexpectedly large response could therefore be buffered before parsing. Because the rate limiter protects sensitive API routes, its provider boundary should remain small and deterministic.

The existing parser also modeled pipeline items as tuple-like arrays and read values from index `1`. The documented Upstash REST pipeline response is instead an array of objects such as `{ "result": 2 }` or `{ "error": "ERR ..." }`. Reading valid object responses through tuple indexes caused the limiter to fall back to a synthetic count of `1`, which could under-enforce configured limits.

This finding is based on repository source and the provider's published REST API contract only. It does not establish a production incident, exploit, provider compromise, historical bypass, external audit result, or penetration-test finding.

## Decision

Successful Upstash responses are limited to 64 KiB before JSON parsing and validated against the expected three-command pipeline contract.

The implementation:

- rejects invalid, negative, or oversized declared `Content-Length` values before reading;
- cancels the response body before rejecting an invalid or oversized declared length;
- reads chunked or undeclared-length responses through the body stream;
- counts raw bytes and cancels the reader immediately on overflow;
- decodes UTF-8 with fatal error handling;
- parses JSON only after the bounded read completes;
- requires exactly three object-shaped pipeline items for `INCR`, `EXPIRE NX`, and `TTL`;
- rejects any pipeline item containing an `error` field;
- requires a positive safe-integer counter, an `EXPIRE` result of `0` or `1`, and a non-negative safe-integer TTL;
- derives `success`, `remaining`, and `reset` only from the validated provider results;
- preserves the existing three-second request timeout and fail-closed production behavior.

## Consequences

A legitimate Upstash response larger than 64 KiB, malformed JSON, an unexpected response shape, a command-level error, an invalid counter, or an invalid TTL is treated as an unavailable security control. In production, the request remains blocked through the existing fail-closed path.

Valid pipeline responses now use the provider's actual counter and TTL rather than synthetic defaults. Accepted responses remain buffered only up to the configured limit because the pipeline payload must be decoded and parsed as JSON.

No database migration, dependency, RBAC, RLS, entitlement, secret, or provider configuration change is required.

## Risks and trade-offs

- Strict response validation can temporarily block production requests if Upstash changes its documented JSON response contract.
- A provider or proxy that serializes numeric Redis results as strings is rejected rather than coerced.
- A negative TTL is treated as unavailable even though Redis uses negative TTL values for special states; the rate-limit pipeline is expected to leave the key with an active expiration.
- Stream cancellation is best-effort and does not replace hosting-platform, proxy, or connection-level resource limits.
- Accepted responses remain buffered up to 64 KiB for UTF-8 decoding and JSON parsing.
- The 64 KiB threshold and response-shape rules should only be changed with provider documentation and runtime evidence.

## Validation

Focused behavior coverage proves that:

- the documented object response shape updates the real counter and remaining quota;
- a counter above the configured limit blocks the request;
- missing or extra pipeline items fail closed;
- command-level errors and invalid numeric results fail closed;
- oversized declared responses are cancelled before reading and fail closed;
- the original three-second timeout remains in place.

GitHub Actions on the exact pull-request head remain authoritative for lint, typecheck, unit tests, build, application security, CodeQL, Semgrep, Gitleaks, dependency review, Playwright, enterprise gates, and release evidence.

## Evidence boundary

Evidence is limited to repository source, the provider's published REST API contract, diff, focused regression tests, and automated CI on the exact pull-request head. This ADR does not prove production deployment, historical rate-limit behavior, observed memory reduction, provider behavior in the user's environment, incident remediation, legal compliance, external audit completion, or penetration-test coverage.

## Rollback

Revert the pull request. The rate limiter will again parse successful Upstash responses with unbounded `Response.json()` and read pipeline values through the former tuple-index assumptions. No schema rollback, migration, provider action, credential rotation, or customer-data repair is required.
