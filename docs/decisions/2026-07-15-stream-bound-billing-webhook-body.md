# Stream-bound the billing webhook request body

- Date: 2026-07-15
- Status: Proposed
- Priority: P1 security and SRE availability
- Scope: `POST /api/billing/webhook`

## Context

The billing Stripe webhook route already declared a one-megabyte application limit and rejected requests whose valid `Content-Length` exceeded that limit. When the header was absent, malformed, or did not reflect a chunked transfer, the route called `request.text()` and measured the encoded body only after the complete attacker-controlled request had been buffered and decoded.

The limit therefore constrained accepted payload size but did not provide an application-memory bound while receiving an undeclared or chunked oversized body. This conclusion is based only on repository source. There is no claim of exploitation, production impact, an outage, an external audit, or a penetration test.

## Decision

Read the request through its `ReadableStream` reader, count bytes before retaining each chunk, cancel and reject immediately when the cumulative byte limit is exceeded, and decode only a payload that remained within the existing limit.

Keep the declared `Content-Length` fast rejection. Preserve the exact accepted body string used by Stripe signature verification and preserve existing rate limiting, signature tolerance, audit actions, recovery behavior, duplicate handling, status codes, and `Cache-Control: no-store` responses.

## Impact

Undeclared or chunked oversized bodies are rejected while streaming instead of after complete buffering. Accepted webhook payloads continue to be verified with Stripe's raw-body signature API.

No database migration, schema, dependency, RBAC, RLS, entitlement, secret, provider configuration, public API expansion, webhook event policy, or customer-data behavior changes.

## Risks and trade-offs

- Accepted requests temporarily retain bounded chunks and one final contiguous byte array.
- Stream transport errors keep their existing failure propagation behavior.
- Cancellation is best effort and depends on runtime and upstream transport behavior; the application still returns a fail-closed oversized result once the limit is crossed.
- Repository tests do not prove edge-proxy limits, production memory behavior, network backpressure, provider delivery, or deployment health.
- The repository currently contains two Stripe webhook routes. This decision applies only to `/api/billing/webhook`; changes to `/api/stripe/webhook` are reviewed separately.

## Tests and evidence

Focused source-contract coverage requires:

- no use of `request.text()` in the billing webhook route;
- stream reader usage;
- byte counting before chunk retention;
- immediate cancellation and rejection after the existing limit;
- preservation of content-length rejection, raw signature verification, processing-failure semantics, and duplicate/unsupported flags.

GitHub Actions on the exact pull-request head remains authoritative for lint, typecheck, tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, enterprise gates, and release checks.

No runtime evidence file, audit artifact, pentest result, or production validation is created or modified by this decision.

## Rollback

Revert the commits that modify the billing webhook route, its focused test, and this decision record. The route will return to complete-body buffering before its encoded-size check. No schema rollback, data repair, credential rotation, provider action, or customer-data migration is required.
