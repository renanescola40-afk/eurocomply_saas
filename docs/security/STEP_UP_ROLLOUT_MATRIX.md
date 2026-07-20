# EuroComply Step-Up Rollout Matrix

This matrix tracks high-risk actions that require signed, real-verification step-up enforcement.

## Enforcement Status

| Area | Endpoint | Action | Status | Evidence |
| --- | --- | --- | --- | --- |
| GDPR data export | `GET /api/gdpr/export` | `export_data` | Enforced | `await requireStepUpForRequest`, `signed_hmac`, single-use nonce |
| Audit chain verification | `GET /api/audit/chain/verify` | `audit_chain_verify` | Enforced | `await requireStepUpForRequest`, `signed_hmac`, single-use nonce |
| Audit chain export / evidence pack | `GET /api/audit/evidence-pack` | `audit_chain_export` | Enforced | export payload and audit metadata include step-up evidence |
| Security questionnaire | `GET /api/security-questionnaire/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Vendor assurance | `GET /api/vendor-assurance/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Enterprise readiness | `GET /api/enterprise-readiness/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Retention center | `GET /api/retention-center/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Continuity center | `GET /api/continuity-center/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Documents CSV | `GET /api/reports/documents.csv` | `export_data` | Enforced | RBAC and entitlement precede request-bound single-use step-up; audit records verification metadata |
| Executive CSV | `GET /api/reports/executive.csv` | `export_data` | Enforced | RBAC and entitlement precede request-bound single-use step-up; audit records verification metadata |
| Risks CSV | `GET /api/reports/risks.csv` | `export_data` | Enforced | RBAC and entitlement precede request-bound single-use step-up; audit records verification metadata |
| Tasks CSV | `GET /api/reports/tasks.csv` | `export_data` | Enforced | RBAC and entitlement precede request-bound single-use step-up; audit records verification metadata |
| Vendors CSV | `GET /api/reports/vendors.csv` | `export_data` | Enforced | RBAC and entitlement precede request-bound single-use step-up; audit records verification metadata |
| Billing checkout | `POST /api/billing/checkout` | `manage_billing` | Enforced | Stripe metadata and response include step-up evidence |
| Billing portal | `POST /api/billing/portal` | `manage_billing` | Enforced | response includes step-up evidence |
| Team invite management | `POST /api/team/invites` | `manage_team` | Enforced | `await requireStepUpForRequest` runs after RBAC and before invite creation |
| Team member removal | `POST /api/team/members/remove` | `manage_team` | Enforced | `await requireStepUpForRequest` runs after RBAC and before destructive membership write |
| Team role changes | `POST /api/team/members/role` | `manage_team` | Enforced | `await requireStepUpForRequest` runs after RBAC and before role mutation; self-change and last-owner demotion are blocked |
| Team invitation cancellation | `POST /api/team/invitations/cancel` | `manage_team` | Enforced | `await requireStepUpForRequest` runs after RBAC and before invitation status change |
| Security settings changes | `POST /api/security/settings` | `change_security_settings` | Enforced | `await requireStepUpForRequest` runs after `manage_settings` RBAC and before settings upsert |
| GDPR delete request | `POST /api/gdpr/delete-request` | `gdpr_delete` | Enforced | audit metadata and response include step-up evidence |
| Step-up challenge | `POST /api/security/step-up/challenge` | requested action | Real provider required | Supabase MFA or enterprise IdP, token issued only after verification |
| Step-up UI | `src/components/security/step-up-mfa-dialog.tsx` | requested action | Available | reusable challenge UI for MFA factor, challenge and one-time code |
| Team settings UI | `src/components/team/team-settings-section.tsx` | `manage_team` | Enforced | calls fixed protected APIs with `x-eurocomply-step-up-token`, not direct server actions |
| CSV export UI | `src/components/reports/step-up-csv-export-button.tsx` | `export_data` | Enforced | challenges first, then performs a same-origin fetch with `x-eurocomply-step-up-token` and downloads the returned Blob |
| Runtime provider preflight | `scripts/security/check-step-up-runtime-preflight.mjs` | release validation | Available | redacted deploy-time check for provider mode, signing key and Supabase MFA / enterprise IdP policy |

## Remaining High-Risk Rollout

All currently enabled high-risk routes in the repository snapshot have step-up enforcement. Any future mutation that maps to a high-risk action must be added to this matrix and to `scripts/security/check-step-up.mjs` before release.

## Required Pattern

Every high-risk endpoint should use:

```txt
await requireStepUpForRequest()
```

Expected response evidence:

```txt
stepUp.verified = true
```

Expected audit metadata when an audit event is written:

```txt
stepUpAction
stepUpVerifiedAt
stepUpTokenType = signed_hmac
```

The public response intentionally does not expose nonce, token hash, scopes or signature metadata.

## Real Verification Policy

The step-up challenge endpoint supports:

```txt
STEP_UP_PROVIDER_MODE=supabase_mfa
STEP_UP_PROVIDER_MODE=enterprise_idp
STEP_UP_PROVIDER_MODE=supabase_mfa_or_enterprise_idp
```

Required provider class:

```txt
mfa_or_identity_provider_reauthentication
```

Tokens are issued only after Supabase MFA `aal2` verification or a fresh enterprise IdP claim that matches `STEP_UP_IDP_ACR_VALUES` or `STEP_UP_IDP_AMR_VALUES`.

## Fail-Closed Challenge Policy

When no real MFA/IdP provider is configured, the challenge endpoint must block token issuance.

Expected behavior:

```txt
step_up_provider_not_configured
HTTP 503
```

## Operational Notes

- `STEP_UP_SIGNING_SECRET` should be configured separately from audit-chain and evidence-pack signing secrets.
- Step-up token freshness defaults to 5 minutes.
- Raw timestamp headers are not accepted.
- Tokens are scoped to action, user and organization.
- Tokens include a mandatory single-use nonce and are persisted as server-side hashes in `step_up_tokens`.
- `EUROCOMPLY_ENTERPRISE_RELEASE=true node scripts/security/check-step-up.mjs` blocks release when MFA/IdP real verification is not configured.
- `node scripts/security/check-step-up-runtime-preflight.mjs` should be run in the deploy environment before enterprise release; it prints only configured/missing status and never prints secret values.
