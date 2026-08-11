# Supabase RLS ai_assessments proof chain

## Why this exists

The Enterprise Production Gate consumes retained exact-SHA Supabase RLS evidence through `scripts/enterprise/fetch-supabase-rls-evidence.mjs`. The release validator intentionally requires one passing `tablesReviewed` entry for every release-critical table, including `ai_assessments`.

The base live tenant-isolation runner does not cover `ai_assessments`. That table has a dedicated protected runner, `scripts/security/run-supabase-live-ai-assessments-rls.mjs`, which appends its live tenant-isolation cases to the same `supabase-live-rls-validation.json` evidence document.

A successful producer artifact is release-creditable only when the complete proof chain is executed before GitHub Actions provenance is stamped:

1. `run-supabase-live-tenant-isolation.mjs` creates the base live RLS evidence.
2. `run-supabase-live-ai-assessments-rls.mjs` appends the dedicated `ai_assessments` tenant-isolation proof.
3. `stamp-supabase-live-rls-provenance.mjs` binds the complete evidence to the exact GitHub Actions run and SHA.
4. Source and scorecard validators run against the final redacted artifact.

## Failure mode closed

For main SHA `1abc316c4eded523d811b52936763bf6368d7bc2`, Supabase Live RLS Validation completed successfully but its artifact did not contain an `ai_assessments` entry because the workflow omitted step 2. The Enterprise Production Gate correctly refused to hydrate that artifact with `release_runtime_evidence_invalid` rather than promoting incomplete evidence.

The workflow now executes the dedicated runner before provenance stamping, and a static workflow contract test enforces that ordering.

## Safety boundary

- Repository permissions remain `contents: read`.
- Runtime evidence is uploaded as an artifact and is never committed by the workflow.
- The dedicated proof creates synthetic Supabase fixtures only inside the protected live-proof environment and removes them unless an explicit keep-fixtures flag is set.
- The workflow sets `RLS_LIVE_KEEP_FIXTURES=0` for the `ai_assessments` proof.
- No migration is applied automatically by this change. Migration application remains guarded by the existing explicit `workflow_dispatch` input.
- A failed or incomplete proof remains fail-closed and cannot be normalized into release evidence.
