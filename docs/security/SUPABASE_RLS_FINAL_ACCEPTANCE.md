# Supabase RLS Final Acceptance

This is the final handoff checklist for closing the Supabase multi-tenant isolation work at 100%.

## Current expected state

The repository is considered implementation-ready when these commands are available and documented:

```bash
node scripts/security/check-supabase-live-rls-preflight.mjs
node scripts/security/report-supabase-rls-readiness.mjs
node scripts/security/report-supabase-rls-readiness.mjs --strict
```

The readiness score is expected to remain below 100% until the live Supabase validation workflow produces passing runtime evidence.

## Final execution checklist

Before running the live workflow:

- Confirm all Supabase RLS migrations are applied to the target project.
- Confirm GitHub Actions secrets are configured for the target project.
- Run the preflight check locally or in CI.
- Confirm the runtime evidence JSON is still Open before the live run.
- Confirm no manual edits are made to mark evidence Complete.

After running the live workflow:

- Confirm the generated evidence PR updates `docs/security/evidence/runtime/supabase-live-rls-validation.json`.
- Confirm the evidence records `status: Complete` and `outcome: passed`.
- Confirm the evidence includes GitHub Actions provenance.
- Confirm the P0 runtime evidence register marks Supabase live RLS validation Complete.
- Run the readiness score in strict mode.
- Run the release Go/No-Go check for the target release mode.

## Completion definition

This work reaches 100% only when all of the following are true:

- The live tenant-isolation validator passed against the target Supabase project.
- Runtime evidence is committed from the workflow output.
- The evidence includes provenance for the workflow run and commit.
- The P0 runtime register is Complete for Supabase live RLS validation.
- The strict readiness score exits successfully.
- Production or enterprise release gates pass without exceptions for tenant isolation.

## Current remaining work

If the strict readiness score is still failing, the remaining work is runtime-only:

1. Run the manual Supabase live RLS workflow.
2. Review the generated evidence PR.
3. Merge the passing evidence.
4. Re-run strict readiness and release gates.
