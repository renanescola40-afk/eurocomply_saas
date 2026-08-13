# I-DUP-16 live object evidence

Status: technical review evidence only.

Files in this duplicate-version group:

- `20260728170000_billing_lifecycle_requests.sql`
- `20260728170000_harden_billing_tenant_tables.sql`

## Billing lifecycle ledger

Technical disposition candidate: `SUPERSEDED` by `20260812221912_reconcile_billing_lifecycle_requests_runtime.sql`, with subsequent replay hardening in `20260813102900_add_durable_billing_lifecycle_replay_contract.sql`.

Repository tests explicitly name the `20260728170000` ledger file as the legacy migration and the `20260812221912` file as the runtime reconciliation. Production metadata shows `billing_lifecycle_requests` with RLS plus FORCE RLS and both the original processing indexes and the later request-id indexes. Production migration metadata also contains versions `20260812221912` and `20260813102900`.

## Billing tenant-table hardening

Technical status: **split review remains unresolved**.

This file conditionally targets `customer_add_ons`, `storage_usage`, `billing_limits`, and `feature_flags`. None of those four tables currently exists in production.

The repository file `20260727193000_enterprise_billing_catalog.sql` contains definitions for `storage_usage`, `billing_limits`, and `feature_flags`, then invokes `public.app_rls_harden_backend_only_table(...)`. Earlier RLS migrations define that helper but also explicitly remove it again. The historical migration sequence therefore does not establish a self-contained replacement that can be credited from name matching alone.

The repository has no other current `customer_add_ons` authority; current add-on code and production use `organization_add_ons`. The technical review must avoid creating a second competing add-on authority solely to satisfy a legacy migration.

Accordingly this evidence does not assign `ALREADY_PRESENT_IN_SCHEMA` or `SUPERSEDED` to `20260728170000_harden_billing_tenant_tables.sql`. It remains for a bounded human split review after the billing-catalog lineage is reconciled.

## Boundary

This file records technical evidence only. It does not execute SQL, alter migration history, record an independent approval, or authorize a database change.

- `productionWriteAuthorized = false`
- `migrationExecutionAuthorized = false`
- `independentApprovalPresent = false`
- `canonicalDecisionAccepted = false`
