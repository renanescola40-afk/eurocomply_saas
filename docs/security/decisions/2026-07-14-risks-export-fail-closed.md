# Risks CSV export fails closed when its data backend is unavailable

Date: 2026-07-14
Status: proposed
Priority: P1 integrity and operability

## Context

`GET /api/reports/risks.csv` is an authenticated, tenant-scoped governance export. The route reads risk-register data through the privileged Supabase client.

Before this change, failure to construct that client returned HTTP 200 with a header-only CSV and wrote a successful `report.export` audit event with `fallback: true`. A caller could not distinguish a genuinely empty risk register from a backend configuration outage. That is unsafe for a governance export because an empty file may be retained or shared as evidence.

## Decision

When the privileged data client cannot be created, the route now:

- reports a sanitized configuration-area error;
- returns a no-store HTTP 503 response;
- does not create a CSV download;
- does not write a successful export audit event.

Normal empty datasets still produce a valid header-only CSV after a successful database query.

## Impact

Only the risks CSV route's backend-unavailable branch changes. Authentication, tenant scoping, rate limiting, query fields, CSV escaping and successful export auditing are unchanged.

## Risks

Operators who previously received a superficially successful empty CSV will now see an explicit temporary failure. This is an intentional availability trade-off in favor of evidence integrity.

This change does not prove production configuration, database availability, tenant isolation, audit completeness or external compliance. No runtime evidence, audit or pentest is claimed.

## Tests and evidence

A source-level regression test verifies that the unavailable-client branch returns 503 and cannot emit a CSV or successful export audit event. GitHub Actions on the pull request are the authoritative validation evidence.

## Rollback

Revert the pull request. No schema, migration, data, credential, infrastructure or deployment rollback is required.
