# Supabase Tenant Isolation Implementation

This document records the repository-side implementation for EuroComply's multi-tenant Supabase RLS control.

## Implemented controls

- `supabase/migrations/20260619_multi_tenant_rls_hardening.sql` installs hardened organization membership helpers and removes legacy policies that could stay permissive through OR semantics.
- `supabase/migrations/20260619103000_complete_multi_tenant_rls_policies.sql` applies idempotent table-aware RLS policies for tenant-scoped, backend-only, notification, profile, and administrative tables.
- `supabase/migrations/20260619111500_lock_backend_owned_rls_writes.sql` keeps backend-owned organization and invitation writes out of authenticated client sessions.
- `supabase/migrations/20260619130000_drop_legacy_permissive_rls_policies.sql` drops known legacy broad policies for notifications, AI tables, invitations, and subscriptions before stricter policies are relied on.
- `scripts/security/run-supabase-live-tenant-isolation.mjs` creates tenant A and tenant B, creates users for each tenant, signs both tenants in, seeds representative rows, verifies tenant A cannot read/insert/update/delete tenant B rows, and verifies same-tenant reads per reviewed table.
- `scripts/security/run-supabase-live-tenant-isolation.mjs` treats cross-tenant inserts as passed only when Supabase returns an RLS or permission-denial error, so unrelated failures such as duplicate keys cannot produce false-green evidence.
- `docs/security/evidence/runtime/supabase-live-rls-validation.json` remains `Open` until the strict live validation script passes against a real Supabase project with migrations applied.
- `scripts/security/check-p0-runtime-evidence-register.mjs` prevents the P0 register from marking Supabase live RLS validation as `Complete` unless the runtime evidence JSON is also `Complete` with `outcome: passed` and required test coverage.
- `tests/security/tenant-query-isolation.test.mjs` blocks organization-scoped query chains that filter only by `user_id` without an organization-aware guard.
- `tests/security/supabase-rls-migration-coverage.test.mjs` verifies critical tables have migration-backed RLS/policy coverage, backend-owned tables have client write denial, and legacy permissive policies are dropped.
- `scripts/security/audit-supabase-tenant-isolation.mjs` audits migrations and source queries for tenant-isolation gaps across tables with `organization_id` or tenant-owned `user_id` usage.

## Completion command

Run this only against the target Supabase project after migrations are applied:

```txt
node scripts/security/run-supabase-live-tenant-isolation.mjs --update-register
```

The script writes redacted runtime evidence and updates `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` only on success.

## Release rule

Public production remains blocked while `docs/security/evidence/runtime/supabase-live-rls-validation.json` is `Open` or has any failed test case.
