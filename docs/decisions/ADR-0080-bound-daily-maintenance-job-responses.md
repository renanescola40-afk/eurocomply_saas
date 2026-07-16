# ADR-0080: Bound and validate daily-maintenance sub-job responses

## Status

Accepted.

## Date

2026-07-16

## Context

`/api/internal/daily-maintenance` invokes four authenticated internal jobs sequentially. Each fetch already has an application-level timeout, but successful and error responses were parsed with `Response.json()` without a byte boundary.

A malformed internal route, framework error page, proxy response, or unexpectedly large diagnostic payload could therefore be buffered in full by the orchestrator. Because the orchestrator collects every sub-job body into one batch response, unbounded parsing also increased the chance of memory pressure and an oversized final response.

The initial bounded reader retained the former tolerant parsing behavior: HTTP 2xx responses containing malformed JSON were represented as `body: null` and still marked successful. For an operational orchestrator, that can hide a truncated response, an HTML proxy page, or an internal route that violated its JSON contract.

This finding is based on repository source only. It does not claim that an oversized or malformed response occurred in production, that an incident took place, or that an external audit or penetration test identified the issue.

## Decision

Limit each maintenance sub-job response to 64 KiB before JSON parsing and require every successful sub-job response to contain valid object-shaped JSON.

The reader:

- validates declared `Content-Length` as a non-negative safe integer;
- rejects and cancels invalid or oversized declared lengths before reading;
- reads chunked or undeclared bodies progressively;
- counts raw bytes and cancels the reader once the byte limit is exceeded;
- treats body-stream failures as failed sub-jobs;
- decodes UTF-8 with fatal error handling;
- parses JSON only after bounded reading;
- rejects empty, malformed, primitive, null, or array-shaped JSON responses;
- returns stable non-sensitive error codes rather than retaining malformed response text;
- marks an HTTP response successful only when its status is successful and its bounded response contract is valid;
- preserves the existing fetch timeout, authentication headers, job ordering, aggregate batch status and no-store behavior.

## Consequences

A successful HTTP status no longer masks a malformed internal response. Valid maintenance responses continue to be included in the aggregate result as compact JSON objects. Invalid responses are represented by stable error objects and contribute to the batch failure count.

Current maintenance routes return JSON objects, so strict object-shape validation matches the existing internal contract. No database migration, dependency, secret, provider configuration, RLS, RBAC or customer-data change is required.

## Risks and trade-offs

- A legitimate internal job returning more than 64 KiB is reported as failed even when its HTTP status is successful.
- A future maintenance job that intentionally returns an array, primitive, empty body or HTTP 204 response will require an explicit contract change before being added to the orchestrator.
- Strict JSON validation can turn a previously tolerated proxy or framework response into a visible partial maintenance failure; this is intentional fail-safe behavior.
- Accepted responses remain buffered up to 64 KiB so they can be decoded and parsed.
- Stream cancellation is best-effort and does not replace hosting-platform, proxy or connection-level limits.
- The threshold and accepted response shape should only be changed with route-contract and runtime evidence.

## Validation

Repository tests cover:

- successful object-shaped JSON parsing within the limit;
- early rejection and cancellation for oversized declared content length;
- rejection of invalid, negative, fractional and unsafe declared lengths;
- streaming cancellation for oversized chunked responses;
- malformed JSON, invalid UTF-8 and non-object JSON failing closed;
- valid bounded JSON on a non-successful HTTP status remaining failed.

GitHub Actions on the exact pull-request head is authoritative for lint, typecheck, unit tests, build, Playwright, security suites, CodeQL, Semgrep, Gitleaks, dependency review, enterprise gates and release evidence. This ADR is design evidence only and is not runtime evidence.

## Evidence boundary

Evidence is limited to repository source, diff, focused tests and automated CI. This change does not prove production deployment, production execution of the daily job, absence of historical malformed responses, observed memory reduction, incident remediation, external audit completion or penetration-test coverage.

## Rollback

Revert the pull request. The orchestrator will again parse sub-job responses with unbounded `Response.json()` and may treat malformed successful responses as successful with a null body. No schema rollback, migration, credential rotation, provider action or customer-data repair is required.
