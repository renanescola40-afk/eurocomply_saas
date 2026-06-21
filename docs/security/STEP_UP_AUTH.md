# RISCK COMPLY Step-Up Authentication Standard

This document defines the enterprise step-up authentication policy for high-risk RISCK COMPLY actions.

Release gate evidence: `STEP_UP_PROVIDER_MODE` is the required runtime provider selector validated by the enterprise Release gate.

## Purpose

Step-up authentication reduces the risk of session hijacking, unattended sessions and compromised browser sessions being used to perform sensitive actions.

The implementation is no longer a symbolic timestamp or placeholder check. A step-up token is issued only after a real strong verification event: Supabase MFA with an `aal2` session, or a fresh enterprise IdP/SAML/OIDC claim that matches the configured reauthentication policy.

## Implementation

| Layer | Location |
| --- | --- |
| Step-up helper and token validation | `src/server/security/step-up.ts` |
| MFA / IdP challenge endpoint | `src/app/api/security/step-up/challenge/route.ts` |
| Reusable step-up UI | `src/components/security/step-up-mfa-dialog.tsx` |
| Server-side nonce/token store | `supabase/migrations/20260619143000_step_up_token_store.sql` |
| Regression tests | `src/server/security/step-up.test.ts` |
| Static security gate | `scripts/security/check-step-up.mjs` |
| Production preflight integration | `scripts/preflight.mjs` |
| Runtime provider preflight | `scripts/security/check-step-up-runtime-preflight.mjs` |
| Runtime evidence | `docs/security/evidence/runtime/step-up-mfa-validation.json` |

## High-Risk Actions

The high-risk action registry includes:

- `export_data`
- `manage_billing`
- `manage_team`
- `gdpr_delete`
- `audit_chain_verify`
- `audit_chain_export`
- `change_security_settings`

## Signed Step-Up Token

High-risk endpoints use `requireStepUpForRequest()` and expect a RISCK COMPLY step-up token header. The legacy EuroComply header may remain temporarily supported only for transitional compatibility.

The token payload is scoped to action, user, organization, timestamps, nonce and verification method.

The nonce is mandatory, generated server-side, stored as a server-side record and consumed once. This is the single-use nonce guarantee. A replayed token must fail with `step_up_token_replayed`.

The server stores only a token hash, not the raw token.

## Freshness Window

The default accepted verification window is 5 minutes. The database also enforces that the token expiry remains inside that verification window.

## Real Verification Providers

All modes require Supabase auth client configuration because the challenge endpoint validates the current session through Supabase before issuing any step-up token.

### Supabase MFA

Use the Supabase MFA provider mode. Required runtime behavior:

1. `POST /api/security/step-up/challenge` receives a supported high-risk `action`.
2. The endpoint lists verified MFA factors when no `factorId` is supplied.
3. The endpoint creates a provider challenge through Supabase MFA.
4. The user submits the provider challenge details and one-time code.
5. The endpoint verifies the challenge with Supabase MFA.
6. The endpoint requires a current `aal2` assurance level.
7. Only then is a signed step-up token created and persisted.

### Enterprise IdP / SAML / OIDC

Use the enterprise IdP provider mode with a non-empty ACR or AMR policy value.

Required runtime behavior:

1. The endpoint reads verified session claims through Supabase.
2. The authentication timestamp must be fresh within the configured step-up window.
3. ACR or AMR claims must match the configured enterprise policy.
4. Only then is a signed step-up token created and persisted.

### Hybrid Mode

Hybrid mode allows Supabase MFA or enterprise IdP reauthentication, but still fails closed when the Supabase auth client is not configured or neither provider verifies the current request.

## Required Configuration and Release Gate

Production should configure a dedicated step-up signing configuration. The audit-chain fallback exists only to avoid breaking transitional environments.

Static release gate:

```txt
RISCK_COMPLY_ENTERPRISE_RELEASE=true node scripts/security/check-step-up.mjs
```

The legacy `EUROCOMPLY_ENTERPRISE_RELEASE=true` flag is still accepted only as a transitional fallback.

Runtime provider preflight:

```txt
node scripts/security/check-step-up-runtime-preflight.mjs
```

Full production preflight for enterprise releases:

```txt
RISCK_COMPLY_ENTERPRISE_RELEASE=true node scripts/preflight.mjs
```

When `RISCK_COMPLY_ENTERPRISE_RELEASE=true`, release is blocked unless signing configuration, Supabase auth client configuration and a real provider configuration are present. In enterprise IdP mode, Supabase auth client configuration plus at least one non-empty ACR/AMR policy value are required. The runtime preflight delegates to the same release gate and never prints sensitive values. The full production preflight also runs the runtime provider preflight when enterprise release mode is enabled, so deployment validation cannot bypass the step-up provider check.

## Assessment Outcomes

`assessStepUpToken()` and `requireStepUpForRequest()` can reject requests with:

- `missing_verification`
- `invalid_verification`
- `expired_verification`
- `missing_step_up_secret`
- `invalid_step_up_token`
- `missing_step_up_nonce`
- `step_up_token_scope_mismatch`
- `step_up_token_replayed`
- `step_up_token_revoked`
- `step_up_token_store_unavailable`

## Response Standard

When step-up is required, endpoints return `step_up_required` through `stepUpRequiredResponse()`, which uses the centralized no-store response helper.

This prevents browsers, proxies or CDNs from caching sensitive authorization state.

## Challenge Endpoint Policy

The issuing endpoint is `POST /api/security/step-up/challenge`.

It must not accept user-supplied timestamps as proof. It must not issue a token unless Supabase MFA or enterprise IdP verification succeeds.

Fail-closed behavior when unconfigured returns `step_up_provider_not_configured` with status `503`.

Required provider class: `mfa_or_identity_provider_reauthentication`.
