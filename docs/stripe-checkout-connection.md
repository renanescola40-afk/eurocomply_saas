# Stripe checkout connection

RISCK COMPLY uses Stripe Checkout for self-serve subscription purchase and retains sales-led flows for higher-touch plans.

## Canonical commercial catalog

The machine-readable source of truth is `config/billing-commercial-catalog.json`:

- Essential: €49/month
- Professional: €149/month
- Business: €399/month, currently sales-assisted
- Enterprise: from €990/month, contract-priced and sales-led

Enterprise does not require a fixed public Stripe Price. A negotiated Enterprise contract may use a customer-specific Price or invoice after commercial approval.

## Canonical environment variables

Monthly:

- `STRIPE_PRICE_ESSENTIAL_MONTHLY`
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY`
- `STRIPE_PRICE_BUSINESS_MONTHLY`

Annual:

- `STRIPE_PRICE_ESSENTIAL_ANNUAL`
- `STRIPE_PRICE_PROFESSIONAL_ANNUAL`
- `STRIPE_PRICE_BUSINESS_ANNUAL`

Transition-only fallbacks remain readable for existing deployments and subscriptions:

- `STRIPE_PRICE_STARTER_MONTHLY` -> Essential compatibility
- `STRIPE_PRICE_GROWTH_MONTHLY` -> Professional compatibility
- existing Enterprise Price IDs may remain mapped to already-negotiated contracts

A fallback Price can keep an existing billing flow operational, but does **not** prove that the canonical commercial catalog is live.

## Runtime proof

`Stripe Commercial Catalog Proof` validates the canonical production monthly Price IDs read-only against Stripe. Each Price must be:

- configured under the canonical environment key;
- reachable with the protected Stripe account credential;
- active;
- attached to an active Product;
- EUR;
- recurring monthly;
- exactly €49, €149 or €399 according to the plan.

The proof stores only booleans and expected public amounts. It never stores Stripe secret keys, Price IDs, Product IDs, response bodies or customer data.

## Checkout boundary

Essential and Professional are the current generic self-serve plans. Business and Enterprise remain sales-led and are rejected by the generic self-serve checkout guard.

The browser may request a plan, but server-side billing code resolves the internal plan, Stripe Price and organization scope. Webhooks remain authoritative for subscription state and entitlement synchronization.

Changing repository pricing does not mutate existing Stripe subscriptions. New live Prices must be created under explicit provider authorization, configured under the canonical variables, validated by the runtime proof and then rolled into customer purchase/portal flows deliberately.
