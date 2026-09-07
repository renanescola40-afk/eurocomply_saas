# Harden historical SECURITY DEFINER replay ACLs

- Status: Accepted for protected release validation
- Date: 2026-09-07
- Priority: P0 recovery/replay security integrity

## Context

The exact-head full-history Supabase replay for the September 6 bounded forward package reconstructed 37 historical `SECURITY DEFINER` functions in `public` and `app_private` with effective anonymous `EXECUTE` authority. The final migration correctly failed closed on the invariant that `anon` must not be able to execute an application `SECURITY DEFINER` function.

Read-only inspection of the current Production project found none of those 37 historical functions. The finding is therefore a recovery/full-history replay divergence, not evidence that the current Production runtime exposes those functions.

Historical migrations already express narrower intended authority for these functions. Some are trigger/guard helpers, some are service-role-only helpers, and at least one (`public.is_enterprise_integration_admin(uuid)`) deliberately preserves an explicit authenticated execution contract. A blanket revoke from all client/backend roles would therefore be incompatible with the historical authorization model.

Postgres function execution is granted to `PUBLIC` by default unless explicitly restricted. Because API roles can also retain direct grants, replay hardening must remove the anonymous authority without deleting explicit grants that the original migrations intentionally established.

## Decision

The still-unapplied final selected migration `20260906006700_billing_governance_workflow_plan_isolation.sql` will reconcile the exact historical replay offender set before running the existing global security postcondition.

The reconciliation block will:

1. operate only on existing `SECURITY DEFINER` functions in `public` or `app_private` whose names are in the exact 37-function replay finding;
2. identify overloaded functions by `pg_get_function_identity_arguments(p.oid)` rather than by an ambiguous function name alone;
3. revoke `EXECUTE` from `PUBLIC` and `anon` only;
4. preserve any explicit `authenticated` or `service_role` execution grants established by the function's original migration;
5. create, replace, delete, or grant no function authority;
6. leave the global fail-closed scan of every application `SECURITY DEFINER` function unchanged.

No thirteenth migration identity is introduced. The selected September 6 forward package remains 12 migrations because `06700` has not been promoted to Production and is already the package's final security postcondition.

## Security and tenancy impact

The change narrows anonymous authority during clean historical reconstruction. It does not widen tenant access, bypass RLS, create a new API surface, or give any role new privileges.

Preserving explicit `authenticated` grants is intentional where an original RLS/application contract depends on the function. Preserving `service_role` grants keeps reviewed backend and migration workflows compatible. Trigger functions continue to execute through their triggers; direct anonymous execution is not part of their supported contract.

The existing global postcondition remains the authority after reconciliation: if any application `SECURITY DEFINER` function is still executable by `anon`, the migration aborts and the replay fails.

## Production and recovery truth boundary

At the time of this decision:

- none of the 37 matching functions exists in the current Production database;
- the Production migration ledger has not applied the September 6 bounded forward set;
- merging repository code does not apply database migrations or deploy Production;
- success is not claimed until exact-head disposable replay and runtime acceptance are green.

This decision must not be interpreted as evidence of a Production migration, Production pentest, external assurance acceptance, or customer-impacting incident.

## Compatibility and risks

- A historical or external client that relied on anonymous direct execution of one of the 37 privileged functions will no longer work in a clean replay. That behavior is intentionally unsupported because `SECURITY DEFINER` anonymous execution bypasses the intended authority boundary.
- Explicit authenticated and service-role grants remain intact, reducing compatibility risk for reviewed application and backend paths.
- The offender list is deliberately bounded to the observed replay set; it is not a permanent allowlist. The global postcondition still discovers any additional anonymous `SECURITY DEFINER` exposure and fails closed.
- Because the current Production database does not contain these functions, this reconciliation has no direct live-function ACL effect when the bounded package is eventually promoted against the presently observed Production schema.

## Verification

Before merge, the exact PR head must prove all of the following:

- `Ephemeral Supabase Project Smoke` replays the full reviewed schema successfully;
- `Supabase Enterprise Data Plane QA` starts the exact-SHA disposable database and completes tenant-isolation/runtime evidence;
- `Product FRIA Ephemeral Runtime QA` completes the disposable customer journey and FRIA lifecycle;
- the focused regression test locks the 37-function set, identity-argument resolution, and `PUBLIC, anon` revocation;
- the global anonymous `SECURITY DEFINER` postcondition remains present and fail closed;
- all protected branch required contexts are green on the same exact head;
- no Production database write or Production deployment is performed by this PR.

## Rollback

Before Production promotion, revert the migration change, its focused regression test, and this decision record together.

After Production promotion, do not edit the applied migration or repair migration history. If a reviewed compatibility requirement later needs a different function ACL, introduce a new forward migration that explicitly names the affected function identity, required role, authorization rationale, verification, and rollback path.

Restoring anonymous execution to a `SECURITY DEFINER` function is a security-posture change and requires a separate reviewed decision; it must not be treated as a routine compatibility fix.
