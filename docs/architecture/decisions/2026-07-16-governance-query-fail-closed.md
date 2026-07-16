# Fail closed without exposing provider errors in governance queries

- Date: 2026-07-16
- Status: Accepted
- Scope: shared server queries for AI systems, risks, vendors, and compliance tasks

## Context

Several governance reads treated an unavailable privileged Supabase client or a database query failure as a valid empty dataset. Separate AI-governance paths propagated the raw provider error object. Both behaviors are unsafe for an enterprise governance product:

- a fabricated empty register can mislead dashboards, evidence packs, risk prioritization, and operational decisions;
- a raw Supabase/Postgres error can expose provider details to an application error boundary or downstream caller.

A successful query that contains zero rows is a legitimate empty state. A failed query is not.

## Decision

All active governance register reads use the required server-only admin client and fail closed when privileged access or the query is unavailable.

On provider errors, the query layer:

1. logs only the stable provider error code;
2. does not log provider messages, details, hints, SQL, identifiers, or payloads;
3. throws a stable application-owned error message;
4. returns an empty array only after a successful zero-row query.

AI-system list, detail, history, creation, and reassessment paths follow the same provider-error sanitization rule.

## Consequences

- Infrastructure and database outages become visible failures instead of apparently valid empty governance state.
- Callers must rely on their existing secure error boundaries.
- Provider diagnostics remain available through sanitized codes without exposing raw provider text.
- No schema, migration, RLS, RBAC, dependency, secret, or tenant-filter behavior changes.

## Verification

`tests/security/server-query-error-sanitization.test.ts` prevents regressions by requiring:

- required admin-client creation for governance registers;
- no `tryCreateAdminClient` best-effort fallback in those reads;
- no raw `throw error` or `error.message` propagation;
- code-only provider logging;
- no empty-array return from an error branch;
- preservation of the successful zero-row empty result.

GitHub Actions on the exact pull-request head remains authoritative for lint, typecheck, unit tests, build, and security gates.

## Rollback

Revert the pull request. No database or infrastructure rollback is required. Reverting restores the prior risk of masking provider failures or propagating raw provider errors.
