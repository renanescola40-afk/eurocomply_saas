# ADR-0095 — Global commercial access boundary

- Status: Accepted
- Date: 2026-08-18
- Owners: Application Security / Billing Engineering / Product Platform

## Context

RISCK COMPLY historically enforced durable billing authority in the `/[locale]/dashboard/**` layout, while several authenticated product surfaces remained at legacy top-level routes such as `/[locale]/ai-systems`, `/[locale]/ai-incidents`, `/[locale]/security-center`, `/[locale]/audit-pack` and `/[locale]/settings/organization`.

Those pages could validate authentication, organization membership or RBAC without independently proving that the organization held a durable commercial license. Because authentication and commercial authorization are different controls, the split route tree created a revenue-protection and broken-access-control boundary defect.

The canonical billing resolver already distinguishes display plan labels from durable authority. A local subscription row, browser return, role, query parameter or test-mode identifier cannot set `licensed=true`; paid self-serve authority requires processed live Stripe subscription evidence, while approved enterprise authority may come from the signed-contract entitlement plane.

## Decision

1. Every localized route is classified by one fail-closed commercial route policy.
2. The only non-licensed classes are explicit:
   - public marketing/auth surfaces;
   - authenticated account bootstrap surfaces such as onboarding/profile/invite;
   - billing recovery and checkout activation surfaces;
   - privileged internal control-plane routes that maintain their own elevated authorization.
3. Any route not explicitly classified above defaults to `licensed_product`.
4. The shared locale server layout enforces the commercial boundary before paid product page content executes.
5. The commercial resolver composes, in order:
   - authenticated user;
   - current organization membership;
   - canonical organization billing authority;
   - `authority.licensed === true`.
6. Billing/provider/database resolution failures fail closed and never become a free tier.
7. The dashboard nested layout reuses the same request-cached resolver for defense in depth and shell plan rendering.
8. Billing recovery routes stay reachable without an active license so an authenticated customer can purchase, confirm, retry or repair billing.

RBAC, feature entitlements, plan floors and tenant/resource authorization remain additional independent controls. A valid commercial license does not override them.

## Security invariants

- Login is not a license.
- Membership is not a license.
- Owner/admin/member role is not a license.
- A local `subscriptions` record is not sufficient authority.
- Checkout `success_url`, query parameters, cookies and local storage cannot grant paid access.
- Unknown future private routes default to licensed access rather than silently bypassing the paywall.
- Missing trusted pathname context is treated as licensed, not public.
- Checkout activation can wait for signed Stripe webhook processing without pre-granting product access.

## Explicit recovery/control-plane exceptions

Current exceptions include:

- `/onboarding`
- `/profile`
- `/invite/**`
- `/billing`
- `/checkout/complete/**`
- `/dashboard/billing/**`
- `/dashboard/organizations/billing/**`
- `/admin/**`
- `/platform/**`

Adding a new exception is a security-sensitive architecture change and must include regression coverage explaining why the route must function without a customer product license.

## Consequences

### Positive

- Legacy top-level product routes can no longer bypass the paid dashboard boundary.
- New localized private routes are protected by default.
- Nested layouts share one request-level commercial authority resolution.
- Billing recovery remains operable for unpaid or payment-problem states.
- Commercial authorization remains server-authoritative and independent from client presentation.

### Trade-off

The shared locale layout reads the trusted request pathname to apply the boundary across both the canonical dashboard tree and legacy product routes. This intentionally favors a complete fail-closed boundary while legacy top-level routes still exist. A later route-group consolidation may recover more static rendering opportunities without weakening this invariant.

## Follow-up boundary

This ADR closes the page/render boundary. Direct APIs, server actions, service-role mutations, tenant isolation and lifecycle edge cases remain independently subject to their own authorization controls and should continue to be audited as a separate Mega PR cluster.

## Rollback

Revert the commits from PR #1721 that add the commercial route policy, canonical page access resolver and locale/dashboard layout enforcement. The rollback requires no database migration, Stripe mutation, Supabase schema change, secret rotation or provider-side operation. If rolled back, the historical top-level paid-route bypass returns, so rollback is an emergency availability action only and must be accompanied by an application-level maintenance restriction until a corrected commercial boundary is redeployed.
