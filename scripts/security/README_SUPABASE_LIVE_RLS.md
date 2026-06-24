# Supabase live RLS validation

Runtime validation is executed through `scripts/security/run-supabase-live-tenant-isolation.mjs`.

The public runner path is intentionally a small wrapper around `run-supabase-live-tenant-isolation-v2.mjs` so existing npm scripts and evidence commands keep using the original command while the implementation remains easier to review.

The live runner must only mark evidence `Complete` after a real target Supabase run passes. It creates controlled tenant A/B fixtures, validates per-table RLS enablement through `eurocomply_live_rls_inventory`, checks cross-tenant read/write denial, checks same-tenant allowed reads, checks viewer/admin separation, and documents service-role setup/inventory/integrity/cleanup paths.

Required runtime environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase service role key stored in the deployment/runtime environment
- `GITHUB_SHA` or a local Git checkout that resolves to a 40-character SHA

The manual GitHub Actions workflow can also apply committed Supabase migrations before running the live proof. Keep `apply_migrations=true` and configure the `SUPABASE_DB_URL` secret with the target Supabase Postgres connection string. This applies migrations such as `supabase/migrations/20260623120000_live_rls_validation_inventory.sql`, which creates the required `public.eurocomply_live_rls_inventory(text[])` helper.

If the database migration has already been applied outside the workflow, rerun the workflow with `apply_migrations=false`.

Do not commit generated `Complete` evidence unless it was produced by a real live run against the target Supabase project.
