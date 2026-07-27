# RISCK COMPLY Enterprise Pricing and Billing Architecture

## Commercial model

| Plan | Monthly | Annual | Included seats | Organizations | Motion |
| --- | ---: | ---: | ---: | ---: | --- |
| Starter | €49 | €490 | 3 | 1 | Self-serve |
| Professional | €199 | €1,990 | 15 | 1 | Self-serve trial |
| Business | €699 | €6,990 | 75 | 3 | Assisted sales |
| Enterprise | Custom, from €2,500/month | Contract | Contract/unlimited | Contract/unlimited | Sales-led |

Enterprise must never be represented by a fixed public Stripe Price. The final amount belongs to a signed order form or contract and may be invoiced manually or through a dedicated Stripe Price created for that customer.

## Source of truth

- `src/lib/billing/plans.ts`: canonical plan catalog, prices, annual discount, limits and Stripe environment keys.
- `src/lib/billing/add-ons.ts`: independent add-on catalog, availability and dependencies.
- `src/lib/billing/feature-gates.ts`: centralized feature and capacity decisions.
- `src/server/queries/subscription.ts`: canonical plan normalization and rank.
- `supabase/migrations/20260727193000_enterprise_billing_catalog.sql`: persistent catalog, usage, feature-flag and customer add-on schema.

Application code must not introduce scattered plan comparisons. Routes, server actions and UI loaders should resolve a `LicenseContext` and call `canAccessFeature`, `requireLicensedFeature`, `getPlanLimit` or `requireWithinLimit`.

## Stripe model

Create one Product per base plan and one Product per add-on. Starter, Professional and Business each require monthly and annual recurring Prices. Enterprise uses customer-specific contract Prices or manual invoice items.

Required base environment variables:

- `STRIPE_PRICE_STARTER_MONTHLY`
- `STRIPE_PRICE_STARTER_ANNUAL`
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY`
- `STRIPE_PRICE_PROFESSIONAL_ANNUAL`
- `STRIPE_PRICE_BUSINESS_MONTHLY`
- `STRIPE_PRICE_BUSINESS_ANNUAL`

Add-on variables use `STRIPE_ADDON_<SLUG>_MONTHLY` and `STRIPE_ADDON_<SLUG>_ANNUAL`.

Seat and capacity add-ons should be subscription items with quantity. Upgrades use immediate proration. Downgrades should normally take effect at period end unless an operator explicitly approves immediate reduction. Customer Portal must be configured to prevent selecting retired or legacy Prices.

## Security and tenant isolation

Billing decisions are server-side. The browser may request a plan or add-on, but it may not assert active entitlements, usage, organization scope or negotiated limits. Webhooks remain authoritative for Stripe state. All new persistence tables use RLS and forced RLS; service-role access is required until explicit tenant-scoped read policies are reviewed.

## Enterprise contracts

Contract overrides are represented by `billing_limits` and `feature_flags` with source `contract`. Supported commercial controls include negotiated prices, unlimited licenses, annual billing, manual invoicing, purchase orders, invoice billing, custom SLA, onboarding and customer-success terms.

## Rollout sequence

1. Apply the migration in a non-production Supabase project.
2. Create Stripe Products and Prices and configure environment variables.
3. Update checkout and portal configuration to use the canonical catalog.
4. Wire webhook subscription items into `customer_add_ons`, usage and entitlement reconciliation.
5. Replace route-local plan checks with the centralized gate service.
6. Update Pricing, Billing, Upgrade, Add-ons Marketplace and Enterprise Contact screens.
7. Run unit, integration, webhook and E2E suites.
8. Capture Stripe test-mode evidence before production activation.

## External validation required

Repository code cannot create or verify live Stripe Products, portal configuration, tax settings, invoice settings, purchase-order operations, Supabase migration execution or production webhook delivery. Those controls require authenticated provider access and runtime evidence.
