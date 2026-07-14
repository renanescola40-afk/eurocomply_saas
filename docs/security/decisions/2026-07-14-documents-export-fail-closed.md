# Decision: fail closed when the documents export backend is unavailable

Date: 2026-07-14
Status: Proposed in draft pull request

## Context

`GET /api/reports/documents.csv` is a paid, permission-gated export that can be retained or shared as governance evidence. On `main`, if the privileged Supabase client cannot be created, the route returns HTTP 200 with a header-only CSV and records a successful `report.export` audit event with `fallback: true`.

That response is indistinguishable from a successful database query returning zero documents. A configuration or backend-availability failure can therefore be represented as a valid empty document register.

Repository inspection establishes this control-flow gap only. It does not establish that the condition occurred in production or that any customer relied on an affected export.

## Decision

When the privileged export client is unavailable, the route will:

- report a sanitized configuration-area error;
- return a no-store HTTP 503 response;
- not emit CSV content;
- not record a successful export audit event.

A successful database query that returns zero rows will continue to produce a valid header-only CSV and a normal export audit event.

## Impact

The change improves export and audit integrity by making backend unavailability explicit. Authentication, organization context, RBAC, plan entitlement, tenant-scoped rate limiting, query scoping, CSV formatting, successful empty exports, and successful audit logging remain unchanged.

No schema, migration, secret, environment variable, provider, infrastructure, or existing data changes are included.

## Risks and trade-offs

- Users receive a retryable error instead of a superficially available fallback file.
- The change does not add retries, alternate storage, runtime monitoring, or production evidence.
- Existing exports and historical audit records are unchanged.
- The focused regression test enforces the source contract; it does not replace integration or production-like validation.

## Validation

The pull request adds a focused Vitest regression test. Repository CI on the final head SHA remains the authoritative evidence for lint, typecheck, tests, build, security workflows, and release gates. No check is claimed as passed until GitHub reports it green.

## Evidence boundaries

This decision does not claim compliance certification, an external audit, a penetration test, complete audit coverage, production configuration correctness, runtime database availability, or tenant-isolation proof.

## Rollback

Revert the pull request. No migration, data rewrite, credential rotation, provider change, or infrastructure rollback is required. Reversion restores the prior header-only fallback and successful fallback audit event.
