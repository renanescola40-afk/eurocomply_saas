# ADR-0080: Bound daily-maintenance sub-job responses

- Status: Proposed
- Date: 2026-07-16

## Context

`/api/internal/daily-maintenance` invokes four authenticated internal jobs sequentially. Each fetch already has an application-level timeout, but successful and error responses were parsed with `Response.json()` without a byte boundary.

A malformed internal route, framework error page, proxy response, or unexpectedly large diagnostic payload could therefore be buffered in full by the orchestrator. Because the orchestrator collects every sub-job body into one batch response, unbounded parsing also increased the chance of memory pressure and an oversized final response.

This finding is based on repository source. It does not claim that an oversized response occurred in production, that an incident took place, or that an external audit or penetration test identified the issue.

## Decision

Limit each maintenance sub-job response to 64 KiB before JSON parsing.

The reader:

- rejects a declared `Content-Length` above 64 KiB;
- reads chunked or undeclared bodies progressively;
- cancels the stream once the byte limit is exceeded;
- decodes UTF-8 and parses JSON only after bounded reading;
- marks an oversized response as a failed sub-job with `job_response_too_large`;
- preserves the existing fetch timeout, authentication headers, job ordering, batch status semantics and no-store behavior.

## Consequences

A legitimate internal job returning more than 64 KiB is now reported as failed even when its HTTP status is successful. Current maintenance responses are expected to be compact summaries, so this is preferable to allowing an operational orchestrator to buffer arbitrary payloads.

Invalid JSON remains represented as a null body, matching the previous tolerant parsing behavior.

No database migration, dependency, secret, provider configuration, RLS, RBAC or customer-data change is required.

## Tests and evidence

Repository tests cover:

- successful bounded JSON parsing;
- early rejection from an oversized declared content length;
- streaming rejection for an oversized chunked response.

GitHub Actions on the exact pull-request head is authoritative for lint, typecheck, unit tests, build, security suites and release gates. This ADR is design evidence only and is not runtime evidence.

## Rollback

Revert the pull request. The orchestrator will again parse sub-job responses with unbounded `Response.json()`. No schema rollback, migration, credential rotation, provider action or customer-data repair is required.
