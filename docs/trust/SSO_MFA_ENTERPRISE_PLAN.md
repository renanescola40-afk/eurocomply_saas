# SSO/SAML and enterprise MFA posture

Status: `PARTIAL_IMPLEMENTED / TENANT_WIDE_POLICY_NOT_COMPLETE`.

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

Enterprise SSO capability is contract/entitlement-aware in the enterprise control plane, but RISCK COMPLY does not claim customer-ready SAML/SSO until the provider/runtime path and enterprise IdP validation are attributable for the relevant release.

If safe implementation requires a provider plan or licensed capability, classify the missing runtime capability as `WAITING_PROVIDER_FACT` or provider-plan dependency rather than fabricating support.

## Buyer-safe answer

RISCK COMPLY supports step-up MFA/AAL2 for protected administration and high-risk actions. Tenant-wide mandatory MFA and customer-ready SAML/SSO must be confirmed separately against the current enterprise identity runtime before being promised contractually.
