# Vercel typecheck fix prepared

Vercel build for commit `9b136c9` failed during type checking because `src/app/api/billing/checkout-intent/route.ts` still keeps legacy plan aliases in a map typed as `Record<BillingPlanId, SubscriptionPlan>`.

`BillingPlanId` is now canonical via `src/lib/billing/plans.ts`, so object keys like `starter` and `growth` are intentionally no longer valid there.

## Safe fix

`getBillingPlan(planId)` already normalizes legacy inbound values. After that call, `plan.id` is canonical and can be used directly as the target entitlement plan.

Apply this local patch:

```diff
diff --git a/src/app/api/billing/checkout-intent/route.ts b/src/app/api/billing/checkout-intent/route.ts
--- a/src/app/api/billing/checkout-intent/route.ts
+++ b/src/app/api/billing/checkout-intent/route.ts
@@
-import { getBillingPlan, getStripePriceId, type BillingPlanId } from '@/lib/billing/plans';
+import { getBillingPlan, getStripePriceId } from '@/lib/billing/plans';
@@
-const BILLING_TO_ENTITLEMENT_PLAN: Record<BillingPlanId, SubscriptionPlan> = {
-  starter: 'essential',
-  growth: 'professional',
-  business: 'business',
-  enterprise: 'enterprise',
-};
-
@@
-  const targetEntitlementPlan = BILLING_TO_ENTITLEMENT_PLAN[plan.id];
+  const targetEntitlementPlan: SubscriptionPlan = plan.id;
```

## Validation

Run:

```bash
npm run build
npm run security:ci
```

This keeps canonical plan IDs and legacy alias support without reintroducing legacy IDs into the canonical billing type.
