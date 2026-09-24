# SSO/SAML and enterprise MFA posture

Status: `SSO_RUNTIME_IMPLEMENTED / BUYER_IDP_CONFIGURATION_PENDING / TENANT_WIDE_MFA_POLICY_NOT_COMPLETE`.

## Current implemented controls

RISCK COMPLY already enforces AAL2 / step-up MFA for protected platform-administration and high-risk actions through the Supabase Auth MFA path and signed step-up controls. Evidence includes:

- `src/server/security/platform-admin.ts`;
- `src/server/security/step-up-provider.ts`;
- `docs/security/STEP_UP_ROLLOUT_MATRIX.md`;
- protected runtime proof workflow/evidence under `docs/security/evidence/runtime/step-up-mfa-validation.json`.

These controls may be described as implemented for the protected actions they actually guard. They must not be generalized into a claim that every workspace user is subject to a tenant-wide mandatory MFA policy.

## Tenant-wide mandatory MFA

A tenant-level policy requiring MFA for all workspace users is not currently represented as complete. A future implementation must include organization-scoped policy authority, enrollment/grace handling, recovery/break-glass behavior, audit events and cross-tenant tests.

## SSO/SAML

Enterprise SAML SSO runtime is implemented in source and production schema: provider/domain binding, entitlement checks, configuration RPCs, callback provisioning and login auditing are present. Current production inspection confirms the required RPCs and binding columns exist. No enterprise identity connection is currently configured, so buyer-specific IdP metadata/domain configuration and an end-to-end IdP login remain counterparty/runtime events.

Classify the remaining activation work as `WAITING_BUYER` when it requires buyer IdP metadata/domain configuration, and keep end-to-end IdP validation evidence explicit.

## Buyer-safe answer

RISCK COMPLY implements SAML SSO runtime controls and step-up MFA/AAL2 for protected administration/high-risk actions. SSO activation requires buyer-specific IdP/domain configuration and end-to-end validation; tenant-wide mandatory MFA for every workspace user is not currently claimed as complete.
