# Billing checkout intent contract

This document describes the non-sensitive checkout intent layer used before a real payment provider checkout session is created.

## Route

`GET /api/billing/checkout-intent?plan=<planId>`

`POST /api/billing/checkout-intent`

```json
{
  "planId": "enterprise"
}
```

## Supported plan ids

Commercial plan ids:

- `starter`
- `growth`
- `business`
- `enterprise`

Entitlement plan mapping:

- `starter` -> `essential`
- `growth` -> `professional`
- `business` -> `business`
- `enterprise` -> `enterprise`

This mapping is required because public pricing names and internal entitlement names are not identical.

## Response shape

```json
{
  "ok": true,
  "checkoutIntent": {
    "plan": {
      "id": "enterprise",
      "name": "Enterprise",
      "priceMonthly": 990,
      "targetEntitlementPlan": "enterprise"
    },
    "organization": {
      "id": "org-id",
      "name": "Organization name",
      "slug": "organization-slug"
    },
    "currentPlan": "business",
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

## Codex implementation notes

When wiring the real checkout session:

1. Keep this route as the validation gate.
2. Do not return provider secrets or price identifiers to the client.
3. If `checkoutReady` is false and `nextAction` is `configure_plan_price`, show a safe admin/support message rather than failing silently.
4. Create the provider checkout session only after validating user, organization, plan, and target entitlement.
5. Include metadata in the provider session/subscription so the webhook can persist:
   - `organization_id`
   - `billing_plan_id`
   - `target_entitlement_plan`
6. The existing billing webhook should update the organization subscription state only after the provider confirms payment/subscription status.
7. Add-on purchases should write to `organization_add_ons` through the webhook using item or price metadata such as `add_on_id`.

## Current status

The route validates intent but does not create the real provider checkout session yet. This is intentional until the sensitive billing webhook/checkout patch is applied in a local Codex environment with access to the payment provider configuration.
