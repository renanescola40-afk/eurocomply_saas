# Stripe LIVE Account Migration — RISCK COMPLY

## Purpose

This runbook migrates production Stripe provider authority to the reviewed account:

- account ID: `acct_1U6IuJGt3cgjPOtq`
- display name: `RISCK COMPLY SAAS`
- repository authority: `config/stripe-live-account-authority.json`

The migration preserves the current commercial contract and does not create synthetic commercial activity.

## Truth boundary

This runbook and the protected bootstrap may create or reuse Stripe Products and recurring Prices and may align the event set of an already-existing canonical webhook endpoint. They do **not** create customers, Checkout Sessions, subscriptions, invoices, PaymentIntents, charges, or fake lifecycle evidence.

`BILLING_PRODUCT_EU_AI_ACT: PASS` remains prohibited until a legitimate LIVE customer lifecycle produces signed provider events, processed LIVE ledger evidence, correct tenant/subscription correlation, and final protected closeout evidence.

## Canonical commercial contract

The versioned repository contract remains `config/billing-commercial-catalog.json`:

| Plan | Monthly | Annual | Commercial path |
|---|---:|---:|---|
| Essential | €49 | €490 | self-serve |
| Professional | €149 | €1,490 | self-serve |
| Business | €399 | €3,990 | sales-led |
| Enterprise | negotiated | negotiated | sales-led; no fixed public Stripe Price required |

Canonical lookup keys created/reused by the bootstrap:

- `risk_comply_essential_monthly`
- `risk_comply_essential_annual`
- `risk_comply_professional_monthly`
- `risk_comply_professional_annual`
- `risk_comply_plan_399_monthly`
- `risk_comply_plan_399_annual`

## Preconditions — human/provider actions

Do not run the protected bootstrap until all of the following are true:

1. The new Stripe account has completed required onboarding/verification and is operating in LIVE mode.
2. The account reports `charges_enabled=true` and `details_submitted=true`. The bootstrap independently verifies both and aborts otherwise.
3. A LIVE secret or restricted key belonging to the new account is stored in GitHub Environment **Production** as `STRIPE_SECRET_KEY`.
4. In the new Stripe LIVE Dashboard, create exactly one enabled webhook endpoint at:
   `https://www.risckcomply.com/api/stripe/webhook`
5. Subscribe that endpoint to exactly the versioned event set from `config/stripe-webhook-contract.json`:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
6. Copy the webhook signing secret directly into GitHub Environment **Production** as `STRIPE_WEBHOOK_SECRET`. Never paste it into chat, Git, a PR, an issue, a workflow input, or an artifact.
7. `VERCEL_TOKEN` in GitHub Environment **Production** must still authorize the canonical Vercel project defined by `config/production-provider-targets.json`.

The bootstrap intentionally does not create the webhook endpoint. Stripe reveals the signing secret at endpoint creation time, while this workflow has no approved secret-write channel back into GitHub. Requiring the endpoint and secret first prevents a half-configured provider state or secret disclosure.

## Protected bootstrap

Run GitHub Actions workflow **Stripe Live Account Bootstrap** with:

- `release_sha`: the exact current `main` SHA
- `confirmation`: `PROVISION_NEW_STRIPE_LIVE_ACCOUNT`

The workflow uses Environment **Production**, checks out the exact current `main`, loads the reviewed account authority from `config/stripe-live-account-authority.json`, and passes protected secrets only after the environment gate.

The bootstrap then:

1. authenticates to Stripe with the protected LIVE key;
2. requires the provider account ID to equal `acct_1U6IuJGt3cgjPOtq`;
3. requires `charges_enabled=true` and `details_submitted=true`;
4. creates or reuses the three canonical managed Products;
5. creates or reuses six recurring EUR Prices with immutable amount/cadence/lookup-key checks;
6. requires one singular canonical LIVE webhook and aligns only its event set if necessary;
7. writes the new Stripe secret, webhook secret, and canonical Price IDs to **Vercel Production** without printing protected values;
8. re-reads the safe `price_*` bindings from Vercel to prove the provider-binding source is usable.

If an existing Vercel Price binding is of type `sensitive`, the bootstrap fails before mutation. Price IDs must remain re-readable non-secret configuration so the production proof can compare the actual application binding to the Stripe provider object.

## Vercel deployment cutover

Changing Vercel environment variables does not mutate an already-built deployment. After a successful bootstrap, create a fresh Production deployment of the exact intended current `main` SHA.

Do not claim provider cutover while Production is still serving a deployment built with the old Stripe environment.

After redeployment, verify:

- deployment target is `production`;
- deployment is `READY`;
- deployment Git SHA equals the current reviewed `main` SHA;
- canonical domains still point at that deployment.

## Customer Portal default

`config/stripe-billing-portal-contract.json` deliberately uses `configurationId: null`, which means the Stripe account-default Customer Portal configuration is authoritative.

A Portal configuration created through the Stripe API is not automatically the account default. Therefore:

1. configure/save the account-default Customer Portal in the new Stripe LIVE Dashboard;
2. use return URL `https://www.risckcomply.com/pt/dashboard/organizations/billing`;
3. enable customer address/tax ID updates, invoice history, and payment-method updates;
4. keep Portal subscription cancellation and subscription updates disabled;
5. run protected workflow **Stripe Billing Portal Bootstrap** against the exact current `main` SHA using confirmation `PROVISION_STRIPE_BILLING_PORTAL_CONFIGURATION`.

That existing workflow aligns the reviewed management metadata and verifies the selected default configuration in place.

## Provider proof

After the new Production deployment and Portal alignment, run **Production Provider Runtime Proof**.

The proof now loads the canonical Stripe Price IDs from the actual Vercel Production environment rather than trusting separate GitHub `STRIPE_PRICE_*` variables. It then verifies the Stripe provider objects, canonical webhook, Portal policy, provider environment presence, and exact current-main context without retaining secrets or customer data.

A provider-proof PASS is still not Billing/Product runtime PASS.

## First genuine LIVE lifecycle

Only after the provider proof is green may a legitimate production customer/user use the normal production checkout path.

Then prove, without fabricating data:

1. a real LIVE Checkout/subscription is created;
2. the canonical webhook receives a genuinely signed LIVE provider event and returns success;
3. `stripe_events_processed` persists a processed row with `livemode=true`;
4. organization ↔ Stripe customer ↔ Stripe subscription correlation is exact;
5. subscription persistence and server-authoritative entitlement activation are correct;
6. duplicate/replay suppression works;
7. invoice paid/failure reconciliation is correct;
8. upgrade, scheduled downgrade, cancel, cancellation, reactivate and fail-closed delinquency behavior are retained as exact-SHA evidence;
9. **Final Billing + Product Live Closeout** passes with genuine `organization_id`, `sub_*`, and `evt_*` evidence.

Only after that chain can `BILLING_PRODUCT_EU_AI_ACT: PASS` be considered.

## Rollback / old account

Do not delete or irreversibly clean up the old Stripe account during provider cutover. Preserve it until:

- the new provider proof is green;
- Vercel Production is proven to use only the new account bindings;
- no application or rollback environment still references old `price_*`, `prod_*`, `we_*`, `bpc_*`, `whsec_*`, or secret values;
- the first legitimate new-account LIVE lifecycle is accepted.

Legacy provider objects are historical evidence, not production authority.
