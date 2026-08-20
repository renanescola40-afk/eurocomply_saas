# Stripe LIVE Account Authority Migration

Status: Accepted for controlled cutover; runtime Billing PASS remains open.

Date: 2026-08-20

## Context

RISCK COMPLY is moving production Stripe billing authority to the reviewed LIVE account `acct_1U6IuJGt3cgjPOtq` (`RISCK COMPLY SAAS`). The repository already treats Stripe billing as a provider-backed commercial authority: application authentication, organization membership, local subscription rows, checkout return URLs, and UI state do not independently grant paid entitlement.

The migration must preserve the current commercial contract:

- Essential: EUR 49/month and EUR 490/year;
- Professional: EUR 149/month and EUR 1,490/year;
- Business: sales-led, not self-serve;
- the canonical production webhook remains `https://www.risckcomply.com/api/stripe/webhook`;
- the account-default Customer Portal remains the selected Portal authority;
- canonical lookup keys and plan metadata remain versioned/reviewed.

At the time of the authority switch there was no accepted processed LIVE Stripe lifecycle evidence in the production ledger that could be treated as a migrated active commercial entitlement. No synthetic customer, subscription, invoice, Checkout Session, PaymentIntent, charge, payment, or event may be created merely to manufacture evidence.

## Decision

Production Stripe provider operations are bound to `config/stripe-live-account-authority.json`. A protected bootstrap may proceed only when the supplied LIVE credential resolves to the exact reviewed account and the account/provider prerequisites pass.

The protected bootstrap is intentionally split from genuine customer activity. It may create or reuse reviewed Products and recurring Prices, align the event set of the pre-existing canonical webhook, and write provider bindings to the reviewed Vercel Production project. It may not create commercial lifecycle activity for evidence.

The bootstrap must fail closed when any of the following is true:

1. the Stripe credential does not resolve to the reviewed account;
2. the account cannot accept LIVE charges or required account details are incomplete;
3. the canonical LIVE webhook is missing or ambiguous;
4. the current remote `main` no longer equals the operator-supplied reviewed release SHA immediately before provider mutation;
5. the Vercel project/team/name runtime target differs from the versioned provider target;
6. canonical Price bindings are ambiguous or are stored as `sensitive`, because provider proof must be able to re-read the non-secret `price_*` IDs;
7. an existing `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` Vercel Production binding is not already of type `sensitive`. In that case the binding must be manually recreated as sensitive before bootstrap instead of silently preserving a re-readable secret type.

## Security posture

Stripe secret values and webhook signing secrets are never written to repository files, logs, summaries, or retained evidence artifacts. Price IDs are non-secret provider identifiers and may remain re-readable so the Production Provider Runtime Proof validates the exact values used by the deployed application.

GitHub Environment `Production` remains the protected operator boundary for LIVE credentials. Vercel Production is the runtime source of truth for Stripe Price bindings. The provider proof reads Vercel's actual Production bindings rather than trusting parallel GitHub Price variables.

The canonical webhook signing secret is stored directly in protected provider secret stores. The bootstrap does not create a webhook endpoint because a newly generated `whsec_*` would require an approved secret-write channel; the endpoint and signing secret must already be provisioned through the controlled operator path.

## Compatibility

The application contract remains compatible with the existing Essential, Professional, Business sales-led, webhook, Portal, entitlement, and lifecycle code paths. Legacy Stripe provider objects are not automatically deleted or treated as authority for the new account. Compatibility aliases used by broader provider probes may be derived from canonical Vercel bindings, but legacy repository variables do not become commercial authority.

Business remains sales-led. This migration does not convert Business or Enterprise into self-serve checkout products.

## Cutover

The controlled cutover order is:

1. complete truthful Stripe LIVE account onboarding/verification;
2. place the new LIVE Stripe secret in the protected GitHub Production environment;
3. create exactly one canonical LIVE webhook and store its signing secret in the protected environment;
4. run the exact-main-bound Stripe Live Account Bootstrap;
5. redeploy the exact current `main` so Vercel environment changes reach runtime;
6. configure/save the account-default LIVE Customer Portal and run the reviewed Portal bootstrap;
7. run Production Provider Runtime Proof;
8. only after provider readiness, allow a legitimate production customer/user to use the normal checkout flow;
9. collect real signed LIVE webhook, Supabase ledger, entitlement, invoice, cancellation/reactivation, and idempotency evidence;
10. run the final Billing/Product live closeout.

## Rollback

The previous Stripe account and historical provider objects are retained during cutover validation. Do not archive or delete legacy active Prices merely because the new catalog exists. Rollback dependencies must first be disproven, including Vercel bindings, payment links, deployment/runtime configuration, and any genuine customer subscription dependency.

If provider bootstrap or runtime proof fails, commercial authority remains fail-closed. Revert Vercel bindings to the last reviewed provider set only through the controlled provider process; do not create a synthetic subscription to force an entitlement state.

## Consequences

This decision improves provider authority traceability and reduces drift between CI evidence and the actual Vercel Production runtime. It also deliberately introduces a hard operational stop when a Stripe secret is stored in Vercel with a non-sensitive type: the operator must correct the secret storage type before cutover can continue.

A successful bootstrap or provider proof does not prove that a real customer lifecycle works. `BILLING_PRODUCT_EU_AI_ACT: PASS` remains prohibited until genuine LIVE lifecycle evidence exists and correlates Stripe provider events, the production ledger, organization subscription state, and server-authoritative entitlement behavior.
