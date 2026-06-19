# EuroComply Step-Up Authentication Standard

This document defines the enterprise step-up authentication policy for high-risk EuroComply actions.

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

High-risk endpoints use:

```txt
await requireStepUpForRequest()
```

The signed token is expected in:

```txt
X-EuroComply-Step-Up-Token
```

The token type is:

```txt
signed_hmac
```

The token payload is scoped to:

```txt
action
userId
organizationId
verifiedAt
issuedAt
expiresAt
nonce
verificationMethod
```

The nonce is mandatory, generated server-side, stored as a server-side record and consumed once. A replayed token must fail with `step_up_token_replayed`.

The server stores only a HMAC token hash, not the raw token.

## Freshness Window

The default accepted verification window is:

```txt
5 minutes
```

Represented in code as:

```txt
STEP_UP_MAX_AGE_MS = 5 * 60 * 1000
```

The database also enforces that `expires_at <= verified_at + interval '5 minutes'`.

## Real Verification Providers

### Supabase MFA

Set:

```txt
STEP_UP_PROVIDER_MODE=supabase_mfa
```

Required runtime behavior:

1. `POST /api/security/step-up/challenge` receives a supported high-risk `action`.
2. The endpoint lists verified MFA factors when no `factorId` is supplied.
3. The endpoint creates a provider challenge with `supabase.auth.mfa.challenge()`.
4. The user submits `factorId`, `challengeId` and `code`.
5. The endpoint verifies with `supabase.auth.mfa.verify()` or `challengeAndVerify()`.
6. The endpoint calls `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` and requires `currentLevel === 'aal2'`.
7. Only then is a signed HMAC step-up token created and persisted.

### Enterprise IdP / SAML / OIDC

Set:

```txt
STEP_UP_PROVIDER_MODE=enterprise_idp
STEP_UP_IDP_ACR_VALUES=<allowed acr values>
# or
STEP_UP_IDP_AMR_VALUES=<allowed amr values>
```

Required runtime behavior:

1. The endpoint reads verified session claims through `supabase.auth.getClaims()`.
2. `auth_time` or `iat` must be fresh within `STEP_UP_MAX_AGE_MS`.
3. `acr` must match `STEP_UP_IDP_ACR_VALUES` or `amr` must match `STEP_UP_IDP_AMR_VALUES`.
4. Only then is a signed HMAC step-up token created and persisted.

### Hybrid Mode

Set:

```txt
STEP_UP_PROVIDER_MODE=supabase_mfa_or_enterprise_idp
```

This allows Supabase MFA or enterprise IdP reauthentication, but still fails closed when neither provider is configured or neither verifies the current request.

## Required Secrets and Release Gate

Production should configure:

```txt
STEP_UP_SIGNING_SECRET
```

A fallback to `AUDIT_CHAIN_SIGNING_SECRET` exists only to avoid breaking transitional environments. Production should configure a dedicated step-up secret.

Static release gate:

```txt
EUROCOMPLY_ENTERPRISE_RELEASE=true node scripts/security/check-step-up.mjs
```

Runtime provider preflight:

```txt
node scripts/security/check-step-up-runtime-preflight.mjs
```

When `EUROCOMPLY_ENTERPRISE_RELEASE=true`, release is blocked unless the signing secret and a real provider configuration are present. The runtime preflight prints only redacted configuration status and fails when provider mode, signing key or Supabase MFA / enterprise IdP policy is missing.

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

When step-up is required, endpoints return:

```txt
step_up_required
```

through `stepUpRequiredResponse()`, which uses the centralized no-store response helper.

This prevents browsers, proxies or CDNs from caching sensitive authorization state.

## Challenge Endpoint Policy

The issuing endpoint is:

```txt
POST /api/security/step-up/challenge
```

It must not accept user-supplied timestamps as proof. It must not issue a token unless Supabase MFA or enterprise IdP verification succeeds.

Fail-closed behavior when unconfigured:

```txt
step_up_provider_not_configured
503
```

Required provider class:

```txt
mfa_or_identity_provider_reauthentication
```

## Enforced Endpoints

Step-up is enforced for:

- `GET /api/gdpr/export` using `export_data`
- `GET /api/audit/chain/verify` using `audit_chain_verify`
- `GET /api/audit/evidence-pack` using `audit_chain_export`
- `GET /api/security-questionnaire/export` using `export_data`
- `GET /api/vendor-assurance/export` using `export_data`
- `GET /api/enterprise-readiness/export` using `export_data`
- `GET /api/retention-center/export` using `export_data`
- `GET /api/continuity-center/export` using `export_data`
- `POST /api/billing/checkout` using `manage_billing`
- `POST /api/billing/portal` using `manage_billing`
- `POST /api/team/invites` using `manage_team`
- `POST /api/team/members/remove` using `manage_team`
- `POST /api/team/members/role` using `manage_team`
- `POST /api/team/invitations/cancel` using `manage_team`
- `POST /api/gdpr/delete-request` using `gdpr_delete`

Security settings mutation endpoints must use `change_security_settings` before those write routes are enabled for enterprise release.

## Audit Events

Step-up emits security audit metadata for:

- `step_up_requested`
- `step_up_approved`
- `step_up_denied`
- `step_up_expired`

Audit events are written through `writeAuditLog()` as `security.event` and include the high-risk action, reason, nonce when safe, and verification method. Secrets and raw tokens are never logged.

## UI

`src/components/security/step-up-mfa-dialog.tsx` provides a reusable client dialog that:

1. Starts `/api/security/step-up/challenge` for the requested action.
2. Shows available MFA factors.
3. Issues a provider challenge.
4. Submits the one-time code.
5. Returns the resulting step-up token to the caller.

Critical action callers should attach the returned token to `X-EuroComply-Step-Up-Token` and immediately retry the protected operation.

## Tests

`src/server/security/step-up.test.ts` covers:

- action without step-up fails;
- expired verification fails;
- token scoped to another organization fails;
- token scoped to another action fails;
- tampered token fails;
- replayed single-use token fails;
- valid scoped token passes;
- provider not configured fails closed.

The security gate also checks migration, UI, runtime evidence and enterprise release blocking behavior. The runtime preflight gives operators a deploy-time command to confirm that real Supabase MFA or enterprise IdP configuration is present without printing sensitive values.
