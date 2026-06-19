# Supabase Live RLS Workflow

This workflow is the operator path for producing final runtime evidence for EuroComply's multi-tenant Supabase RLS control.

## Purpose

Repository checks prove that migrations, policies, tests, and release gates are wired correctly. Final completion requires a live Supabase run that creates tenant A and tenant B, creates users for each tenant, verifies tenant A cannot read/write/update/delete tenant B rows, and confirms same-tenant reads still work.

## Preflight

Before running the live workflow, run:

```txt
node scripts/security/check-supabase-live-rls-preflight.mjs
```

The preflight checks that the repository is ready for the live evidence run:

- manual workflow exists
- strict tenant-isolation validator exists
- runtime evidence JSON is present and either `Open` or valid `Complete`
- P0 register references the live validator and remains `Open` until evidence passes
- required RLS migrations are present
- required critical tables and cross-tenant operations are covered by the validator
- workflow/runbook/evidence paths are wired together

A passing preflight means the remaining work is operational: apply migrations to the target Supabase project, configure GitHub Actions secrets, run the workflow, review the generated evidence PR, and merge it.

## Readiness score

Use the readiness report when you need a single percentage for release tracking:

```txt
node scripts/security/report-supabase-rls-readiness.mjs
```

Use strict mode in release automation when the target must already be 100% complete:

```txt
node scripts/security/report-supabase-rls-readiness.mjs --strict
```

The score is `100%` only when the runtime evidence is `Complete`, `outcome: passed`, has required table and operation coverage, includes GitHub Actions provenance, and the P0 register row is also `Complete`.

## Manual workflow

Run this GitHub Actions workflow manually:

```txt
Supabase Live RLS Validation
```

The workflow runs:

```txt
node scripts/security/run-supabase-live-tenant-isolation.mjs
node scripts/security/check-p0-runtime-evidence-register.mjs
node scripts/security/enforce-supabase-rls-live-complete.mjs
```

When validation passes, it commits these files to the configured evidence branch and opens a pull request:

```txt
docs/security/evidence/runtime/supabase-live-rls-validation.json
docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md
```

## Required GitHub Actions secrets

Configure these repository or environment secrets before running the workflow:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The workflow never prints secret values. The generated evidence must remain redacted.

## Expected result

A passing run creates an evidence PR where:

- `docs/security/evidence/runtime/supabase-live-rls-validation.json` has `status: Complete`.
- The same JSON has `outcome: passed`.
- The evidence includes cross-tenant read, insert, update, and delete denial.
- The evidence includes same-tenant read coverage.
- The evidence includes GitHub Actions workflow/run/commit provenance.
- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` marks only the Supabase live RLS row as `Complete`.

## Failure rule

If the workflow fails, do not manually edit evidence to Complete. Fix the migration, policy, or Supabase configuration issue, then re-run the workflow.

## Current completion state

Until this workflow passes against the target Supabase project and its evidence PR is merged, production remains blocked by the P0 runtime evidence register and release Go/No-Go gates.
