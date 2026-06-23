# Supabase live RLS validation

Runtime validation is executed through `scripts/security/run-supabase-live-tenant-isolation.mjs`.

The public runner path is intentionally a small wrapper around `run-supabase-live-tenant-isolation-v2.mjs` so existing npm scripts and evidence commands keep using the original command while the implementation remains easier to review.

The live runner must only mark evidence `Complete` after a real target Supabase run passes. It creates controlled tenant A/B fixtures, validates per-table RLS enablement through `eurocomply_live_rls_inventory`, checks cross-tenant read/write denial, checks same-tenant allowed reads, checks viewer/admin separation, and documents service-role setup/inventory/integrity/cleanup paths.

Required runtime environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase service role key stored in the deployment/runtime environment
- `GITHUB_SHA` or a local Git checkout that resolves to a 40-character SHA

Do not commit generated `Complete` evidence unless it was produced by a real live run against the target Supabase project.
