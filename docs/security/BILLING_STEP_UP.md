# EuroComply Billing Step-Up Control

This document defines the step-up requirement for billing-sensitive actions.

## Purpose

Billing endpoints can create Stripe checkout sessions or open the customer billing portal. These actions may change subscription state, payment method data, invoices or plan selection.

To reduce the risk of session hijacking and unattended sessions, billing actions require a recent signed step-up token.

## Covered Endpoints

| Endpoint | Action |
| --- | --- |
| `POST /api/billing/checkout` | Create Stripe subscription checkout session |
| `POST /api/billing/portal` | Create Stripe billing portal session |

## Required Controls

Both endpoints must enforce:

- authenticated user
- active organization context
- `manage_billing` permission
- trusted origin validation
- signed step-up token for `manage_billing`
- no-store JSON response

## Step-Up Token

Billing uses the same centralized helper used by other high-risk APIs:

```txt
requireStepUpForRequest()
```

The token must be scoped to:

```txt
action = manage_billing
userId
organizationId
verifiedAt
```

The response payload should include step-up evidence metadata:

```txt
stepUp.action
stepUp.verifiedAt
stepUp.expiresAt
stepUp.tokenType = signed_hmac
```

## Stripe Metadata

Checkout session metadata should include step-up evidence where supported:

```txt
step_up_action
step_up_verified_at
```

This allows later reconciliation between billing actions and security audit context.

## Future Work

- Add a dedicated regression gate for billing step-up once the general API guard can be edited safely.
- Emit explicit audit events for billing step-up success and failure.
- Connect UI reauthentication/MFA flow to signed step-up token issuance.
- Enforce the same pattern for team management and GDPR delete operations.
