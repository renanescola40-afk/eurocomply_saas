# Sales Console Access Runbook

Status: internal operations control  
Owner: Platform / Security Engineering  
Last reviewed: 2026-07-01

The Sales Console is an internal RISCK COMPLY lead-operations surface. It is not a customer-facing CRM module and it must not be exposed through tenant workspace RBAC.

## Access model

Sales Console access requires all of the following:

1. A valid authenticated Supabase user session.
2. A row in `public.platform_admin_users` for that user's Supabase Auth `user_id`.
3. `enabled = true`.
4. A permitted platform role for the action being performed.

The application does not use a runtime email allowlist to bypass the database guard. This avoids accidental production exposure through environment configuration.

## First admin provisioning

Use `scripts/ops/provision-platform-admin.mjs` only from a trusted local shell or protected CI environment after the platform owner has logged in once.

Required local/protected-shell inputs:

- Supabase project URL
- Supabase service-role credential from the provider secret store
- `PLATFORM_ADMIN_EMAIL` matching the exact Supabase Auth email
- `PLATFORM_ADMIN_ROLE`, usually `owner`

Expected effect:

- The script finds the matching Supabase Auth user.
- The script upserts that user's id into `public.platform_admin_users`.
- The user can then open `/<locale>/admin/sales/leads` after signing in.

## Role guidance

- `owner`: full platform-admin access for trusted founding/operator accounts.
- `sales_admin`: can manage the Sales Console without being a platform owner.
- `sales_rep`: reserved for narrower sales access; do not grant until routes explicitly allow it.
- `support_admin`: reserved for support/admin surfaces; not enough for the Sales Console by default.

## Removing access

Disable the relevant `platform_admin_users` row instead of deleting it when historical references should remain intact.

## Safety rules

- Do not store provider credentials in `.env.example`, docs, screenshots, pull requests or tickets.
- Do not add public or tenant-scoped policies to `platform_admin_users`.
- Do not grant Sales Console access through `organization_members`.
- Do not put sensitive personal data, payment data, passwords, legal conclusions or secrets in lead notes.
- Keep Sales Console pages and mutation routes no-store.

## Validation checklist

Before using Sales Console in production:

- All migrations have been applied in Supabase.
- At least one platform admin has been provisioned.
- CI is green on the Sales Console branch or PR.
- Non-admin authenticated users are redirected away from `/admin/sales/leads`.
- Admin users can list leads, open lead detail, add a note and update status, priority and follow-up.
