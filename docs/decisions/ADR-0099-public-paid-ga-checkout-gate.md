# ADR-0099: Fail closed public paid checkout until paid GA acceptance

- Status: Accepted
- Date: 2026-09-09
- Owners: Billing Engineering / Release Engineering / Security Engineering
- Scope: initial self-serve paid Checkout, release preflight, customer-facing billing failure semantics

## Context

RISCK COMPLY has a technically connected LIVE Stripe account, canonical recurring prices, signed-webhook handling, subscription authority and billing lifecycle code. Those implementation facts do not by themselves prove that public paid general availability is safe to enable.

Terminal paid-customer acceptance still depends on release facts that must not be fabricated or inferred, including the seller's attributable Portuguese VAT treatment, the applicable Stripe tax registration/tax configuration, exact-SHA Production convergence and a legitimate LIVE billing lifecycle when that evidence is required.

Before this decision, an authenticated organization with billing permission could enter initial self-serve Checkout whenever the route and Stripe bindings were available. That creates an operational risk: a technically valid Checkout Session could be created before the commercial/tax release gates have received terminal evidence.

## Decision

Initial public self-serve paid Checkout is fail-closed by default.

The server-side checkout route may create an initial subscription Checkout Session only when one of these conditions is true:

1. `RISCK_COMPLY_PAID_BILLING_REQUIRED` is exactly the raw string `true`; or
2. `RISCK_COMPLY_BILLING_VALIDATION_ORGANIZATION_ID` exactly matches the current authenticated organization ID for a bounded validation transaction explicitly authorized by the owner.

The paid-GA flag intentionally uses the same exact boolean semantics as `scripts/preflight.mjs`. Values such as `TRUE`, ` true `, `1`, `yes` or any other non-canonical value remain disabled. Runtime must never be more permissive than release preflight.

The validation organization override is server-only, organization-bound and does not grant commercial authority. It only permits that exact organization to reach initial Checkout while public GA remains disabled. Existing subscription authority, signed webhook processing and entitlement rules continue to decide whether paid access exists.

## Existing-customer lifecycle

The public-GA gate applies only to **initial** self-serve Checkout. It must not strand a legitimate existing subscriber.

An organization with authoritative LIVE subscription relationship may continue to use the governed lifecycle paths for the same billing relationship, including supported plan changes and Billing Portal operations, subject to existing RBAC, step-up, trusted-mutation and provider controls.

Seeded, compatibility, test-mode or otherwise non-authoritative subscription rows do not bypass this rule.

## Customer-facing failure semantics

When initial Checkout is denied because public paid GA is not enabled, the API returns:

`503 { "error": "public_paid_ga_not_enabled" }`

The client must treat this as a commercial-availability state, not as an authentication, workspace or permission failure. It must present accurate localized unavailable/contact-sales guidance and route the prospect to the sales contact path. Other checkout failures retain the ordinary billing error path.

## Enablement authority

Public paid GA may be enabled only after the release owner verifies the evidence-backed paid-customer acceptance package. At minimum the package must not have an open contradiction on:

- seller/VAT regime facts and required tax configuration;
- canonical LIVE Stripe catalog and signed webhook binding;
- exact-SHA Production binding for the reviewed release;
- subscription/entitlement authority and plan isolation;
- checkout tax behavior;
- lifecycle acceptance required by the release scorecard;
- customer-facing legal/commercial claims.

Enabling the environment flag is an operational release action, not evidence that these conditions are true. The evidence must exist first.

## Validation override authority

`RISCK_COMPLY_BILLING_VALIDATION_ORGANIZATION_ID` is not a public-launch switch. It exists only for a bounded owner-authorized validation involving the exact organization named in the server-side value.

Do not populate it with arbitrary customer organizations, wildcard values, client-provided identifiers or seeded compatibility tenants. Remove it after the bounded validation no longer requires it.

No test or evidence run may create a fake LIVE payment, customer, subscription, invoice, tax registration or tax identity merely to obtain a PASS.

## Security and tenancy impact

- The gate is enforced server-side after authenticated organization and billing-permission resolution.
- Client state cannot enable it.
- The validation override is compared only with the server-resolved current organization ID.
- The gate does not weaken RLS, tenant isolation, webhook signature verification, idempotency, subscription authority, step-up or payment-first controls.
- The default and malformed-configuration behavior is fail-closed.

## Rollout

1. Keep `RISCK_COMPLY_PAID_BILLING_REQUIRED=false` or absent while paid GA is not accepted.
2. Complete internal implementation and exact-SHA release evidence.
3. Obtain attributable VAT/tax facts and configure the provider accordingly.
4. Complete any legitimate LIVE lifecycle evidence required by the release contract without synthetic payment evidence.
5. Enable the canonical value `true` only through the governed Production configuration/deployment path.
6. Re-run release preflight and post-deploy billing/runtime acceptance on the same release SHA.

## Rollback

If paid GA must be stopped, set the governed Production value back to `false` or remove it and redeploy/reconcile through the normal protected Production path. New initial Checkout then fails closed while existing authoritative subscriber lifecycle remains available.

Do not use malformed strings as an informal rollback mechanism. Do not disable webhook processing, delete subscriptions, revoke entitlements or mutate customer data to stop new sales.

## Evidence boundary

This ADR records release policy and authority only. It does not claim:

- Portuguese VAT registration or tax treatment;
- legal or accounting approval;
- a completed LIVE customer transaction;
- exact-SHA Production deployment;
- qualified legal assurance;
- independent pentest or retest.

Those remain separate evidence gates and must be credited only from attributable evidence.
