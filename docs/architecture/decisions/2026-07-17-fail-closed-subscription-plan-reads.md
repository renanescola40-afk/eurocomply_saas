# Fail closed on subscription plan read failures

- Status: Proposed
- Date: 2026-07-17
- Scope: Billing entitlement resolution

## Context

`getOrganizationPlan` is used by entitlement guards to decide whether an organization may use Growth or Enterprise capabilities. The query layer supports both the canonical `subscriptions.plan` column and the legacy `subscriptions.tier` column.

Previously, every database or provider error from the subscription lookup was converted to `null`. The caller then returned the Starter plan. This made a successful lookup with no active subscription indistinguishable from missing schema, provider outages, connectivity failures, permission failures, and other database errors. Existing paid customers could therefore be denied entitled features while the application presented the result as legitimate business state.

## Decision

Unexpected subscription read errors fail closed with the stable application error `subscription_plan_unavailable`.

The only error that remains eligible for schema fallback is PostgreSQL `42703` (`undefined_column`). That code is the expected compatibility signal when trying `plan` against a legacy schema or `tier` against a canonical schema.

Starter remains the conservative plan only when the supported lookups complete successfully and no active or trialing paid subscription is found.

Logs contain only the sanitized provider error code. No connection details, query payloads, subscription data, or secrets are logged.

## Consequences

- Infrastructure failures are no longer represented as valid Starter entitlements.
- Paid capabilities fail unavailable rather than silently misclassifying the organization.
- Existing canonical and legacy column compatibility is preserved.
- Existing error boundaries must present a temporary-unavailability state when the stable error propagates.

## Risks

A previously hidden provider or database issue will become visible to users and monitoring. This is intentional: the application cannot truthfully determine entitlement during that failure.

The `42703` fallback assumes the database returns standard PostgreSQL error codes through Supabase. This matches the existing compatibility behavior and is covered by a source contract test.

## Validation

The regression contract checks that:

- unexpected lookup errors throw `subscription_plan_unavailable`;
- only `42703` returns `null` for schema fallback;
- organization scoping and active/trialing filtering remain in place;
- Starter is still returned after successful lookups with no paid row.

No runtime availability, production subscription state, audit, or penetration-test evidence is claimed by this decision record.

## Rollback

Revert the commits in the pull request. No schema or data migration is involved.
