# Supabase RLS Tenant Isolation

## Security objective

EuroComply must prove real multi-tenant isolation in Supabase before public production or enterprise procurement can proceed. Repository-side policy checks are useful, but they are not enough. The release gate requires a live tenant A / tenant B validation run against the target Supabase project with current migrations applied.

## Critical tables

The live validation treats these tables as required and release-blocking:

| Table | Scope | Required behavior |
| --- | --- | --- |
| `organizations` | Tenant root | Members can read their own organization; authenticated client inserts are backend-owned; admin/owner mutation only. |
| `organization_members` | Tenant membership | Members can read memberships inside their organization; owner/admin manages membership rows. |
| `documents` | Customer documents | Organization members can read; write operations require organization write role; cross-tenant access denied. |
| `audit_events` | Audit trail | Organization members can read audit evidence; authenticated client insert/update/delete is denied. |
| `risks` | Customer risk data | Organization members can read; write operations require organization write role; cross-tenant access denied. |
| `vendors` | Customer vendor data | Organization members can read; write operations require organization write role; cross-tenant access denied. |
| `tasks` | Customer task data | Organization members can read; write operations require organization write role; cross-tenant access denied. |
| `subscriptions` | Billing | Organization members can read; authenticated client insert/update/delete is denied. |
| `notifications` | User + organization scoped | Recipient can read/update/delete only inside their organization; inserts are backend-owned. |

Additional tenant tables such as `compliance_tasks`, `audit_logs`, `organization_invites`, `invitations`, `ai_systems`, and `ai_incidents` are also audited when present.

## Migration controls

The RLS model is implemented through the migration chain in `supabase/migrations`:

1. `20260619_multi_tenant_rls_hardening.sql` installs `is_org_member` and `has_org_role` as security-definer helpers and removes known broad policies.
2. `20260619103000_complete_multi_tenant_rls_policies.sql` applies table-aware RLS to organization-scoped, backend-owned, notification, and profile tables.
3. `20260619111500_lock_backend_owned_rls_writes.sql` makes organization and invitation creation backend-owned from authenticated clients.
4. `20260619130000_drop_legacy_permissive_rls_policies.sql` removes legacy permissive policies that could remain OR-ed with stricter replacements.
5. `20260620120000_enterprise_multi_tenant_rls_final_lock.sql` finalizes the enterprise policy posture: `tasks` and `audit_events` are mandatory, mutable tenant data requires a write role, and audit/billing tables reject authenticated client writes.

## Live validation script

Run the strict validator only against the target Supabase project after migrations are applied:

```bash
node scripts/security/run-supabase-live-tenant-isolation.mjs --update-register
```

The script uses these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The service-role client is used only for controlled fixture setup and cleanup. Tenant A and Tenant B use real Supabase Auth sessions created during the run.

## Runtime tests

For every critical table, the live script validates:

- Tenant A cannot read Tenant B rows.
- Tenant A cannot insert rows into Tenant B scope.
- Tenant A cannot update Tenant B rows.
- Tenant A cannot delete Tenant B rows.
- Tenant B can read its own rows where client reads are expected.
- Same-tenant inserts are allowed for client-writable tenant data: `documents`, `risks`, `vendors`, and `tasks`.
- Backend-owned tables such as `audit_events` and `subscriptions` deny authenticated client writes even for same-tenant users.

The script fails if any critical table is missing, lacks an effective RLS policy, leaks rows, allows cross-tenant mutation, or cannot prove same-tenant behavior.

## Evidence contract

Passing evidence is written to:

```txt
docs/security/evidence/runtime/supabase-live-rls-validation.json
```

A passing JSON must include:

- `status: "Complete"`
- `outcome: "passed"`
- `timestamp`
- redacted Supabase project reference
- `tablesReviewed`
- `testsRun`
- `failures: []`
- `reviewer`
- `commandUsed`
- `commitSha`

The script does not generate runtime evidence when real Supabase environment variables are missing. In local CI/advisory mode it prints an advisory result and exits successfully without writing evidence.

## Register and production gate

`docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` must remain `Open` until live evidence passes. The script updates the register only when invoked with `--update-register` after a passing live run.

`npm run security:rls` runs static RLS checks, migration audit, and the live validator in advisory mode. If real Supabase environment variables are present, the validator performs the live proof. If they are absent, local CI remains advisory and does not create evidence.

Public production and enterprise procurement stay blocked until:

```bash
node scripts/security/check-p0-runtime-evidence-register.mjs
node scripts/security/enforce-supabase-rls-live-complete.mjs
```

both pass against stamped GitHub Actions evidence.
