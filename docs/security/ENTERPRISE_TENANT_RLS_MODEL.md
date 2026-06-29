# Enterprise Tenant RLS Model

EuroComply is a multi-tenant SaaS. The hard rule is that customer data belongs to an organization and every organization-scoped table must be isolated by `organization_id`.

## Invariants

1. Organization-scoped tables must have `organization_id`.
2. RLS must be enabled for organization-scoped, user-scoped, and backend-owned public tables.
3. Member reads must be scoped with `public.is_org_member(organization_id)`.
4. Customer-data writes must require an explicit organization role via `public.has_org_role(...)` or `public.has_org_write_role(...)`.
5. Backend-owned tables must deny authenticated/anon client writes with `with check (false)` / `using (false)` and revoked write grants.
6. Audit logs, subscriptions, organization invitations, and invitation state are backend-owned.
7. Notifications are both `user_id` and `organization_id` scoped.
8. Security definer helpers must set a safe `search_path`.
9. Migrations must be idempotent: `create ... if not exists`, `alter table ... add column if not exists`, and `drop policy if exists` before replacement.
10. Runtime tenant-isolation evidence must come from live Supabase validation, not from static assumptions.

## Table protection matrix

| Table | Scope | Required column | Read | Insert | Update | Delete |
| --- | --- | --- | --- | --- | --- | --- |
| `organizations` | Organization root | `id` | Member | Backend/onboarding controlled | Owner/Admin | Owner |
| `organization_members` | Organization | `organization_id` | Member | Owner/Admin | Owner/Admin | Owner/Admin |
| `documents` | Organization | `organization_id` | Member | Writer | Writer | Owner/Admin |
| `risks` | Organization | `organization_id` | Member | Writer | Writer | Owner/Admin |
| `vendors` | Organization | `organization_id` | Member | Writer | Writer | Owner/Admin |
| `tasks` | Organization | `organization_id` | Member | Writer | Writer | Owner/Admin |
| `compliance_tasks` | Organization | `organization_id` | Member | Writer | Writer | Owner/Admin |
| `ai_systems` | Organization | `organization_id` | Member | Writer | Writer | Owner/Admin |
| `ai_incidents` | Organization | `organization_id` | Member | Writer | Writer | Owner/Admin |
| `onboarding_activation_runs` | Organization | `organization_id` | Member | Owner/Admin/Compliance manager | Owner/Admin/Compliance manager | Owner/Admin |
| `notifications` | Organization + user | `organization_id`, `user_id` | Recipient + org member | Backend only | Recipient + org member, scope immutable | Recipient + org member |
| `audit_events` | Backend-owned organization | `organization_id` | Member | Backend only | Backend only | Backend only |
| `audit_logs` | Backend-owned organization | `organization_id` | Member | Backend only | Backend only | Backend only |
| `subscriptions` | Backend-owned organization | `organization_id` | Member | Backend only | Backend only | Backend only |
| `organization_invites` | Backend-owned organization | `organization_id` | Member | Backend only | Backend only | Backend only |
| `invitations` | Backend-owned organization | `organization_id` | Member | Backend only | Backend only | Backend only |
| `profiles` | User | `id` or `user_id` | Self | Self | Self | Denied by default |

## Why stale policy cleanup matters

Postgres combines permissive RLS policies with OR semantics. If a table has one strict backend-only policy and one older permissive `insert_member` or `update_member` policy, the older policy can still allow writes. The enterprise cleanup migration explicitly drops known stale write policies before recreating backend-only denial policies.

## Validation commands

Static migration and query audit:

```txt
node scripts/security/audit-supabase-tenant-isolation.mjs
```

Unit coverage:

```txt
npm run test -- tests/security/supabase-rls-migration-coverage.test.mjs
```

Live tenant isolation proof after migrations are applied:

```txt
node scripts/security/run-supabase-live-tenant-isolation.mjs --update-register
```
