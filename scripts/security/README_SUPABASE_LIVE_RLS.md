# Supabase live RLS validation

Runtime validation is executed through `scripts/security/run-supabase-live-tenant-isolation.mjs`.

The public runner path is intentionally a small wrapper around `run-supabase-live-tenant-isolation-v2.mjs` so existing npm scripts and evidence commands keep using the original command while the implementation remains easier to review.

The live runner must only mark evidence `Complete` after a real target Supabase run passes. It creates controlled tenant A/B fixtures, validates per-table RLS enablement through `eurocomply_live_rls_inventory`, checks cross-tenant read/write denial, checks same-tenant allowed reads, checks viewer/admin separation, and documents service-role setup/inventory/integrity/cleanup paths.

Required runtime environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase service role key stored in the deployment/runtime environment
- `GITHUB_SHA` or a local Git checkout that resolves to a 40-character SHA

The manual GitHub Actions workflow can apply the committed live RLS inventory helper migration before running the live proof. Keep `apply_migrations=true` and configure the `SUPABASE_DB_URL` secret with the target Supabase Postgres connection string. The workflow applies only `supabase/migrations/20260623120000_live_rls_validation_inventory.sql`, which creates the required `public.eurocomply_live_rls_inventory(text[])` helper. It intentionally does not run a full `supabase db push` because historical application migrations may depend on tables outside the minimal live-RLS proof scope.

`SUPABASE_DB_URL` must use Supabase's IPv4 Transaction pooler URI, not the direct database URI. GitHub-hosted runners often cannot reach the direct `db.<project-ref>.supabase.co:5432` IPv6-only endpoint. Copy the Transaction pooler connection string from the Supabase dashboard under `Connect > Transaction pooler`; it typically uses port `6543`.

If the helper migration has already been applied outside the workflow, rerun the workflow with `apply_migrations=false`.

Do not commit generated `Complete` evidence unless it was produced by a real live run against the target Supabase project.
