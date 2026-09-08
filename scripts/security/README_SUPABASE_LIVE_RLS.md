# Supabase live RLS validation

Runtime validation is executed through `scripts/security/run-supabase-live-tenant-isolation.mjs` and the manual `Supabase Live RLS Validation` GitHub Actions workflow.

The live proof is **post-promotion runtime evidence only**. It does not apply migrations, does not run `supabase db push`, and does not accept an `apply_migrations` input.

## Production authority prerequisite

Before the live proof is eligible to run, the exact current `main` SHA must already have a successful governed production promotion produced by:

`.github/workflows/supabase-forward-reconciliation-production-promotion.yml`

The workflow requires the successful promotion run ID and verifies that:

- the promotion run is bound to the same exact SHA;
- the source workflow is the canonical forward-reconciliation production promotion;
- the source run was manually dispatched and completed successfully;
- current protected `main` is still the exact release SHA;
- Production project binding matches the runtime Supabase API project;
- promotion evidence and live postconditions are present before the tenant proof starts.

Any database helper required by the live proof must therefore already exist through the governed forward-promotion package and its postconditions. The live-proof workflow must never repair or install that helper directly.

## Required runtime environment variables

The protected runtime proof uses:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- the exact release SHA supplied to the workflow;
- the successful canonical promotion run ID.

`SUPABASE_DB_POOLER_URL` is used only by the protected Production project-binding job to derive a redacted project digest. The live proof does not use it to execute SQL or migrations.

## What the proof validates

The live runner creates controlled tenant A/B fixtures and validates:

- per-table RLS enablement through `eurocomply_live_rls_inventory`;
- cross-tenant read/write denial;
- same-tenant allowed reads;
- viewer/admin separation;
- service-role setup and bounded cleanup;
- the live inventory helper privilege boundary;
- exact-SHA GitHub Actions provenance.

The helper must remain `SECURITY INVOKER`, use a fixed `search_path`, deny `PUBLIC`, `anon` and `authenticated` execution, and retain only the controlled `service_role` execution needed by the proof.

## Evidence rule

Do not mark evidence `Complete` unless a real live run against the intended Production Supabase project passes. Repository tests or local fixtures are not substitutes for live runtime evidence.

The generated evidence remains bound to the exact promoted SHA and the successful canonical production-promotion provenance.
