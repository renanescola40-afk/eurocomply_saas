# Supabase Tenant Isolation Implementation

This document records the repository-side implementation for EuroComply's multi-tenant Supabase RLS control.

## Implemented controls

- `supabase/migrations/20260619_multi_tenant_rls_hardening.sql` installs hardened organization membership helpers and removes legacy policies that could stay permissive through OR semantics.
- `supabase/migrations/20260619103000_complete_multi_tenant_rls_policies.sql` applies idempotent table-aware RLS policies for tenant-scoped, backend-only, notification, profile, and administrative tables.
- `supabase/migrations/20260619111500_lock_backend_owned_rls_writes.sql` keeps backend-owned organization and invitation writes out of authenticated client sessions.
- `supabase/migrations/20260619130000_drop_legacy_permissive_rls_policies.sql` drops known legacy broad policies for notifications, AI tables, invitations, and subscriptions before stricter policies are relied on.
- `supabase/migrations/20260620120000_enterprise_multi_tenant_rls_final_lock.sql` locks the enterprise critical table set: `organizations`, `organization_members`, `documents`, `audit_events`, `risks`, `vendors`, `tasks`, `subscriptions`, and `notifications`.
- `supabase/migrations/20260629110000_enterprise_tenant_rls_cleanup_indexes.sql` performs the final enterprise cleanup: removes stale org-scoped write policies from backend-owned tables, forces RLS, blocks client writes on audit/billing/invitation tables, locks notification scope changes, hardens onboarding activation runs, and adds organization-scoped indexes.
- `scripts/security/audit-supabase-tenant-isolation.mjs` audits every SQL migration in `supabase/migrations` and source query chains for `organization_id`, tenant-owned `user_id`, customer data, documents, billing, audit logs, notifications, risks, vendors, AI systems, incidents, invitations, subscriptions, onboarding activation runs, and tasks.
- `scripts/security/run-supabase-live-tenant-isolation.mjs` creates tenant A and tenant B, creates real Supabase Auth users for each tenant, signs both tenants in, seeds representative rows, verifies tenant A cannot read/insert/update/delete tenant B rows, and verifies same-tenant read/insert behavior where expected.
- `scripts/security/run-supabase-live-tenant-isolation.mjs` treats cross-tenant inserts as passed only when Supabase returns an RLS or permission-denial error, so unrelated failures such as duplicate keys cannot produce false-green evidence.
- `scripts/security/run-supabase-live-tenant-isolation.mjs --advisory` allows local/security CI to pass without live Supabase secrets while generating no runtime evidence.
- `docs/security/evidence/runtime/supabase-live-rls-validation.json` remains `Open` until the strict live validation script passes against a real Supabase project with migrations applied.
- `scripts/security/check-p0-runtime-evidence-register.mjs` prevents the P0 register from marking Supabase live RLS validation as `Complete` unless the runtime evidence JSON is also `Complete` with `outcome: passed`, timestamp, redacted Supabase project reference, tests run, zero failures, reviewer, command used, commit SHA, and required table coverage.
- `tests/security/tenant-query-isolation.test.mjs` blocks organization-scoped query chains that filter only by `user_id` without an organization-aware guard.
- `tests/security/supabase-rls-migration-coverage.test.mjs` verifies critical tables have migration-backed RLS/policy coverage, backend-owned tables have client write denial, stale backend write policies are cleaned up, legacy permissive policies are dropped, write policies require organization roles, broad `using true`/`with check true` policies are absent, and security definer helpers use explicit `search_path`.
- `tests/security/supabase-live-rls-evidence.test.mjs` validates the live evidence parser/generator without touching Supabase.
- `docs/security/SUPABASE_RLS_TENANT_ISOLATION.md` is the operator runbook for the live tenant-isolation proof.
- `docs/security/ENTERPRISE_TENANT_RLS_MODEL.md` describes the enterprise table protection model and the expected policy shape by table class.

## Enterprise table model

| Class | Tables | Client access model |
| --- | --- | --- |
| Organization root | `organizations` | Members can read. Owners/admins can update. Owners can delete. Creation remains backend/onboarding controlled. |
| Membership | `organization_members` | Members can read org membership. Owners/admins can create, update, or remove members. |
| Tenant-scoped customer data | `documents`, `risks`, `vendors`, `tasks`, `compliance_tasks`, `ai_systems`, `ai_incidents`, `onboarding_activation_runs` | Members can read. Writer/manager roles can create/update. Delete requires owner/admin where applicable. |
| Backend-owned | `audit_events`, `audit_logs`, `subscriptions`, `organization_invites`, `invitations` | Members can read when useful, but authenticated/anon clients cannot insert, update, or delete. Writes must go through service-role server paths. |
| Notifications | `notifications` | Recipient can read/update/delete only inside an organization they belong to. Client inserts are denied. A trigger prevents clients from moving a notification to another user or organization. |
| Profiles | `profiles` | User-scoped self read/insert/update. No org-wide access by default. |

## Completion command

Run this only against the target Supabase project after migrations are applied:

```txt
node scripts/security/run-supabase-live-tenant-isolation.mjs --update-register
```

The script writes redacted runtime evidence and updates `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` only on success.

## CI command

```txt
npm run security:rls
```

This command runs static RLS metadata checks, migration/source auditing, and the live validator in advisory mode. If real Supabase envs are present it performs the live validation; if they are missing it exits locally without generating evidence.

## Release rule

Public production and enterprise procurement remain blocked while `docs/security/evidence/runtime/supabase-live-rls-validation.json` is `Open` or has any failed test case.
