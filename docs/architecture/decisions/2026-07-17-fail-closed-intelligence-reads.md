# Fail closed when published Intelligence reads are unavailable

- **Date:** 2026-07-17
- **Status:** Proposed
- **Scope:** `src/server/queries/intelligence.ts`

## Context

The published Intelligence query layer used the optional privileged Supabase client and returned polished fallback editorial items when backend configuration was missing or a database query failed. The same fallback was also used for a successful query that returned no published rows.

This collapsed materially different states into one response:

1. the database successfully contained no published Intelligence items;
2. a requested static fallback article was intentionally available;
3. privileged backend configuration was missing;
4. the database, schema, provider, or query was unavailable.

For a governance product, presenting static regulatory summaries during an infrastructure failure can make unavailable content appear current, verified, and successfully published.

## Decision

Published Intelligence reads must fail closed on configuration and database errors.

- Use the required `createAdminClient()`.
- Throw the stable application error `intelligence_content_unavailable` when a list, external-ID, or UUID query fails.
- Log only the operation name and sanitized provider error code.
- Preserve fallback editorial content after a successful zero-row list query and for known non-UUID static article IDs.
- Preserve `null` for a successful lookup that finds no matching UUID record.

## Consequences

### Positive

- Backend outages are no longer represented as valid published regulatory intelligence.
- Operators and error boundaries can distinguish availability failures from legitimate empty or missing records.
- Provider details are not exposed to callers.

### Trade-offs

- Intelligence pages may surface an error during backend outages instead of remaining populated with fallback content.
- Static fallback items still remain a deliberate product fallback for successful empty datasets; this change does not claim they are runtime-sourced evidence.

## Validation

A security contract test asserts the required admin client, stable failure behavior, and the limited circumstances where fallback content remains allowed. Repository CI, typecheck, lint, and security gates remain authoritative.

## Rollback

Revert the source, contract test, and this decision record together. No database migration or data rollback is required.
