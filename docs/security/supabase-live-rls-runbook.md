# Supabase live RLS runbook

Use this runbook for the manual `Supabase Live RLS Validation` GitHub Actions workflow after the exact release SHA has already completed the governed Supabase forward-production promotion.

The live RLS workflow is a **runtime proof, not a migration writer**.

## Required authority before dispatch

You need:

- `release_sha`: the exact current protected `main` SHA;
- `promotion_run_id`: a successful `Supabase Forward Reconciliation Production Promotion` run for that exact SHA;
- confirmation: `EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF`.

The proof refuses to proceed unless the promotion run:

- has the same exact SHA;
- came from `.github/workflows/supabase-forward-reconciliation-production-promotion.yml`;
- was manually dispatched;
- completed successfully;
- still corresponds to current `main` when the protected proof begins.

## Required protected runtime secrets

The `supabase-live-rls-validation` environment supplies the runtime API credentials required by the tenant-isolation proof:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`.

A separate protected `Production` binding step uses `SUPABASE_DB_POOLER_URL` only to derive a redacted project digest. It does not execute migrations or SQL changes.

There is no `apply_migrations` input and no supported `SUPABASE_DB_URL` migration path in the current workflow.

## If the live inventory helper is missing or invalid

Do **not** apply a helper migration manually from this proof lane.

A missing helper, wrong privilege boundary, stale schema or failed live postcondition means the governed forward-promotion chain is incomplete for this release. Return to the canonical Supabase reconciliation/promotion path, update the selected forward package if necessary, rehearse it, complete the bounded dry-runs and Decision Gate, promote through the protected canonical writer, and then rerun this runtime proof.

The live proof must never become an alternate Production writer.

## What success proves

A successful run proves, on the exact promoted Production project and SHA:

- Production project binding matches the runtime Supabase API project;
- promotion evidence and live postconditions are valid;
- the live inventory helper retains the required privilege boundary;
- tenant A cannot read or mutate tenant B data;
- allowed same-tenant operations still work;
- role separation remains enforced;
- controlled fixtures are cleaned up;
- canonical RLS evidence is stamped with GitHub Actions provenance and bound to the exact SHA.

A repository test, preview, stale promotion run or local fixture cannot substitute for this runtime evidence.
