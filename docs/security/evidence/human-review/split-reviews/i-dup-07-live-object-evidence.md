# I-DUP-07 live object evidence

Status: technical review evidence only.

Files in this duplicate-version group:

- `20260626120000_clerk_uuid_safe_rls_helpers.sql`
- `20260626120000_org_billing_entitlements.sql`

## Identity / RLS helpers

Technical disposition candidate: `ALREADY_PRESENT_IN_SCHEMA`, with later hardening and relocation.

Current production contains the UUID-safe identity resolver functions introduced by the historical migration:

- `public.current_jwt_subject()`;
- `public.current_legacy_user_id()`;
- `public.current_clerk_user_id()`.

Current production also contains the organization membership helpers in their later canonical location under `app_private`:

- `app_private.is_org_member(uuid)`;
- `app_private.has_org_role(uuid, text[])`;
- `app_private.has_org_write_role(uuid)`;
- `app_private.live_rls_validation_is_org_member(uuid)`.

The live helpers are hardened beyond the historical file: browser-anonymous execution is denied, authenticated/service-role execution is explicit where required, and search paths are fixed. Repository migration `20260804230433_move_rls_helpers_to_private_schema.sql` deliberately moved the privileged membership helpers out of the PostgREST-exposed public schema while preserving dependent policy references by function OID. Later security-definer hardening migrations further constrained search paths.

The technical conclusion is that the foundational effects of `20260626120000_clerk_uuid_safe_rls_helpers.sql` are present in production and have evolved into a stricter canonical state. The historical SQL should not be replayed merely because its duplicate version is absent from canonical migration history.

## Organization billing entitlements

Technical disposition candidate: `SUPERSEDED` by the modern subscription/billing reconciliation lineage.

The duplicate-version file encodes the obsolete plan set `starter / growth / enterprise` and older entitlement limits. Current application code and production constraints use the canonical four-plan catalog:

- `starter`;
- `professional`;
- `business`;
- `enterprise`.

Current production already has the organization uniqueness index and the canonical plan constraint, but live schema inspection also revealed a remaining default drift: `subscriptions.plan` still defaulted to `free`, `tier` had no default, and `entitlements` defaulted to an empty object even though `free` is not allowed by the current plan constraint.

Repository migration `20260806103000_repair_legacy_subscriptions_schema.sql` defines the modern four-plan semantics and current entitlement shapes. The forward-only schema reconciliation `20260813200000_reconcile_subscription_schema_defaults.sql` in this branch closes the future-row default drift without rewriting existing subscription rows: plan/tier default to `starter`, status defaults to fail-closed `inactive`, the starter entitlement object becomes the schema default, and canonical plan/tier checks are enforced.

Existing rows with custom or empty entitlement JSON are not rewritten by that schema-only migration. Stripe webhook processing already writes the current plan-derived entitlement object during canonical subscription upserts.

## Boundary

This file records technical evidence only. It does not execute SQL, rewrite existing subscription data, alter migration history, record an independent approval, or authorize a database change.

- `productionWriteAuthorized = false`
- `migrationExecutionAuthorized = false`
- `independentApprovalPresent = false`
- `canonicalDecisionAccepted = false`
