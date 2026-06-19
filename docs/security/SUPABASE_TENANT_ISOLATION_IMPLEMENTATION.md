# Supabase Tenant Isolation Implementation

This document records the repository-side implementation for EuroComply's multi-tenant Supabase RLS control.

## Implemented controls

- `supabase/migrations/20260619_multi_tenant_rls_hardening.sql` installs hardened organization membership helpers and removes legacy policies that could stay permissive through OR semantics.
- `supabase/migrations/20260619103000_complete_multi_tenant_rls_policies.sql` applies idempotent table-aware RLS policies for tenant-scoped, backend-only, notification, profile, and administrative tables.
- `scripts/security/run-supabase-live-rls-validation.mjs` creates tenant A and tenant B, creates users for each tenant, seeds representative rows, signs in as tenant A, and verifies cross-tenant read, insert, update, and delete are denied.
- `docs/security/evidence/runtime/supabase-live-rls-validation.json` remains `Open` until the live validation script passes against a real Supabase project with migrations applied.
- `scripts/security/check-p0-runtime-evidence-register.mjs` prevents the P0 register from marking Supabase live RLS validation as `Complete` unless the runtime evidence JSON is also `Complete` with `outcome: passed` and required test coverage.
- `tests/security/tenant-query-isolation.test.mjs` blocks organization-scoped query chains that filter only by `user_id` without an organization-aware guard.

## Completion command

Run this only against the target Supabase project after migrations are applied:

```txt
node scripts/security/run-supabase-live-rls-validation.mjs --update-register
```

The script writes redacted runtime evidence and updates `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` only on success.

## Release rule

Public production remains blocked while `docs/security/evidence/runtime/supabase-live-rls-validation.json` is `Open` or has any failed test case.
