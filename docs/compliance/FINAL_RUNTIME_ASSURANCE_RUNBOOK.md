# Final Runtime Assurance Runbook

## Purpose

Promote the three remaining machine-verifiable runtime workstreams from the 80-point safe lane to a projected 96-point runtime boundary.

## Workstreams

- Readiness Scoring: exact-SHA scorecard generation and invariant checks.
- Vendor Assurance: isolated provider-failure classification and fail-closed fallback.
- Platform Controls: read-only branch-protection and required-check observation.

## Execution

1. Merge only after standard CI and security gates pass.
2. Run `Final Runtime Assurance` against an exact `main` SHA.
3. Retain the generated artifact for 90 days.
4. Verify `summary.json` reports 16 promoted points and projected runtime coverage 96.
5. Never copy generated evidence into accepted legal-review paths.

## No-GO conditions

- SHA mismatch;
- missing or failed assertion;
- invalid integrity digest;
- unexpected repository;
- missing artifact;
- runtime coverage claim above 96 without qualified legal review.

## Truth boundary

The campaign proves isolated technical behavior and repository control-plane observations. It does not prove customer production behavior, legal approval, certification or regulator acceptance.
