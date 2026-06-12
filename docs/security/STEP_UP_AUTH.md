# EuroComply Step-Up Authentication Standard

This document defines the step-up authentication policy for high-risk EuroComply actions.

## Purpose

Step-up authentication reduces the risk of session hijacking, unattended sessions and compromised browser sessions being used to perform sensitive actions.

The current implementation provides a central helper and regression tests. Endpoint-by-endpoint enforcement can be rolled out gradually.

## Current Implementation

| Layer | Location |
| --- | --- |
| Step-up helper | `src/server/security/step-up.ts` |
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

`assessStepUp()` returns one of these rejection reasons when a recent verification is not available:

- `missing_verification`
- `invalid_verification`
- `expired_verification`

## Response Standard

When step-up is required, endpoints should return:

```txt
step_up_required
```

through `stepUpRequiredResponse()`, which uses the centralized no-store response helper.

This prevents browsers, proxies or CDNs from caching sensitive authorization state.

## Rollout Plan

Recommended rollout order:

1. Audit chain verification/export.
2. Enterprise evidence exports.
3. GDPR delete requests.
4. Billing portal/checkout.
5. Team role and invite management.
6. Security settings changes.

## Future Work

- Persist verified step-up timestamps in a server-side session mechanism.
- Add UI challenge flow for password, OTP or identity provider reauthentication.
- Add audit events for successful and failed step-up challenges.
- Add per-organization policy configuration for shorter or longer step-up windows.
- Enforce step-up in all high-risk API endpoints.
