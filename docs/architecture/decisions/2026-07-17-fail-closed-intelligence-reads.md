# Fail closed on Intelligence reads

Date: 2026-07-17
Status: Proposed

## Context

The published Intelligence query used an optional privileged Supabase client and substituted a static editorial fallback whenever configuration was missing, a database query failed, or no rows were returned. The item query also converted provider failures into fallback content or `null`.

Those outcomes are materially different. Static editorial samples, a genuinely empty feed, a missing article, missing privileged configuration, and a provider/database failure must not be represented as the same trustworthy product state.

## Decision

Published Intelligence reads require `createAdminClient()` and fail closed on database errors with stable application error codes. Provider messages are not propagated. Logs contain only the operation name and sanitized provider error code.

A successful zero-row feed returns an empty array. A successful lookup with no matching published item returns `null`. Static fallback items remain exported for explicitly labelled demo or development consumers, but production read functions no longer substitute them for unavailable persisted data.

## Consequences

- configuration and provider failures become visible to existing error boundaries;
- customers are not shown stale sample content as though it were current persisted Intelligence;
- valid empty and not-found states remain supported;
- callers that implicitly depended on fallback substitution may need presentation-layer unavailable states.

## Evidence boundary

The repository diff and regression contract prove source-level behavior only. They do not prove production database availability, freshness or legal accuracy of Intelligence content, source licensing, editorial review, runtime observability, an external audit, or penetration testing.

## Verification

Run:

```bash
npx vitest run tests/security/intelligence-read-fail-closed.test.ts
```

All required CI, security, release, and scorecard checks must pass for the exact PR head SHA before merge.

## Rollback

Revert the commits in this change. Rollback restores substitution of static fallback content during configuration and database failures and therefore requires an explicit product-integrity decision.
