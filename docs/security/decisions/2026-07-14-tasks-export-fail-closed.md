# Decision: fail closed when the tasks export backend is unavailable

Date: 2026-07-14
Status: Proposed
Priority: P1 operational and evidence integrity

## Context

`GET /api/reports/tasks.csv` requires an authenticated organization context and uses the privileged Supabase client to read tenant-scoped compliance tasks. On `main`, failure to construct that client produced a header-only CSV with HTTP 200 and wrote a successful `report.export` audit event marked as a fallback.

That behavior made a backend configuration or availability failure indistinguishable from a successful query returning zero tasks. A downloaded empty report could therefore be retained or shared as governance evidence even though the application had not read the source data.

Repository inspection establishes this control-flow gap only. It does not establish that the branch has occurred in production, that customer evidence was affected, or that an audit, certification, or penetration test has been performed.

## Decision

When the privileged export client cannot be created, the route will:

- report a sanitized configuration-area error;
- return a no-store HTTP 503 JSON response;
- not emit a CSV download;
- not write a successful `report.export` audit event.

A successful database query that returns zero rows remains a valid header-only CSV export and continues to receive the normal audit event.

## Consequences

### Positive

- Backend unavailability is distinguishable from an empty task inventory.
- Successful audit events correspond to exports backed by an executed database query.
- Operators receive a retryable service-unavailable signal without secret values or provider internals.

### Risks and limitations

- Users receive an error instead of a fallback file when the admin client is unavailable.
- This change does not add retries, alternate data sources, runtime monitoring, or production evidence.
- Existing downloaded reports and historical audit records are unchanged.
- The source-contract test protects the failure branch but does not replace integration or production-like validation.

## Validation

GitHub Actions on the pull request are the authoritative execution evidence. Relevant checks include the focused Vitest contract, lint, typecheck, unit tests, build, configured E2E, security workflows, static analysis, dependency review, secret scanning, and preview deployment where platform capacity permits.

No check is considered passed until the final pull-request head reports it green.

## Rollback

Revert the pull request. No schema migration, data rewrite, credential rotation, infrastructure change, or deployment rollback is required. Reversion restores the prior header-only fallback and successful fallback audit event.
