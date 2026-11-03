# ADR-0100: Fail-closed Stripe Price authority and hosted Checkout reuse

- **Status:** Proposed — pending qualified review and exact-head CI
- **Date:** 2026-11-03
- **Owner:** NORMAL 2 billing workstream
- **Scope:** initial Essential/Professional Checkout and self-serve subscription lifecycle
- **Source PR:** https://github.com/renanescola40-afk/eurocomply_saas/pull/2597
- **Related work:** GitLab !2632, checkout lease/configuration failure handling (separate change requiring integration)

## Context and incident prevention

A configured Stripe `price_...` identifier is not enough to prove that a
subscription carries the reviewed commercial amount. The connected TEST account
contains an active €0/month Professional Price next to an active canonical
€149/month Professional Price. That is a configuration risk, **not** evidence
that the zero-price Price is selected by production.

Prior initial Checkout source validated plan ID but created or reused hosted
Checkout Sessions without checking the actual Price's canonical amount and
interval. Subscription upgrades and scheduled downgrades likewise used
configured Price IDs. An already-open Checkout Session could be reused by
metadata/legal version without validating the Session's own line items.

The provider also distinguishes TEST and LIVE. TEST may be used only for a
bounded validation-only checkout; a public paid Checkout must use LIVE.

## Decision

1. Validate the resolved Stripe Price with a read-only retrieval using an
   expanded Product **before** claiming a new initial Checkout lease.
2. For self-serve Essential/Professional, require the exact expected Price ID,
   active recurring Price, active Product, one licensed unit, per-unit billing,
   EUR, exact canonical integer amount in cents, and a one-month (or explicitly
   chosen one-year for lifecycle changes) cadence.
3. Require `getStripeEventModeFromSecretKey()` to match the purpose: TEST for
   validation-only Checkout, LIVE for customer-facing paid Checkout. Null,
   unknown and cross-mode values are rejected before Stripe API calls.
4. Before reusing an already-open Checkout Session, read the Stripe
   `line_items` with `limit: 2`. Require exactly one line item, no next page,
   canonical Price ID, and quantity one. Reject stale, paginated, missing or
   extra items.
5. An obsolete reused Session (stale legal or stale Price) must be confirmed
   `expired` by Stripe **before** releasing its durable checkout attempt.
   Provider failure or unconfirmed expiry blocks reuse and does not return a
   hosted URL. Best-effort compensation remains distinct from this strict
   reused-session condition.
6. For upgrade/downgrade and qualifying self-serve add-on amendments, validate
   the target base-plan Price before claiming the durable lifecycle request
   ledger or mutating Stripe. Cancellation and reactivation do not select a new
   Price and must remain available. Existing idempotent completed replay
   remains authoritative.
7. Business and Enterprise negotiated prices remain under contract authority;
   do not turn them into public catalogue subscriptions or assume a fixed fee.

## Rejected alternatives

- Trust only environment Price IDs: cannot detect €0, wrong currency, cadence,
  inactive product, or wrong mode.
- Validate only on fresh Checkout creation: allows an older, still-open Session
  to bypass the invariant.
- Ignore Stripe expiry errors and release the lease: can leave an obsolete
  hosted payment URL usable while allowing another attempt.
- Automatically disable or delete TEST prices: affects provider-side shared QA
  data and is outside this code-only risk-reduction scope.

## Consequences and trade-offs

- Each first-time Checkout now reads one Price from Stripe before claiming its
  lease; reusing a session additionally reads at most two line items.
  Subscription lifecycle modifications that target a self-serve plan also read
  its Price. This adds Stripe API round trips and fail-closed availability
  dependencies, in exchange for stronger billing integrity.
- If the provider cannot be read, checkout/plan mutation can return a safe
  failure instead of silently charging or granting an invalid plan.
- Only the public-facing failure category is exposed; never log Stripe secrets,
  private customer metadata or raw webhook bodies.
- Do not weaken origin checks, MFA step-up, server-side tenant RBAC, idempotency,
  audit, signed webhook verification or entitlement authority.

## Acceptance evidence / rollout

The tests covering the Price validator, annual/mode semantics, line-item
reuse and source ordering are local/regression evidence only. The official
A-10 (BIL-02/BIL-03) and A-11 (BIL-04/BIL-05) gates require separately:

- integration with GitLab !2632 without regressing lease release;
- Node 22 full repo typecheck, lint, unit suite, security checks and build;
- exact-head authorized no-new-cost CircleCI verification;
- signed Stripe TEST webhook processing and authenticated, isolated Supabase QA
  persisted Checkout/lifecycle/E2E evidence;
- qualified independent review and owner-governed merge;
- traceable evidence records accepted by the formal validator.

Historical A-09/BIL-01 source PASS is not promoted by this ADR. No production
writes, Stripe LIVE operations, new paid CI, emails or deploys are authorized
by this document. **Current acceptance: NOT_VERIFIED; NO_GO.**

## Rollback

Revert PR #2597 before a governed release; no schema migration and no provider
mutation are introduced by the patch. If an outage is traced to this safeguard,
investigate Stripe Price bindings and TEST/LIVE configuration before considering
a policy change. Do not bypass billing authority simply to make the route green.
