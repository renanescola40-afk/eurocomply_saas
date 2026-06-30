# Billing checkout intent contract

This document describes the non-sensitive checkout intent layer used before a real payment provider checkout session is created.

## Route

`GET /api/billing/checkout-intent?plan=<planId>`

`POST /api/billing/checkout-intent`

```json
{
  "planId": "growth"
}
```

## Security contract

The checkout intent response includes organization billing state, current entitlement plan and the next billing action. It is therefore organization-sensitive even though it does not create a payment provider session.

Required controls:

- authenticated user;
- current organization context;
- `manage_billing` RBAC permission;
- distributed rate limiting scoped by organization and user;
- bounded JSON parsing for POST bodies;
- trusted Origin validation for POST;
- no-store JSON responses on success and failure;
- no provider secrets or provider price identifiers returned to the client.

## Supported plan ids

Canonical self-serve billing plan ids:

- `starter`
- `growth`
- `enterprise`

Legacy/commercial aliases may still be accepted for backwards compatibility, but public pricing and checkout links must use canonical ids only. This prevents a public pricing label from pointing at a different Stripe price than the one the buyer sees.

Canonical plan mapping:

- `starter` -> `starter`
- `growth` -> `growth`
- `enterprise` -> `enterprise`

Legacy alias mapping:

- `essential` -> `starter`
- `professional` / `pro` / `business` -> `growth`

## Response shape

```json
{
  "ok": true,
  "checkoutIntent": {
    "plan": {
      "id": "growth",
      "name": "Growth",
      "priceMonthly": 149,
      "targetEntitlementPlan": "professional"
    },
    "organization": {
      "id": "org-id",
      "name": "Organization name",
      "slug": "organization-slug"
    },
    "currentPlan": "starter",
    "alreadyOnPlan": false,
    "checkoutReady": true,
    "nextAction": "create_checkout_session"
  }
}
```

## Error responses

- `401 authentication_required` when no authenticated user is present.
- `400 invalid_plan` when the requested plan is not in the billing catalog.
- `409 organization_required` when the user has not created or joined an organization yet.
- `403 insufficient_role_permission` when the user is not allowed to manage billing.
- `429 rate_limited` when the distributed billing-intent limit is exceeded.

## CI enforcement

`scripts/security/check-billing-checkout-intent.mjs` verifies that this route keeps RBAC, rate limiting, Origin validation, bounded JSON parsing and no-store responses. It is delegated from `security:enterprise-api`, which runs inside `security:ci`.

## Codex implementation notes

When wiring the real checkout session:

1. Keep this route as the validation gate.
2. Do not return provider secrets or price identifiers to the client.
3. If `checkoutReady` is false and `nextAction` is `configure_plan_price`, show a safe admin/support message rather than failing silently.
4. Create the provider checkout session only after validating user, organization, canonical plan, target entitlement and `manage_billing` permission.
5. Include metadata in the provider session/subscription so the webhook can persist:
   - `organization_id`
   - `plan`
   - `user_id`
6. The existing billing webhook should update the organization subscription state only after the provider confirms payment/subscription status.
7. Add-on purchases should write to `organization_add_ons` through the webhook using item or price metadata such as `add_on_id`.

## Current status

The route validates intent but does not create the real provider checkout session. It is intentionally kept as an authorization and readiness gate in front of the sensitive checkout creation API.
