# EuroComply Step-Up Authentication Standard

This document defines the step-up authentication policy for high-risk EuroComply actions.

## Purpose

Step-up authentication reduces the risk of session hijacking, unattended sessions and compromised browser sessions being used to perform sensitive actions.

The current implementation provides signed step-up token validation, endpoint-by-endpoint enforcement, a safe challenge placeholder, regression tests and CI guardrails.

## Current Implementation

| Layer | Location |
| --- | --- |
| Step-up helper | `src/server/security/step-up.ts` |
| Safe challenge placeholder | `src/app/api/security/step-up/challenge/route.ts` |
| Regression tests | `src/server/security/step-up.test.ts` |
| Security gate | `scripts/security/check-step-up.mjs` |

## High-Risk Actions

The current high-risk action registry includes:

- `export_data`
- `manage_billing`
- `manage_team`
- `gdpr_delete`
- `audit_chain_verify`
- `audit_chain_export`
- `change_security_settings`

## Signed Step-Up Token

High-risk endpoints use:

```txt
requireStepUpForRequest()
```

The signed token is expected in:

```txt
X-EuroComply-Step-Up-Token
```

The token is scoped to:

```txt
action
userId
organizationId
verifiedAt
nonce
```

The token type is:

```txt
signed_hmac
```

The dedicated production secret should be:

```txt
STEP_UP_SIGNING_SECRET
```

A fallback to `AUDIT_CHAIN_SIGNING_SECRET` exists only to avoid breaking transitional environments. Production should configure a dedicated step-up secret.

## Default Freshness Window

The default accepted verification window is:

```txt
10 minutes
```

Represented in code as:

```txt
STEP_UP_MAX_AGE_MS = 10 * 60 * 1000
```

## Assessment Outcomes

`assessStepUp()` and `assessStepUpToken()` return one of these rejection reasons when a recent verification is not available:

- `missing_verification`
- `invalid_verification`
- `expired_verification`
- `missing_step_up_secret`
- `invalid_step_up_token`
- `step_up_token_scope_mismatch`

## Response Standard

When step-up is required, endpoints should return:

```txt
step_up_required
```

through `stepUpRequiredResponse()`, which uses the centralized no-store response helper.

This prevents browsers, proxies or CDNs from caching sensitive authorization state.

## Challenge Endpoint Policy

The placeholder endpoint is:

```txt
POST /api/security/step-up/challenge
```

It is intentionally fail-closed until a real MFA or identity-provider reauthentication flow is connected.

Current behavior:

```txt
step_up_provider_not_configured
501
```

Required provider class:

```txt
mfa_or_identity_provider_reauthentication
```

The placeholder must not call `createStepUpToken()` and must not issue a token by itself.

## Enforced Endpoints

Step-up is currently enforced for:

- `GET /api/audit/chain/verify` using `audit_chain_verify`
- `GET /api/audit/evidence-pack` using `export_data`
- `GET /api/security-questionnaire/export` using `export_data`
- `GET /api/vendor-assurance/export` using `export_data`
- `GET /api/enterprise-readiness/export` using `export_data`
- `GET /api/retention-center/export` using `export_data`
- `GET /api/continuity-center/export` using `export_data`
- `POST /api/billing/checkout` using `manage_billing`
- `POST /api/billing/portal` using `manage_billing`
- `POST /api/gdpr/delete-request` using `gdpr_delete`

## Rollout Plan

Recommended remaining rollout order:

1. Team role and invite management.
2. Security settings changes.
3. Real MFA or identity-provider reauthentication integration.
4. Audit events for step-up success and failure.
5. Organization-level step-up policy configuration.

## Future Work

- Persist verified step-up timestamps in a server-side session mechanism.
- Add UI challenge flow for password, OTP or identity provider reauthentication.
- Add audit events for successful and failed step-up challenges.
- Add per-organization policy configuration for shorter or longer step-up windows.
- Enforce step-up in all high-risk API endpoints.
