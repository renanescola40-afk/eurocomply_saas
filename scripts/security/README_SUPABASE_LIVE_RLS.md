# Supabase live RLS validation

Runtime validation is executed through `scripts/security/run-supabase-live-tenant-isolation.mjs`.

The public runner path is intentionally a small wrapper around `run-supabase-live-tenant-isolation-v2.mjs` so existing npm scripts and evidence commands keep using the original command while the implementation remains easier to review.

The live runner must only mark evidence `Complete` after a real target Supabase run passes. It creates controlled tenant A/B fixtures, validates per-table RLS enablement through `eurocomply_live_rls_inventory`, checks cross-tenant read/write denial, checks same-tenant allowed reads, checks viewer/admin separation, and documents service-role setup/inventory/integrity/cleanup paths.
