# EuroComply Step-Up Rollout Matrix

This matrix tracks high-risk actions that require signed step-up enforcement.

## Enforcement Status

| Area | Endpoint | Action | Status | Evidence |
| --- | --- | --- | --- | --- |
| Audit chain | `GET /api/audit/chain/verify` | `audit_chain_verify` | Enforced | `requireStepUpForRequest`, `signed_hmac` |
| Audit evidence pack | `GET /api/audit/evidence-pack` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Security questionnaire | `GET /api/security-questionnaire/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Vendor assurance | `GET /api/vendor-assurance/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Enterprise readiness | `GET /api/enterprise-readiness/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Retention center | `GET /api/retention-center/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Continuity center | `GET /api/continuity-center/export` | `export_data` | Enforced | export payload and audit metadata include step-up evidence |
| Billing checkout | `POST /api/billing/checkout` | `manage_billing` | Enforced | Stripe metadata and response include step-up evidence |
| Billing portal | `POST /api/billing/portal` | `manage_billing` | Enforced | response includes step-up evidence |
| GDPR delete request | `POST /api/gdpr/delete-request` | `gdpr_delete` | Enforced | audit metadata and response include step-up evidence |
| Step-up challenge | `POST /api/security/step-up/challenge` | n/a | Fail-closed | returns provider-not-configured until MFA or IdP reauthentication exists |

## Remaining High-Risk Rollout

| Area | Action | Target Status |
| --- | --- | --- |
| Team invite management | `manage_team` | Pending endpoint mapping |
| Team role changes | `manage_team` | Pending endpoint mapping |
| Team member removal | `manage_team` | Pending endpoint mapping |
| Security settings changes | `change_security_settings` | Pending endpoint mapping |
| Audit chain export | `audit_chain_export` | Pending endpoint implementation |

## Required Pattern

Every high-risk endpoint should use:

```txt
requireStepUpForRequest()
```

Expected response evidence:

```txt
stepUp.action
stepUp.verifiedAt
stepUp.expiresAt
stepUp.tokenType = signed_hmac
```

Expected audit metadata when an audit event is written:

```txt
stepUpAction
stepUpVerifiedAt
stepUpTokenType = signed_hmac
```

## Fail-Closed Challenge Policy

The step-up challenge endpoint must not issue tokens until a real MFA or identity-provider reauthentication flow is integrated.

Current expected behavior:

```txt
step_up_provider_not_configured
HTTP 501
```

## Operational Notes

- `STEP_UP_SIGNING_SECRET` should be configured separately from audit-chain and evidence-pack signing secrets.
- Step-up token freshness defaults to 10 minutes.
- Raw timestamp headers are not accepted.
- Tokens are scoped to action, user and organization.
