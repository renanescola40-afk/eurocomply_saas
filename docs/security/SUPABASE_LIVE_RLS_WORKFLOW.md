# Supabase Live RLS Workflow

This workflow is the operator path for producing final runtime evidence for EuroComply's multi-tenant Supabase RLS control.

## Purpose

Repository checks prove that migrations, policies, tests, and release gates are wired correctly. Final completion requires a live Supabase run that creates tenant A and tenant B, creates users for each tenant, verifies tenant A cannot read/write/update/delete tenant B rows, and confirms same-tenant reads still work.

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
- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` marks only the Supabase live RLS row as `Complete`.

## Failure rule

If the workflow fails, do not manually edit evidence to Complete. Fix the migration, policy, or Supabase configuration issue, then re-run the workflow.

## Current completion state

Until this workflow passes against the target Supabase project and its evidence PR is merged, production remains blocked by the P0 runtime evidence register and release Go/No-Go gates.
