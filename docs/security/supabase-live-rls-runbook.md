# Supabase live RLS runbook

Current P0 progress remains 50% Complete / 50% remaining until the live RLS validation evidence is generated, reviewed, and promoted.

Use this runbook when running the manual `Supabase Live RLS Validation` GitHub Actions workflow.

## Required secrets

The workflow needs the live Supabase project secrets configured in GitHub Actions or the protected `supabase-live-rls-validation` environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If `apply_migrations=true`, it also needs:

- `SUPABASE_DB_URL`

## Common failure: `SUPABASE_DB_URL is required when apply_migrations=true`

This means the workflow was asked to apply migrations before running the live tenant-isolation validator, but the Postgres connection string was not available as a secret.

Fix it using one of these paths:

1. Add `SUPABASE_DB_URL` as a GitHub Actions secret or environment secret, then rerun with `apply_migrations=true`.
2. Apply `supabase/migrations/20260623120000_live_rls_validation_inventory.sql` manually against the target Supabase project, then rerun with `apply_migrations=false`.

## What success produces

A passing run commits generated evidence to the requested evidence branch, uploads the `supabase-live-rls-validation-evidence` artifact, and opens or updates the evidence pull request.

Do not mark the P0 register row Complete unless the strict live tenant-isolation validator passes against the configured Supabase project.
