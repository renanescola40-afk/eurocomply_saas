# ADR-0096 — API commercial authorization boundary

- Status: Accepted
- Date: 2026-08-18
- Owners: Application Security / Billing Engineering / Identity & Access

## Context

RISCK COMPLY already centralizes tenant membership, RBAC and durable billing authority in `assertOrganizationPermission`. Most product permissions are classified as commercial and therefore deny unlicensed organizations before privileged service-role operations execute.

Two shared RBAC capabilities need more precise treatment:

- `manage_team` is used by operational team APIs but is also reused by the narrow pre-payment onboarding bootstrap flow.
- `manage_settings` is used by paid organization security settings, while a GDPR deletion request also reuses that permission and must remain an account/data-subject right rather than a paid product feature.

Adding both capabilities to the global commercial permission set would be over-broad: it would either break onboarding or risk putting account/GDPR recovery behind payment. Leaving them entirely non-commercial would allow authenticated unpaid organizations to invoke team and security control-plane APIs directly.

## Decision

1. API authorization resolves an effective commercial minimum plan before calling canonical `assertOrganizationPermission`.
2. `manage_team` defaults to the base paid `starter` plan at the API boundary. All API routes that already call `requirePermission(... manage_team ...)` therefore require durable organization billing authority in addition to membership and RBAC.
3. `manage_settings` has no blanket paid default because it spans both commercial product settings and account/GDPR rights.
4. The organization security settings mutation explicitly requires `minimumPlan: 'starter'` before step-up verification and before any administrative Supabase mutation.
5. GDPR deletion remains free of a commercial minimum-plan requirement.
6. Pre-payment onboarding continues to use its existing server-action bootstrap authorization rather than the operational API permission guard.
7. `manage_billing` remains outside paid-license defaults so an unlicensed authenticated organization can purchase, retry, update or recover billing.

The effective plan is still only a floor. `assertOrganizationPermission` remains the source of truth that proves active membership, role permission, durable commercial authority and plan rank. A `starter` label without `authority.licensed === true` does not grant access.

## Security invariants

- Direct team API calls from an unpaid organization are denied even when the caller is owner/admin.
- Service-role/admin-client execution occurs only after the API authorization boundary succeeds.
- Organization membership and RBAC remain mandatory; a valid subscription does not grant access to another tenant.
- Billing recovery is not trapped behind the subscription it is intended to create or repair.
- GDPR deletion is not converted into a paid feature.
- Onboarding bootstrap is not a general-purpose operational API bypass.
- Provider/database failure while resolving commercial authority remains fail-closed through canonical RBAC handling.

## Consequences

### Positive

- One API policy closes the full family of `manage_team` endpoints instead of patching each route independently.
- Paid security settings cannot be mutated by an unpaid organization.
- Billing recovery, onboarding bootstrap and GDPR rights keep their intended availability.
- Future team APIs using the canonical `requirePermission` guard inherit paid authority automatically.

### Trade-offs

- The distinction between API operations and onboarding bootstrap is intentional and must remain covered by tests.
- `manage_settings` routes require explicit commercial classification because that permission spans both product features and account/legal rights.

## Validation

Regression coverage verifies the default paid floor for API team management, the explicit paid floor for security settings, the absence of a paywall on billing/GDPR rights, and the preservation of pre-payment onboarding bootstrap.

## Rollback

Revert the commits from the Mega PR that introduce `api-commercial-policy.ts`, pass the effective minimum plan through `requirePermission`, and add the security-settings plan floor. No database migration, Stripe mutation, Supabase schema change, provider configuration or secret rotation is required. Rollback would reopen direct unpaid access to operational team/security APIs and therefore must be treated as an emergency-only availability action.
