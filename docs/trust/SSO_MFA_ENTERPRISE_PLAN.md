# SSO/SAML and enterprise MFA posture

Status: `SSO_RUNTIME_IMPLEMENTED / BUYER_IDP_CONFIGURATION_PENDING / TENANT_WIDE_MFA_POLICY_IMPLEMENTED`.

## Current implemented controls

RISCK COMPLY already enforces AAL2 / step-up MFA for protected platform-administration and high-risk actions through the Supabase Auth MFA path and signed step-up controls. Evidence includes:

- `src/server/security/platform-admin.ts`;
- `src/server/security/step-up-provider.ts`;
- `docs/security/STEP_UP_ROLLOUT_MATRIX.md`;
- protected runtime proof workflow/evidence under `docs/security/evidence/runtime/step-up-mfa-validation.json`.

These controls remain valid for protected high-risk actions and are complemented by a tenant-wide policy capability.

## Tenant-wide mandatory MFA

A tenant-scoped mandatory MFA policy is implemented and defaults off until an authorized workspace owner/admin enables it. When enabled:

- the organization policy is stored in `organization_security_settings.require_mfa_for_all_users`;
- licensed workspace pages require an AAL2 session and route non-AAL2 users to the authenticated MFA enrollment/challenge flow;
- shared API and RBAC authorities fail closed when the policy requires AAL2;
- active Supabase RLS membership/role authority in `app_private` requires AAL2, so direct tenant-scoped database access cannot bypass the policy;
- policy changes remain protected by `manage_settings`, step-up verification and audit persistence;
- denial events are recorded through the security audit path;
- TOTP enrollment supports cleanup of abandoned unverified factors.

Live QA validation on 2026-09-24 demonstrated the database boundary with a disposable test organization inside rollback-only transactions: AAL1 could not see its own protected tenant rows, AAL2 could see its own rows, and AAL2 still could not see the foreign test tenant. This proves the policy mechanism, not that every customer tenant has enabled it.

## SSO/SAML

Enterprise SAML SSO runtime is implemented in source and production schema: provider/domain binding, entitlement checks, configuration RPCs, callback provisioning and login auditing are present. Current production inspection confirms the required RPCs and binding columns exist. No enterprise identity connection is currently configured, so buyer-specific IdP metadata/domain configuration and an end-to-end IdP login remain counterparty/runtime events.

Classify the remaining activation work as `WAITING_BUYER` when it requires buyer IdP metadata/domain configuration, and keep end-to-end IdP validation evidence explicit.

## Buyer-safe answer

RISCK COMPLY implements SAML SSO runtime controls, step-up MFA/AAL2 for protected administration/high-risk actions, and a tenant-configurable policy that can require AAL2 for all workspace access. SSO activation still requires buyer-specific IdP/domain configuration and end-to-end validation. Tenant-wide MFA capability is implemented; activation for a specific customer tenant remains a tenant configuration fact.
