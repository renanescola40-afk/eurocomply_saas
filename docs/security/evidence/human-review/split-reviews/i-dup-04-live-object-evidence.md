# I-DUP-04 live object evidence

Status: technical review evidence only.

Duplicate-version group:

- `20260613_audit_event_chained_rpc.sql`
- `20260613_organization_add_ons.sql`

## Audit RPC

Technical disposition candidate: `SUPERSEDED` by `20260621120000_audit_chain_enterprise_hardening.sql`.

The older function does not accept `p_id` or `p_created_at`. The later migration explicitly replaces that contract with an id/timestamp-aware function. Current production metadata matches the later contract: `append_audit_event_chained` includes `p_id` and `p_created_at`, is security-definer, has a fixed `search_path=pg_catalog`, permits service-role execution, and denies execution to authenticated/anonymous browser roles.

The production ledger also records `20260813102951_harden_remaining_public_security_definer_search_paths`, which represents the later search-path hardening.

## Organization add-ons

Technical disposition candidate: `SUPERSEDED` by `20260813124224_reconcile_organization_add_ons.sql`.

The production ledger records `20260813124224 / reconcile_organization_add_ons`. Current production metadata shows `organization_add_ons` with RLS and FORCE RLS, the organization/add-on uniqueness boundary, organization/status and Stripe-item indexes, and the dedicated `touch_organization_add_on_updated_at()` trigger.

The older duplicate migration lacks FORCE RLS and the later explicit privilege/trigger hardening. Repository contract tests identify `20260813124224_reconcile_organization_add_ons.sql` as the canonical reconciliation migration.

`20260813175000_optimize_organization_add_ons_rls_initplan.sql` is a later policy-performance optimization and does not replace the canonical table reconciliation identity above.

## Boundary

This file records technical evidence only. It does not record an independent approval, execute SQL, modify migration history, or authorize a database change.

- `productionWriteAuthorized = false`
- `migrationExecutionAuthorized = false`
- `independentApprovalPresent = false`
- `canonicalDecisionAccepted = false`
