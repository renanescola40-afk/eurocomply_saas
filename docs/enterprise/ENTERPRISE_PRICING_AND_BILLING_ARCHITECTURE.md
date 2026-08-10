# RISCK COMPLY Enterprise Pricing and Billing Architecture

## Commercial model

| Public plan | Internal compatibility ID | Monthly | Annual reference | Included seats | Organizations | Motion |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Essential | `starter` | €49 | €490 | 3 | 1 | Self-serve |
| Professional | `professional` | €149 | €1,490 | 15 | 1 | Self-serve trial |
| Business | `business` | €399 | €3,990 | 75 | 3 | Demo / assisted sales |
| Enterprise | `enterprise` | From €990/month | Contract | Contract/unlimited | Contract/unlimited | Sales-led |

The annual references retain the existing commercial convention of charging ten monthly payments for a twelve-month term. They are repository catalog values only until matching Stripe Prices are created and verified.

Enterprise remains contract-priced. `From €990/month` is a public starting reference, **not** a fixed public Stripe Price and not a guarantee that every Enterprise contract will be €990. The final amount belongs to a signed order form or contract and may be invoiced manually or through a dedicated customer-specific Stripe Price.

## Versioned commercial source of truth

`config/billing-commercial-catalog.json` is the machine-readable commercial contract for public naming, EUR amounts, annual convention, Stripe environment naming and transition rules.

Application authorities remain:

- `src/lib/billing/plans.ts`: application plan catalog, limits, public naming and Stripe key resolution.
- `src/server/billing/plans.ts`: server-side checkout/catalog authority and entitlements.
- `src/lib/billing/add-ons.ts`: independent add-on catalog, availability and dependencies.
- `src/lib/billing/feature-gates.ts`: centralized feature and capacity decisions.
- `src/server/queries/subscription.ts`: canonical persisted-plan normalization and rank.
- `public.organization_add_ons`: existing customer add-on authority used by checkout and entitlement resolution.
- historical Supabase billing migrations: historical schema/data intent only; they are not edited retroactively to change commercial prices.

Tests must fail when the TypeScript catalogs drift from the versioned commercial contract.

## Public naming vs persisted compatibility IDs

The public entry plan is **Essential**, while the persisted/internal canonical ID remains `starter` for compatibility with existing subscriptions, migrations, feature gates and customer data.

Accepted transition aliases include:

- `essential` -> `starter`
- `starter` -> `starter`
- `growth` / `pro` -> `professional`
- `professional` -> `professional`
- `business` -> `business`
- `enterprise` -> `enterprise`

Renaming the public plan must not rewrite real subscriptions or migration history.

## Stripe model

Use one Product per base plan and one Product per add-on when provider configuration is created. Essential and Professional are self-serve subscription plans. Business remains assisted-sales in the current product motion even though the repository has a commercial monthly/annual reference. Enterprise is sales-led and uses negotiated contract billing.

Canonical base environment variables:

- `STRIPE_PRICE_ESSENTIAL_MONTHLY`
- `STRIPE_PRICE_ESSENTIAL_ANNUAL`
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY`
- `STRIPE_PRICE_PROFESSIONAL_ANNUAL`
- `STRIPE_PRICE_BUSINESS_MONTHLY`
- `STRIPE_PRICE_BUSINESS_ANNUAL`

Transition-only monthly fallbacks:

- `STRIPE_PRICE_STARTER_MONTHLY` may temporarily back Essential.
- `STRIPE_PRICE_GROWTH_MONTHLY` may temporarily back Professional.

A legacy fallback can preserve runtime compatibility, but **does not prove canonical commercial-price readiness**. Production price proof must validate the Stripe Price amount, currency, recurring interval and active state against `config/billing-commercial-catalog.json` before canonical billing can be marked ready.

Legacy Enterprise price variables may remain readable for existing contracts, but there is no fixed public Enterprise Price requirement. New Enterprise contracts should use customer-specific commercial terms.

Add-on variables continue to use `STRIPE_ADDON_<SLUG>_MONTHLY` and `STRIPE_ADDON_<SLUG>_ANNUAL`.

## Checkout policy

Current public motion:

- Essential: self-serve Checkout allowed when a verified canonical/fallback Price ID is configured.
- Professional: self-serve Checkout/trial allowed when a verified canonical/fallback Price ID is configured.
- Business: sales-assisted; direct generic self-serve Checkout remains disabled by `isSelfServePlan`.
- Enterprise: sales-led; generic self-serve Checkout remains disabled.

The browser may request a plan, but it may not assert entitlements, price amounts, organization scope or negotiated limits. Checkout resolves plan and Price server-side.

## Price migration safety

Changing a repository amount does not mutate existing Stripe subscriptions. Stripe Prices are immutable commercial objects; live transitions therefore require new Prices rather than editing historical Prices.

Safe rollout:

1. merge and validate repository catalog alignment;
2. keep legacy Price IDs readable so existing customers continue to map correctly;
3. create new canonical Stripe Prices outside this repository workflow under explicit provider authorization;
4. configure canonical environment keys;
5. run provider-side proof that verifies amount/currency/interval/active state;
6. update Customer Portal allowed products/prices deliberately;
7. confirm webhooks continue mapping both legacy and canonical Price IDs to the same internal entitlement plan;
8. retire legacy public purchase paths only after existing-subscription compatibility is proven.

Never rewrite historical migrations solely to change current commercial amounts.

## Security and tenant isolation

Billing decisions are server-side. Webhooks remain authoritative for subscription state. Billing authority tables permit tenant-scoped reads and deny authenticated browser writes; service-role backend operations remain authoritative.

Seat and capacity add-ons should be subscription items with quantity. Upgrades use immediate proration where intended. Downgrades should normally take effect at period end unless an operator explicitly approves immediate reduction. Customer Portal must be configured to prevent selecting retired or unintended legacy Prices.

## Enterprise contracts

Contract overrides are represented by billing limits and feature flags with source `contract`. Supported commercial controls include negotiated prices, unlimited licenses, annual billing, manual invoicing, purchase orders, invoice billing, custom SLA, onboarding and customer-success terms.

`From €990/month` is a positioning floor/reference, not a substitute for contract approval, quote acceptance or invoice terms.

## External validation required

Repository code cannot by itself create or verify live Stripe Products, canonical production Price IDs, Customer Portal configuration, tax settings, invoice settings, purchase-order operations, Supabase migration execution or production webhook delivery.

Those controls require authenticated provider access and exact-SHA runtime evidence. Until canonical Stripe Prices matching the approved catalog are provider-verified, legacy working prices must be described as **compatibility**, not as proof that the new commercial ladder is live.
