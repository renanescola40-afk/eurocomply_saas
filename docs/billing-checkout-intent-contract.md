# Billing checkout intent contract

This document describes the non-sensitive checkout intent layer used before a real payment provider checkout session is created.

## Route

`GET /api/billing/checkout-intent?plan=<planId>`

`POST /api/billing/checkout-intent`

```json
{
  "planId": "professional"
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

Current canonical catalog ids:

- `starter` — Essential, self-serve;
- `professional` — Professional, self-serve;
- `business` — Business, sales-assisted;
- `enterprise` — Enterprise, contract/sales-assisted.

Legacy/commercial aliases remain accepted for backwards compatibility where the shared catalog normalizer is used:

- `essential` -> `starter`;
- `growth` -> `professional`;
- `pro` -> `professional`;
- `basic` / `free` are **historical persisted-data aliases only**. Public checkout URLs, Checkout Intent and paid mutations reject these labels rather than interpreting them as a €49 paid Essential plan.

Business is not an alias for Professional. Enterprise has no fixed public checkout price; it carries a starting commercial reference and remains sales-assisted. Public pricing and checkout links should use the current catalog ids rather than legacy Starter/Growth-era aliases.

## Response shape

```json
{
  "ok": true,
  "checkoutIntent": {
    "plan": {
      "id": "professional",
      "name": "Professional",
      "priceMonthly": 149,
      "targetEntitlementPlan": "professional",
      "salesLed": false
    },
    "organization": {
      "id": "org-id",
      "name": "Organization name",
      "slug": "organization-slug"
    },
    "currentPlan": "starter",
    "licensed": true,
    "authoritySource": "stripe",
    "alreadyOnPlan": false,
    "checkoutReady": true,
    "nextAction": "create_checkout_session"
  }
}
```

For Business or Enterprise, `checkoutReady` remains false and `nextAction` is `contact_sales`.

For Essential and Professional, `checkoutReady` is true only when the explicit
`RISCK_COMPLY_PAID_BILLING_REQUIRED === 'true'` release flag is enabled, both
Terms and Privacy are effective, the canonical plan price is configured and
the organization does not already hold that plan. During review or before the
paid release, `checkoutReady` stays false and `nextAction` is
`public_paid_checkout_unavailable`. This signal must not override the final
security/contract checks in `POST /api/billing/checkout`. The example above
illustrates a **future approved paid release**, not current QA or production readiness.

## Error responses

- `401 authentication_required` when no authenticated user is present.
- `400 invalid_plan` when the plan is unknown or uses ambiguous free/basic public checkout labels.
- `409 organization_required` when the user has not created or joined an organization yet.
- `403 insufficient_role_permission` when the user is not allowed to manage billing.
- `429 rate_limited` when the distributed billing-intent limit is exceeded.

## CI enforcement

`scripts/security/check-billing-checkout-intent.mjs` verifies that this route keeps RBAC, rate limiting, Origin validation, bounded JSON parsing and no-store responses. It is delegated from `security:enterprise-api`, which runs inside `security:ci`.

## Implementation notes

1. Keep this route as the authorization/readiness gate.
2. Do not return provider secrets or price identifiers to the client.
3. If `checkoutReady` is false, use `nextAction` to render the truthful sales-assisted or configuration state rather than failing silently.
4. Create provider checkout sessions only after validating user, organization, canonical plan, target entitlement and `manage_billing` permission.
5. Include metadata in provider session/subscription so signed webhook reconciliation can persist:
   - `organization_id`
   - `plan`
   - `user_id`
6. The billing webhook updates organization subscription authority only after provider confirmation.
7. Add-on purchases reconcile into `organization_add_ons` from signed provider subscription-item truth, not from browser state.

## Current status

The route validates intent and commercial readiness. Actual self-serve checkout creation is owned by the protected billing checkout endpoint and remains subject to the current paid-GA / release gates. Business and Enterprise remain sales-assisted by catalog policy.
