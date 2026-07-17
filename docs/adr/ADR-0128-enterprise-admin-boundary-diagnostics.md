# ADR-0128: Expose administrative-client boundary failures in the enterprise scorecard

## Status

Accepted for implementation in a draft pull request.

## Context

The Enterprise Readiness Scorecard runs two independent source-level administrative-client boundary controls:

1. the Supabase service-role boundary check;
2. the strict client-boundary scan.

The repository-control evidence builder combined both results into one boolean and always emitted `exitCode: null`. When either control failed, the scorecard stopped before generation, but the retained evidence could not identify which gate failed. This made a legitimate fail-closed control unnecessarily difficult to diagnose and encouraged repeated blind retries.

## Decision

Add a dedicated preflight diagnostic step that:

- executes both controls independently with the same strict environment used by evidence generation;
- preserves fail-closed behavior when either command fails, times out, or cannot execute;
- emits a stable GitHub Actions error annotation naming only the failed control and sanitized failure class;
- includes captured stdout and stderr in the ephemeral job log for operator diagnosis;
- does not write command output into retained evidence artifacts;
- runs before repository-control evidence generation.

A source contract test locks the workflow ordering, strict scan environment, independent execution, and non-zero failure behavior.

## Consequences

The scorecard will still fail whenever either administrative-client boundary control fails. The difference is that operators can identify the failing control directly from the exact-SHA workflow log instead of receiving an undifferentiated `adminBoundary: false` result.

Job logs may include repository paths and findings emitted by the existing security scripts. They remain subject to GitHub Actions access controls and retention. No environment values, secrets, provider payloads, or customer data are intentionally printed by the diagnostic wrapper.

## Evidence boundary

This change improves diagnostic integrity and traceability. It does not prove live Supabase configuration, secret rotation, runtime tenant isolation, or absence of every possible client/server boundary defect.

## Verification

Run:

```bash
npx vitest run tests/enterprise/admin-boundary-diagnostics.test.ts
node scripts/enterprise/check-admin-boundary-evidence.mjs
```

The exact PR head must also pass the required CI and security workflows. A failing boundary check must remain a failing scorecard.

## Rollback

Revert the workflow step, diagnostic script, test, and this ADR. Rollback restores the previous opaque failure mode and does not affect application runtime, database schema, RLS, RBAC, dependencies, or secrets.
